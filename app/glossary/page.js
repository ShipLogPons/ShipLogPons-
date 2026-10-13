import Link from 'next/link';
import '../pages.css';
import { STATUS } from '@/lib/score';
import { SIGNAL_LABEL } from '@/components/SignalList';

export const metadata = { title: 'Glossary' };

const TERMS = [
  ['Pons', 'A token launchpad on Robinhood Chain. Anyone can launch a token, which starts on a bonding curve.'],
  ['Robinhood Chain', 'The blockchain Pons runs on, chain ID 4663. Shiplog reads it directly through its public RPC.'],
  ['Bonding curve', 'The first stage of a Pons token. The price rises as people buy, until a set amount is raised.'],
  ['Graduation', 'The moment the bonding curve fills. The token then trades in a DEX pool instead of on the curve.'],
  ['Builder', 'A Pons token with a GitHub repository linked in its on-chain metadata, or submitted and verified on Shiplog.'],
  ['Verified', 'The repository README contains the token contract address, which proves the builder controls both. Shown with a tick.'],
  ['Ship', 'A piece of real, finished work: a GitHub release, a week with real code commits, or a new contract from the builder wallet.'],
  ['Real commit', 'A code change that is not a merge, a bot, a dependency bump, a typo fix, formatting, or a docs-only edit.'],
  ['Release', 'A tagged version published on GitHub. Several releases from one repository on the same day count once.'],
  ['Major release', 'A release that raises the first number of the version, like v1.0.0 or v2.0.0.'],
  ['Contract ship', 'A new smart contract on Robinhood Chain whose first owner is the builder deploy wallet. The Pons launch itself does not count.'],
  ['Build momentum', 'A score from 0 to 100 made of recency, consistency, size and spread of ships. Price is never part of it.'],
  ['Builders of the week', 'A ranking of real work over the last 7 days: one point per real commit, five per release.'],
  ['Deployer, or dev wallet', 'The wallet that launched the token on Pons. Shiplog follows what it held at its peak and what it holds now.'],
  ['Circulating supply', 'All tokens except those on the bonding curve, in the DEX pool, or burned.'],
  ['Top 10 concentration', 'The share of circulating supply held by the 10 largest wallets.'],
  ['Liquidity', 'The dollar value in the token DEX pool, from DexScreener. It decides how much can be sold without moving the price a lot.'],
  ['FDV', 'Fully diluted value: price times total supply. A market number, shown as context only.'],
  ['Copycat', 'A different Pons token that links the same GitHub repository as an earlier one.'],
  ['Signal', 'A measured change, like a graduation or a deployer selling. A fact Shiplog observed, not a prediction.'],
];

export default function Glossary() {
  const sorted = [...TERMS].sort((a, b) => a[0].localeCompare(b[0]));
  return (
    <section>
      <div className="wrap prose">
        <h1 className="page-title">Glossary</h1>
        <p className="lede">The words Shiplog uses, in plain terms. The full rules are on <Link href="/method">How Shiplog works</Link>.</p>

        <h2>Terms</h2>
        <dl className="gloss">
          {sorted.map(([t, d]) => (
            <div key={t} id={t.toLowerCase().replace(/[^a-z0-9]+/g, '-')}>
              <dt>{t}</dt>
              <dd>{d}</dd>
            </div>
          ))}
        </dl>

        <h2>Status flags</h2>
        <dl className="gloss">
          {Object.values(STATUS).map((v) => (
            <div key={v.label}>
              <dt>{v.label}</dt>
              <dd>{v.note}</dd>
            </div>
          ))}
        </dl>

        <h2>Signals</h2>
        <dl className="gloss">
          {Object.values(SIGNAL_LABEL).map((v) => (
            <div key={v.label}>
              <dt>{v.label}</dt>
              <dd>{v.note}</dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}
