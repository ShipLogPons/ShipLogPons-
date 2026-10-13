'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { createPublicClient, createWalletClient, custom, http, parseAbi, parseEther, formatEther, toHex, BaseError, ContractFunctionRevertedError } from 'viem';

const RPC = 'https://rpc.mainnet.chain.robinhood.com';
const EXPLORER = 'https://robinhoodchain.blockscout.com';
const CHAIN = {
  id: 4663,
  name: 'Robinhood Chain',
  nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
  rpcUrls: { default: { http: [RPC] } },
  blockExplorers: { default: { name: 'Blockscout', url: EXPLORER } },
};
const FACTORY = '0x7eD598BcEf8bd9Edd8C97A195C6d13f40801EC7e';
const ROUTER = '0xe33E9E479dF8802cb0866d5d05258bEc4cF62948';
const LAUNCH_TOPIC = '0x8d4aad4953d0ca700d468f3753aa14432d1b35b43ec6409f051fb6aa43a89607';
const ZERO = '0x0000000000000000000000000000000000000000';
const CONFIG_ID = 0n;

const STRUCTS = [
  'struct Socials { string twitter; string telegram; string discord; string website; string farcaster; }',
  'struct TokenParams { string name; string symbol; string logo; string description; Socials socials; address creatorFeeRecipient; uint16 creatorTaxBps; bool buybackEnabled; bytes32 expectedEconomics; bytes32 salt; }',
];
const FACTORY_ABI = parseAbi([
  ...STRUCTS,
  'function launchToken(TokenParams params, uint256 launchConfigId, address pairToken) payable returns (address token, address curve)',
  'function launchFee() view returns (uint256)',
  'function previewLaunchEconomics(uint256 launchConfigId, address pairToken) view returns (bytes32)',
  'function canLaunch(address) view returns (bool)',
]);
const ROUTER_ABI = parseAbi([
  ...STRUCTS,
  'function launchAndBuy(TokenParams params, uint256 launchConfigId, address pairToken, uint256 quoteIn, uint256 minTokensOut, address recipient, address[] snipeTaxExemptions) payable returns (address token, address curve, uint256 tokensOut)',
]);

const rpcClient = createPublicClient({ chain: CHAIN, transport: http(RPC) });
const short = (a) => `${a.slice(0, 6)}…${a.slice(-4)}`;
const REPO_RE = /^(?:https?:\/\/)?(?:www\.)?github\.com\/([A-Za-z0-9-]{1,39})\/([A-Za-z0-9._-]{1,100}?)(?:\.git)?\/?$/i;

function randomSalt() {
  const b = new Uint8Array(32);
  crypto.getRandomValues(b);
  return toHex(b);
}

function explain(err) {
  if (err instanceof BaseError) {
    const revert = err.walk((e) => e instanceof ContractFunctionRevertedError);
    if (revert) {
      const name = revert.data?.errorName || revert.reason || '';
      const known = {
        LaunchEconomicsMismatch: 'Pons changed its launch settings a moment ago. Press Launch again.',
        NotWhitelisted: 'Pons only allows whitelisted wallets to launch right now.',
        LaunchConfigDisabled: 'Pons has paused this launch type. Try again later.',
        CreatorTaxTooHigh: 'The creator tax is above what Pons allows.',
        LaunchFeeNotPaid: 'The launch fee did not match. Refresh the page and try again.',
        NativeValueMismatch: 'The amount sent did not match. Refresh the page and try again.',
      };
      if (known[name]) return known[name];
      if (name) return `Pons rejected the launch (${name}). Nothing was sent.`;
    }
    if (/User rejected|denied/i.test(err.message)) return 'You cancelled the transaction in your wallet. Nothing was sent.';
    if (/insufficient funds/i.test(err.message)) return 'This wallet does not have enough ETH on Robinhood Chain for the fee, the initial buy and gas.';
    return err.shortMessage || err.message;
  }
  return String(err?.message || err);
}

export default function LaunchForm() {
  const [account, setAccount] = useState(null);
  const [hasWallet, setHasWallet] = useState(true);
  const [fee, setFee] = useState(null);
  const [form, setForm] = useState({ name: '', symbol: '', description: '', repo: '', x: '', telegram: '', website: '', buy: '', tax: '0', buyback: false, agree: false });
  const [logo, setLogo] = useState(null);
  const [preview, setPreview] = useState(null);
  const [state, setState] = useState({ step: '', error: '', done: null });

  useEffect(() => {
    setHasWallet(typeof window !== 'undefined' && Boolean(window.ethereum));
    rpcClient.readContract({ address: FACTORY, abi: FACTORY_ABI, functionName: 'launchFee' }).then(setFee).catch(() => setFee(parseEther('0.0005')));
    const eth = typeof window !== 'undefined' ? window.ethereum : null;
    if (!eth) return;
    eth.request({ method: 'eth_accounts' }).then((a) => a?.[0] && setAccount(a[0])).catch(() => {});
    const onAcc = (a) => setAccount(a?.[0] || null);
    eth.on?.('accountsChanged', onAcc);
    return () => eth.removeListener?.('accountsChanged', onAcc);
  }, []);

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value });

  async function ensureChain() {
    const eth = window.ethereum;
    const id = toHex(CHAIN.id);
    try {
      await eth.request({ method: 'wallet_switchEthereumChain', params: [{ chainId: id }] });
    } catch (e) {
      if (e?.code === 4902 || /Unrecognized chain|not been added/i.test(e?.message || '')) {
        await eth.request({
          method: 'wallet_addEthereumChain',
          params: [{ chainId: id, chainName: CHAIN.name, nativeCurrency: CHAIN.nativeCurrency, rpcUrls: [RPC], blockExplorerUrls: [EXPLORER] }],
        });
      } else throw e;
    }
  }

  async function connect() {
    setState({ step: '', error: '', done: null });
    try {
      const [a] = await window.ethereum.request({ method: 'eth_requestAccounts' });
      await ensureChain();
      setAccount(a);
    } catch (e) {
      setState({ step: '', error: explain(e), done: null });
    }
  }

  function pickLogo(e) {
    const f = e.target.files?.[0];
    if (!f) return;
    if (f.size > 2 * 1024 * 1024) {
      setState({ step: '', error: 'The image is larger than 2 MB. Use a smaller one.', done: null });
      return;
    }
    setLogo(f);
    setPreview(URL.createObjectURL(f));
  }

  function validate() {
    const name = form.name.trim();
    const symbol = form.symbol.trim().replace(/^\$/, '').toUpperCase();
    if (!name || name.length > 32) return 'Give the token a name of up to 32 characters.';
    if (!/^[A-Z0-9]{1,10}$/.test(symbol)) return 'Use a ticker of 1 to 10 letters or numbers, like SHIP.';
    if (!REPO_RE.test(form.repo.trim())) return 'Add the GitHub repository you build in, like github.com/you/project.';
    const buy = form.buy.trim() ? Number(form.buy) : 0;
    if (!(buy >= 0) || buy > 4) return 'Keep the initial buy between 0 and 4 ETH.';
    const tax = Number(form.tax);
    if (!(tax >= 0 && tax <= 10)) return 'Creator tax must be between 0% and 10%.';
    if (!form.agree) return 'Tick the box to confirm you understand the risks.';
    return null;
  }

  async function launch(e) {
    e.preventDefault();
    const problem = validate();
    if (problem) return setState({ step: '', error: problem, done: null });
    try {
      await ensureChain();
      const [from] = await window.ethereum.request({ method: 'eth_requestAccounts' });
      setAccount(from);

      const pub = createPublicClient({ chain: CHAIN, transport: custom(window.ethereum) });
      let logoUrl = '';
      if (logo) {
        setState({ step: 'Uploading the logo…', error: '', done: null });
        const fd = new FormData();
        fd.append('file', logo);
        const r = await fetch('/api/launch-logo', { method: 'POST', body: fd });
        const j = await r.json().catch(() => ({}));
        if (!j.ok) throw new Error(j.error || 'The logo could not be uploaded. Try again.');
        logoUrl = j.url;
      }

      setState({ step: 'Reading the current Pons launch settings…', error: '', done: null });
      const m = form.repo.trim().match(REPO_RE);
      const repoUrl = `https://github.com/${m[1]}/${m[2]}`;
      const desc = [form.description.trim().slice(0, 300), `Building in public: ${repoUrl}`].filter(Boolean).join('\n\n');
      const xHandle = form.x.trim().replace(/^@/, '').replace(/^https?:\/\/(www\.)?(x|twitter)\.com\//i, '').split(/[/?#]/)[0];
      const tg = form.telegram.trim().replace(/^@/, '').replace(/^https?:\/\/t\.me\//i, '').split(/[/?#]/)[0];
      let site = form.website.trim();
      if (site && !/^https?:\/\//i.test(site)) site = `https://${site}`;

      const [launchFee, economics] = await Promise.all([
        pub.readContract({ address: FACTORY, abi: FACTORY_ABI, functionName: 'launchFee' }),
        pub.readContract({ address: FACTORY, abi: FACTORY_ABI, functionName: 'previewLaunchEconomics', args: [CONFIG_ID, ZERO] }),
      ]);
      const params = {
        name: form.name.trim(),
        symbol: form.symbol.trim().replace(/^\$/, '').toUpperCase(),
        logo: logoUrl,
        description: desc,
        socials: {
          twitter: xHandle ? `https://x.com/${xHandle}` : '',
          telegram: tg ? `https://t.me/${tg}` : '',
          discord: '',
          website: site,
          farcaster: '',
        },
        creatorFeeRecipient: from,
        creatorTaxBps: Math.round(Number(form.tax) * 100),
        buybackEnabled: Boolean(form.buyback),
        expectedEconomics: economics,
        salt: randomSalt(),
      };
      const buy = form.buy.trim() ? parseEther(String(Number(form.buy))) : 0n;
      const wallet = createWalletClient({ account: from, chain: CHAIN, transport: custom(window.ethereum) });

      setState({ step: 'Checking the launch with Pons before you sign…', error: '', done: null });
      const req =
        buy > 0n
          ? (await pub.simulateContract({ account: from, address: ROUTER, abi: ROUTER_ABI, functionName: 'launchAndBuy', args: [params, CONFIG_ID, ZERO, buy, 0n, from, []], value: launchFee + buy })).request
          : (await pub.simulateContract({ account: from, address: FACTORY, abi: FACTORY_ABI, functionName: 'launchToken', args: [params, CONFIG_ID, ZERO], value: launchFee })).request;

      setState({ step: 'Confirm the transaction in your wallet…', error: '', done: null });
      const hash = await wallet.writeContract(req);

      setState({ step: 'Launching on Robinhood Chain…', error: '', done: null });
      const receipt = await pub.waitForTransactionReceipt({ hash, timeout: 120000 });
      if (receipt.status !== 'success') throw new Error('The launch transaction failed on chain. Your launch fee was not spent; only gas was.');
      const log = receipt.logs.find((l) => l.address.toLowerCase() === FACTORY.toLowerCase() && l.topics[0] === LAUNCH_TOPIC);
      const token = log ? `0x${log.topics[1].slice(26)}` : null;
      setState({ step: '', error: '', done: { hash, token, repo: `${m[1]}/${m[2]}` } });
    } catch (err) {
      setState({ step: '', error: explain(err), done: null });
    }
  }

  const buyEth = form.buy.trim() && Number(form.buy) > 0 ? Number(form.buy) : 0;
  const feeEth = fee != null ? Number(formatEther(fee)) : 0.0005;
  const busy = Boolean(state.step);

  if (state.done) {
    const { hash, token, repo } = state.done;
    return (
      <div className="ln-card">
        <div className="alert ok ln-done" role="status" style={{ marginTop: 0 }}>
          <strong>Your token is live on Pons.</strong>
          <ul>
            {token && <li>Token: <a href={`https://ponsfamily.com/launchpad/${token}`} target="_blank" rel="noopener noreferrer">{short(token)} on Pons</a></li>}
            <li>Transaction: <a href={`${EXPLORER}/tx/${hash}`} target="_blank" rel="noopener noreferrer">{short(hash)}</a></li>
            {token && <li>Shiplog picks it up within a few minutes: <Link href={`/scan?address=${token}`}>scan it here</Link>.</li>}
            {token && (
              <li>
                For the verified tick, add <code>{token}</code> to the README of github.com/{repo}, then <Link href="/submit">submit the repository</Link>.
              </li>
            )}
          </ul>
        </div>
      </div>
    );
  }

  return (
    <div className="ln-card">
      <div className="ln-wallet">
        {account ? (
          <span>Wallet <code>{short(account)}</code> on Robinhood Chain</span>
        ) : hasWallet ? (
          <>
            <span className="muted">Connect a wallet to launch.</span>
            <button type="button" className="btn" onClick={connect}>Connect wallet</button>
          </>
        ) : (
          <span className="muted">
            No wallet found in this browser. Open this page inside your wallet app (MetaMask, Rabby or Coinbase Wallet), or{' '}
            <a href="https://metamask.app.link/dapp/shiplogpons.xyz/launch">open it in MetaMask</a>.
          </span>
        )}
      </div>

      <form className="form" onSubmit={launch}>
        <div className="ln-row">
          <div className="field">
            <label htmlFor="ln-name">Token name</label>
            <input id="ln-name" value={form.name} onChange={set('name')} maxLength={32} placeholder="Shiplog" autoComplete="off" required />
          </div>
          <div className="field">
            <label htmlFor="ln-sym">Ticker</label>
            <input id="ln-sym" value={form.symbol} onChange={set('symbol')} maxLength={11} placeholder="SHIP" autoComplete="off" required style={{ textTransform: 'uppercase' }} />
          </div>
        </div>

        <div className="field">
          <label htmlFor="ln-repo">GitHub repository</label>
          <input id="ln-repo" value={form.repo} onChange={set('repo')} placeholder="github.com/you/project" autoComplete="off" spellCheck={false} required />
          <span className="help">Required. It is written into the token on chain, so Shiplog can track your work from launch.</span>
        </div>

        <div className="field">
          <label htmlFor="ln-logo">Logo (optional)</label>
          <div className="ln-logo">
            <span className="pv">{preview ? <img src={preview} alt="" /> : 'No logo'}</span>
            <input id="ln-logo" type="file" accept="image/png,image/jpeg,image/webp,image/gif" onChange={pickLogo} />
          </div>
          <span className="help">Square PNG, JPG, WebP or GIF, up to 2 MB.</span>
        </div>

        <div className="field">
          <label htmlFor="ln-desc">Description (optional)</label>
          <textarea id="ln-desc" value={form.description} onChange={set('description')} rows={3} maxLength={300} placeholder="What you are building, in a sentence or two" />
        </div>

        <div className="ln-row">
          <div className="field">
            <label htmlFor="ln-x">X handle (optional)</label>
            <input id="ln-x" value={form.x} onChange={set('x')} placeholder="@yourproject" autoComplete="off" />
          </div>
          <div className="field">
            <label htmlFor="ln-tg">Telegram (optional)</label>
            <input id="ln-tg" value={form.telegram} onChange={set('telegram')} placeholder="@yourgroup" autoComplete="off" />
          </div>
        </div>
        <div className="field">
          <label htmlFor="ln-web">Website (optional)</label>
          <input id="ln-web" value={form.website} onChange={set('website')} placeholder="yourproject.xyz" autoComplete="off" />
        </div>

        <div className="ln-row">
          <div className="field">
            <label htmlFor="ln-buy">Initial buy in ETH (optional)</label>
            <input id="ln-buy" type="number" min="0" max="4" step="0.001" value={form.buy} onChange={set('buy')} placeholder="0" />
            <span className="help">Bought in the same transaction as the launch, before anyone else can buy.</span>
          </div>
          <div className="field">
            <label htmlFor="ln-tax">Creator tax</label>
            <select id="ln-tax" value={form.tax} onChange={set('tax')}>
              {['0', '0.5', '1', '2', '3', '5', '10'].map((v) => (
                <option key={v} value={v}>{v === '0' ? 'None' : `${v}% per trade`}</option>
              ))}
            </select>
            <span className="help">Paid to your wallet on every trade.</span>
          </div>
        </div>

        <label className="ln-check">
          <input type="checkbox" checked={form.buyback} onChange={set('buyback')} />
          <span>Turn on buybacks: part of the trading fees buys back the token and locks it, released over five years.</span>
        </label>

        <div className="ln-sum" aria-live="polite">
          <div><span>Pons launch fee</span><span>{feeEth} ETH</span></div>
          {buyEth > 0 && <div><span>Initial buy</span><span>{buyEth} ETH</span></div>}
          <div><span>You send, plus gas</span><span>{+(feeEth + buyEth).toFixed(6)} ETH</span></div>
        </div>

        <label className="ln-check">
          <input type="checkbox" checked={form.agree} onChange={set('agree')} />
          <span>I understand that I launch this token myself, that Pons v2 is unaudited, and that Shiplog does not endorse or guarantee it.</span>
        </label>

        <div>
          <button className="btn" type="submit" disabled={busy || (!account && !hasWallet)}>
            {busy ? state.step : account ? 'Launch on Pons' : 'Connect wallet and launch'}
          </button>
        </div>
        {state.error && <p className="alert" role="alert">{state.error}</p>}
      </form>
    </div>
  );
}
