import Link from 'next/link';
import Flag from '@/components/Flag';
import { STATUS } from '@/lib/score';
import { FACTORIES } from '@/lib/pons';

export const metadata = { title: 'How it works' };

export default function Method() {
  return (
    <section>
      <div className="wrap prose">
        <h1 className="page-title">How Shiplog works</h1>
        <p className="lede">
          Every rule is mechanical. The same evidence always gives the same result, and price never enters any of it.
        </p>

        <h2>Where the data comes from</h2>
        <ul>
          <li>
            <strong>Launches:</strong> the <code>TokenLaunched</code> events of the Pons factory contracts on Robinhood Chain
            (chain 4663), read directly from the public RPC. Factories read: {FACTORIES.map((f) => `${f.version.toUpperCase()} ${f.address.slice(0, 10)}…`).join(', ')}.
          </li>
          <li>
            <strong>Token details:</strong> each token’s own <code>getTokenInfo()</code> on chain: description, logo, X,
            Telegram, Discord, website and Farcaster. Graduation comes from the factory’s <code>getLaunchedToken()</code>.
          </li>
          <li>
            <strong>Builders:</strong> a token becomes a builder when its on-chain metadata links a GitHub repository, or
            when a builder submits a repo whose README contains the token address.
          </li>
          <li>
            <strong>Market:</strong> price and liquidity from DexScreener, shown as context only.
          </li>
        </ul>
        <p>
          New launches are read every few minutes. Older Pons history is read backwards in the background until every
          launch has been checked once for a GitHub link.
        </p>

        <h2>What counts as a ship</h2>
        <p>
          A <strong>GitHub release</strong> is a ship. Several releases from one repository on the same UTC day count once,
          and a major version counts more than a patch.
        </p>
        <p>
          A <strong>week of real code work</strong> is a ship. Merge commits, bot accounts, dependency bumps, typo fixes,
          formatting, and docs-only or README-only changes are dropped. A week with at least one real commit becomes one
          entry, however many commits it had, so commit volume cannot inflate a project.
        </p>
        <p>
          A <strong>new contract</strong> on Robinhood Chain is a ship when the builder's deploy wallet is named as its first
          owner. A Pons launch itself does not count.
        </p>
        <p>Announcements, posts, hype and trading are never ships.</p>

        <h2>Status flags</h2>
        <dl className="facts" style={{ maxWidth: 680 }}>
          {Object.entries(STATUS).map(([k, v]) => (
            <div key={k} style={{ display: 'contents' }}>
              <dt><Flag status={k} withLabel /></dt>
              <dd style={{ textAlign: 'left' }}>{v.note}</dd>
            </div>
          ))}
        </dl>

        <h2>Build momentum, 0 to 100</h2>
        <ul>
          <li><strong>40</strong> for recency: full marks for a ship today, fading over about two weeks.</li>
          <li><strong>30</strong> for consistency: share of the last 8 weeks with at least one ship.</li>
          <li><strong>20</strong> for size: weighted ships in the last 30 days (major release 9, release 6, busy code week 4, code week 3), capped.</li>
          <li><strong>10</strong> for spread: more than one active repository, or both releases and code work.</li>
        </ul>

        <h2>Verification</h2>
        <p>
          A builder proves a repository belongs to a token by putting the token’s contract address in the repository’s
          README, then <Link href="/submit">submitting it</Link>. A repository only linked from token metadata is shown,
          but without the verified tick, because anyone can type a link into a token description.
        </p>

        <h2>Dev wallet and holders</h2>
        <p>
          For each builder token, Shiplog reads every Transfer event of the token from the chain and rebuilds who holds
          what. The deployer wallet is followed from launch: how much it ever held, how much it holds now, how much went
          to the Pons curve, the DEX pool or other contracts (counted as sold), and how much went to other wallets.
          When a deployer sells more than half of its peak holding, a <Link href="/signals?type=devsold">Dev sold</Link>{' '}
          signal is raised. Tokens the deployer burns (sent to 0x0 or 0x…dEaD) are counted as burned, never as sold, and
          raise a Dev burned signal instead. Holder concentration is the share of circulating supply held by the 10 largest wallets,
          where circulating leaves out the curve, the pool and burned tokens. These numbers sit next to the build
          score and never change it.
        </p>

        <h2>Signals</h2>
        <p>
          Signals are changes Shiplog measured: a new builder, a graduation, a major release, a development spike, a new
          contract, a builder going quiet for 30 days, a deployer selling, or a pool that held at least $1,000 of liquidity
          dropping close to zero. Each one is a fact, not a judgment about why it happened. Chats that follow everything in
          the Telegram bot also get a short "Building now" digest every 6 hours.
        </p>

        <h2>Builders of the week</h2>
        <p>
          The <Link href="/leaderboard">leaderboard</Link> ranks builders by real work in a rolling 7-day window: one
          point per real commit, five per release. The activity calendar on each project uses the same counts per day.
        </p>

        <h2>What Shiplog does not do</h2>
        <p>No wallet labels by name, no paid placement, and nothing here is financial advice.</p>

        <h2>Open data</h2>
        <p>
          JSON without a key: <a href="/api/projects">/api/projects</a>, <a href="/api/ships">/api/ships</a> and{' '}
          <code>/api/scan?address=0x…</code>. Each builder also has a README badge at <code>/api/badge/[slug]</code>.
        </p>
      </div>
    </section>
  );
}
