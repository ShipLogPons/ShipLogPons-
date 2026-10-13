import { createPublicClient, http, parseAbi, decodeFunctionResult } from 'viem';

export const RPC = process.env.RPC_URL || 'https://rpc.mainnet.chain.robinhood.com';
// A private RPC (RPC_URL) allows far more calls per second than the public one.
const DEFAULT_PAUSE = process.env.RPC_URL ? 60 : 400;
export const CHAIN = {
  id: 4663,
  name: 'Robinhood Chain',
  explorer: 'https://robinhoodchain.blockscout.com',
  dexscreenerId: 'robinhood',
};

export const PONS_URL = (token) => `https://ponsfamily.com/launchpad/${token}`;

// Pons launch factories, read straight from the chain. Sources: docs.ponsfamily.com
export const FACTORIES = [
  {
    address: '0x7eD598BcEf8bd9Edd8C97A195C6d13f40801EC7e',
    version: 'v2',
    topic: '0x8d4aad4953d0ca700d468f3753aa14432d1b35b43ec6409f051fb6aa43a89607',
    start: 26000000,
  },
  {
    address: '0xA5aAb3F0c6EeadF30Ef1D3Eb997108E976351feB',
    version: 'v1',
    topic: '0xdb51ea9ad51ab453a65a4cb7e60c3cb378c9501bb002609f8f97778fb6c4235a',
    start: 8991118,
  },
  {
    address: '0x0c37a24F5D23A486FA692d1500881d698B1F77a4',
    version: 'v1',
    topic: '0xdb51ea9ad51ab453a65a4cb7e60c3cb378c9501bb002609f8f97778fb6c4235a',
    start: 8600612,
  },
];

const chain = {
  id: CHAIN.id,
  name: CHAIN.name,
  nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
  rpcUrls: { default: { http: [RPC] } },
};

export const client = createPublicClient({
  chain,
  transport: http(RPC, { batch: { batchSize: 25, wait: 20 }, retryCount: 2, retryDelay: 600, timeout: 15000 }),
});

const TOKEN_ABI = parseAbi([
  'function name() view returns (string)',
  'function symbol() view returns (string)',
  'struct Socials { string twitter; string telegram; string discord; string website; string farcaster; }',
  'function getTokenInfo() view returns (address tokenDeployer, string tokenLogo, string tokenDescription, Socials tokenSocials)',
]);

const topicAddr = (t) => ('0x' + (t || '').slice(26)).toLowerCase();

export function parseLaunch(log, f) {
  const words = (log.data || '0x').slice(2).match(/.{64}/g) || [];
  return {
    token: topicAddr(log.topics[1]),
    curve: f.version === 'v2' ? topicAddr(log.topics[2]) : null,
    deployer: f.version === 'v2' ? topicAddr(log.topics[3]) : topicAddr(log.topics[2]),
    version: f.version,
    block: parseInt(log.blockNumber, 16),
    pair: f.version === 'v2' && words[0] ? '0x' + words[0].slice(24) : null,
  };
}

// eth_getLogs with an address filter allows up to 10M blocks and 10k results per call.
export async function getLaunchLogs(f, from, to) {
  return client.request({
    method: 'eth_getLogs',
    params: [{ address: f.address, topics: [f.topic], fromBlock: `0x${from.toString(16)}`, toBlock: `0x${to.toString(16)}` }],
  });
}

// Scans [from, to] in adaptive chunks. Returns launches found and the last block fully scanned.
export async function scanRange(f, from, to, { deadline, maxChunk = 5000000 } = {}) {
  const out = [];
  let size = maxChunk;
  let cur = from;
  let scannedTo = from - 1;
  while (cur <= to && !(deadline && deadline())) {
    const end = Math.min(to, cur + size - 1);
    try {
      const logs = await getLaunchLogs(f, cur, end);
      for (const l of logs) out.push(parseLaunch(l, f));
      scannedTo = end;
      cur = end + 1;
      if (logs.length < 3000 && size < maxChunk) size = Math.min(maxChunk, size * 2);
    } catch (e) {
      const msg = String(e?.details || e?.message || e);
      if (/exceed|limit|spans|too large|response size|block range|timeout|timed out/i.test(msg) && size > 2000) {
        size = Math.floor(size / 4);
        continue;
      }
      break;
    }
  }
  return { launches: out, scannedTo };
}

// Same as scanRange but walking backwards from `to` toward `from`.
export async function scanBackward(f, from, to, { deadline, maxChunk = 5000000, wantAtLeast = 1 } = {}) {
  const out = [];
  let size = maxChunk;
  let cur = to;
  let scannedFrom = to + 1;
  while (cur >= from && !(deadline && deadline()) && out.length < wantAtLeast) {
    const start = Math.max(from, cur - size + 1);
    try {
      const logs = await getLaunchLogs(f, start, cur);
      for (const l of logs) out.push(parseLaunch(l, f));
      scannedFrom = start;
      cur = start - 1;
      if (logs.length < 3000 && size < maxChunk) size = Math.min(maxChunk, size * 2);
    } catch (e) {
      const msg = String(e?.details || e?.message || e);
      if (/exceed|limit|spans|too large|response size|block range|timeout|timed out/i.test(msg) && size > 2000) {
        size = Math.floor(size / 4);
        continue;
      }
      break;
    }
  }
  return { launches: out, scannedFrom };
}

export function ipfsToHttp(uri) {
  if (!uri) return null;
  if (uri.startsWith('ipfs://')) return `https://ipfs.io/ipfs/${uri.slice(7).replace(/^ipfs\//, '')}`;
  if (/^https?:\/\//.test(uri)) return uri;
  return null;
}

const clean = (s, max) => (typeof s === 'string' ? s.replace(/\s+/g, ' ').trim().slice(0, max) : '');

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// One HTTP request carrying many JSON-RPC calls, with backoff when the public RPC rate-limits.
export async function rpcBatch(calls) {
  for (let attempt = 0; attempt < 4; attempt++) {
    try {
      const res = await fetch(RPC, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(calls.map((c, i) => ({ jsonrpc: '2.0', id: i, method: c.method, params: c.params }))),
        signal: AbortSignal.timeout(15000),
        cache: 'no-store',
      });
      if (res.status === 429) {
        await sleep(1500 * (attempt + 1));
        continue;
      }
      const j = await res.json();
      if (!Array.isArray(j)) {
        await sleep(800 * (attempt + 1));
        continue;
      }
      const out = new Array(calls.length).fill(null);
      for (const r of j) out[r.id] = r;
      if (out.some((r) => r?.error?.code === 429 || /rate|too many/i.test(r?.error?.message || ''))) {
        await sleep(1200 * (attempt + 1));
        continue;
      }
      return out;
    } catch {
      await sleep(600 * (attempt + 1));
    }
  }
  return null;
}

function decode(fn, r) {
  if (!r || r.error || !r.result || r.result === '0x') return null;
  try {
    return decodeFunctionResult({ abi: TOKEN_ABI, functionName: fn, data: r.result });
  } catch {
    return null;
  }
}

function toMeta(n, sym, info) {
  if (info == null && n == null) return { name: '', symbol: '', logo: null, description: '', socials: {}, ponsInfo: false };
  const s = info ? info[3] || {} : {};
  return {
    name: clean(n, 60),
    symbol: clean(sym, 24),
    logo: info ? ipfsToHttp(clean(info[1], 300)) : null,
    description: info ? clean(info[2], 400) : '',
    socials: {
      x: clean(s.twitter, 200),
      telegram: clean(s.telegram, 200),
      discord: clean(s.discord, 200),
      website: clean(s.website, 200),
      farcaster: clean(s.farcaster, 200),
    },
    ponsInfo: Boolean(info),
  };
}

// Token metadata from each token contract: name, symbol and Pons getTokenInfo().
// The public RPC allows roughly 100 calls a second, so batches go out one at a time with a short pause.
// With infoOnly, only getTokenInfo() is read (one call per token), which is enough to spot a GitHub link.
// Tokens the RPC could not answer for are left out of the map, so callers retry them later.
export async function readMetaMany(tokens, { deadline, infoOnly = false, pause = DEFAULT_PAUSE } = {}) {
  const out = new Map();
  const per = infoOnly ? 1 : 3;
  const chunk = Math.floor(30 / per);
  for (let i = 0; i < tokens.length && !(deadline && deadline()); i += chunk) {
    const part = tokens.slice(i, i + chunk);
    const calls = part.flatMap((t) =>
      infoOnly
        ? [{ method: 'eth_call', params: [{ to: t, data: '0xabb1dc44' }, 'latest'] }]
        : [
            { method: 'eth_call', params: [{ to: t, data: '0x06fdde03' }, 'latest'] },
            { method: 'eth_call', params: [{ to: t, data: '0x95d89b41' }, 'latest'] },
            { method: 'eth_call', params: [{ to: t, data: '0xabb1dc44' }, 'latest'] },
          ]
    );
    const res = await rpcBatch(calls);
    if (res) {
      part.forEach((t, k) => {
        if (infoOnly) out.set(t, toMeta(null, null, decode('getTokenInfo', res[k])));
        else {
          const [n, s, info] = res.slice(k * 3, k * 3 + 3);
          out.set(t, toMeta(decode('name', n), decode('symbol', s), decode('getTokenInfo', info)));
        }
      });
    }
    await sleep(pause);
  }
  return out;
}

export async function readTokenMeta(token) {
  const m = await readMetaMany([token], { pause: 0 });
  return m.get(token) || null;
}

// Launch phase on the V2 factory: 0 on curve, 1 swept, 2 pool created (graduated), 3 rescued.
export async function readPhase(token) {
  try {
    const data = '0x3cf28b5a' + token.slice(2).toLowerCase().padStart(64, '0');
    const res = await client.request({ method: 'eth_call', params: [{ to: FACTORIES[0].address, data }, 'latest'] });
    const words = res.slice(2).match(/.{64}/g) || [];
    if (!words.length || BigInt('0x' + words[0]) === 0n) return null;
    return Number(BigInt('0x' + words[10]));
  } catch {
    return null;
  }
}

export const PHASE = { 0: 'On curve', 1: 'Graduating', 2: 'Graduated', 3: 'Rescued' };

const GH_SKIP = new Set(['sponsors', 'orgs', 'features', 'login', 'settings', 'marketplace', 'topics', 'about', 'pricing', 'apps']);

// GitHub links a token publishes about itself, in its description or socials.
export function githubFromMeta(meta) {
  if (!meta) return [];
  const text = [meta.description, ...Object.values(meta.socials || {})].join(' ');
  const found = new Map();
  const re = /github\.com\/([A-Za-z0-9-]{1,39})(?:\/([A-Za-z0-9._-]{1,100}))?/gi;
  let m;
  while ((m = re.exec(text))) {
    const owner = m[1];
    if (GH_SKIP.has(owner.toLowerCase())) continue;
    const repo = m[2] ? m[2].replace(/\.git$/, '') : null;
    const key = `${owner}/${repo || ''}`.toLowerCase();
    if (!found.has(key)) found.set(key, { owner, repo });
  }
  return [...found.values()];
}

export async function blockTimestamp(n) {
  try {
    const b = await client.getBlock({ blockNumber: BigInt(n) });
    return Number(b.timestamp);
  } catch {
    return null;
  }
}

// Finds the TokenLaunched log for one token across all factories.
export async function findLaunch(token) {
  const t = token.toLowerCase();
  const topic1 = '0x' + t.slice(2).padStart(64, '0');
  const latest = Number(await client.getBlockNumber());
  for (const f of FACTORIES) {
    for (let to = latest; to >= f.start; to -= 10000000) {
      const from = Math.max(f.start, to - 9999999);
      try {
        const logs = await client.request({
          method: 'eth_getLogs',
          params: [{ address: f.address, topics: [f.topic, topic1], fromBlock: `0x${from.toString(16)}`, toBlock: `0x${to.toString(16)}` }],
        });
        if (logs.length) return parseLaunch(logs[0], f);
      } catch {
        /* keep looking */
      }
    }
  }
  return null;
}

const ZERO = '0x0000000000000000000000000000000000000000';
const word = (hex, i) => (hex || '0x').slice(2 + i * 64, 2 + (i + 1) * 64);

// Bonding-curve state for V2 launches: how much of the graduation target is raised.
// getLaunchedToken() gives curve, pair token, target and phase; the curve's balance gives what was raised.
export async function readCurves(tokens, { deadline } = {}) {
  const out = new Map();
  for (let i = 0; i < tokens.length && !(deadline && deadline()); i += 15) {
    const part = tokens.slice(i, i + 15);
    const res = await rpcBatch(
      part.map((t) => ({ method: 'eth_call', params: [{ to: FACTORIES[0].address, data: '0x3cf28b5a' + t.slice(2).toLowerCase().padStart(64, '0') }, 'latest'] }))
    );
    if (!res) continue;
    const info = [];
    part.forEach((t, k) => {
      const r = res[k]?.result;
      if (!r || r.length < 2 + 64 * 11 || BigInt('0x' + word(r, 0)) === 0n) return;
      info.push({
        token: t,
        curve: '0x' + word(r, 1).slice(24),
        pair: '0x' + word(r, 4).slice(24),
        target: BigInt('0x' + word(r, 5)),
        phase: Number(BigInt('0x' + word(r, 10))),
      });
    });
    const open = info.filter((x) => x.phase < 2);
    const bal = open.length
      ? await rpcBatch(
          open.map((x) =>
            x.pair === ZERO
              ? { method: 'eth_getBalance', params: [x.curve, 'latest'] }
              : { method: 'eth_call', params: [{ to: x.pair, data: '0x70a08231' + x.curve.slice(2).padStart(64, '0') }, 'latest'] }
          )
        )
      : [];
    open.forEach((x, k) => {
      const raw = bal?.[k]?.result;
      x.raised = raw ? BigInt(raw === '0x' ? '0x0' : raw) : null;
    });
    for (const x of info) {
      const progress =
        x.phase >= 2 ? 100 : x.raised != null && x.target > 0n ? Math.min(100, Number((x.raised * 1000n) / x.target) / 10) : null;
      out.set(x.token, { phase: x.phase, progress, pairIsEth: x.pair === ZERO, at: Date.now() });
    }
    await sleep(DEFAULT_PAUSE);
  }
  return out;
}

// Every Pons launch made by one deployer address, newest first.
export async function deployerLaunches(deployer) {
  const d = '0x' + deployer.toLowerCase().slice(2).padStart(64, '0');
  const latest = Number(await client.getBlockNumber());
  const found = [];
  let complete = true;
  for (const f of FACTORIES) {
    const topics = f.version === 'v2' ? [f.topic, null, null, d] : [f.topic, null, d];
    for (let to = latest; to >= f.start; to -= 10000000) {
      const from = Math.max(f.start, to - 9999999);
      try {
        const logs = await client.request({
          method: 'eth_getLogs',
          params: [{ address: f.address, topics, fromBlock: `0x${from.toString(16)}`, toBlock: `0x${to.toString(16)}` }],
        });
        for (const l of logs) found.push(parseLaunch(l, f));
      } catch {
        complete = false;
      }
    }
  }
  found.sort((a, b) => b.block - a.block);
  return { count: found.length, complete, launches: found.slice(0, 60) };
}
