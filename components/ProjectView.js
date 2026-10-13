import Link from 'next/link';
import { Suspense } from 'react';
import { notFound } from 'next/navigation';
import { getProject } from '@/lib/data';
import { STATUS } from '@/lib/score';
import { SITE } from '@/lib/telegram';
import { CHAIN, PONS_URL, PHASE } from '@/lib/pons';
import Flag from '@/components/Flag';
import LogEntry from '@/components/LogEntry';
import WatchButton from '@/components/WatchButton';
import { Avatar } from '@/components/ProjectRow';
import CurveBar from '@/components/CurveBar';
import DeployerPanel from '@/components/DeployerPanel';
import Heatmap from '@/components/Heatmap';
import PriceChart from '@/components/PriceChart';
import HoldersPanel from '@/components/HoldersPanel';
import { usd, pct, short, ago, agoTs, dayLabel, socialLinks, MARKET_STATUS } from '@/lib/format';

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const p = await getProject(slug);
  if (!p) return { title: 'Project not found' };
  return { title: p.name, description: `${p.name}: ${STATUS[p.status]?.label}. Every ship with its proof.` };
}

const PARTS = [
  ['recency', 'How recently it shipped', 40],
  ['consistency', 'Weeks with a ship, last 8', 30],
  ['weight', 'Size of the work, last 30 days', 20],
  ['spread', 'Repos and kinds of work', 10],
];

export default async function ProjectView({ params }) {
  const { slug } = await params;
  const p = await getProject(slug);
  if (!p) notFound();

  const months = new Map();
  for (const s of p.ships) {
    const key = new Date(s.date).toLocaleDateString('en-GB', { month: 'long', year: 'numeric', timeZone: 'UTC' });
    if (!months.has(key)) months.set(key, []);
    months.get(key).push(s);
  }
  const m = p.market;
  const links = socialLinks(p.socials).filter((l) => l.key !== 'gh');
  const badgeUrl = `${SITE}/api/badge/${p.slug}`;
  const pageUrl = `${SITE}/project/${p.slug}`;

  return (
    <>
      <header className="p-head">
        <div className="wrap">
          <div className="p-title">
            <Avatar p={p} size={64} />
            <h1>
              {p.name}
              {p.symbol && <span className="p-sym">${p.symbol}</span>}
            </h1>
          </div>
          {p.tagline && <p className="lede">{p.tagline}</p>}
          <div className="p-status">
            <span className="pill">
              <Flag status={p.status} size={20} withLabel />
            </span>
            {p.verified && <span className="pill ok">✓ Repo verified</span>}
            {p.phaseLabel && <span className="pill">{p.phaseLabel} on Pons</span>}
            <WatchButton slug={p.slug} />
          </div>
          <nav className="p-links" aria-label="Project links">
            {(p.owners || []).map((o) => (
              <Link key={`dev-${o}`} href={`/dev/${o}`}>Developer {o}</Link>
            ))}
            {p.repos.map((r) => (
              <a key={r} href={`https://github.com/${r}`} target="_blank" rel="noopener noreferrer">
                GitHub {r}
              </a>
            ))}
            {p.token && (
              <a href={PONS_URL(p.token)} target="_blank" rel="noopener noreferrer">Pons page</a>
            )}
            {links.map((l) => (
              <a key={l.key} href={l.url} target="_blank" rel="noopener noreferrer nofollow">{l.label}</a>
            ))}
            {m?.url && (
              <a href={m.url} target="_blank" rel="noopener noreferrer">Chart</a>
            )}
          </nav>
        </div>
      </header>

      <div className="wrap p-grid">
        <div>
          {p.repos.length > 0 && (
            <div className="panel">
              <h2>Activity, last 13 weeks</h2>
              <Heatmap activity={p.activity} />
            </div>
          )}

          <PriceChart market={m} />

          <div className="panel">
            <h2>Ship log, last 90 days</h2>
            {p.ships.length ? (
              [...months.entries()].map(([month, list]) => (
                <div key={month}>
                  <h3 className="month">{month}</h3>
                  <ul className="log-list">
                    {list.map((s, i) => (
                      <LogEntry key={`${s.url}-${i}`} s={s} showProject={false} stamp={dayLabel(s.date).split(' ').slice(1, 2).join(' ')} />
                    ))}
                  </ul>
                </div>
              ))
            ) : (
              <p className="muted">No releases or real code changes in the last 90 days on the repositories Shiplog reads.</p>
            )}
          </div>

          {p.reposRead.length > 0 && (
            <div className="panel">
              <h2>Sources read</h2>
              <ul className="repo-list">
                {p.reposRead.map((r) => (
                  <li key={r.repo}>
                    <a href={`https://github.com/${r.repo}`} target="_blank" rel="noopener noreferrer">{r.repo}</a>
                    <span className="muted small">
                      {r.readable
                        ? `${r.meaningful} of ${r.commits} recent commits counted as real work`
                        : r.status === 404
                          ? 'Repository not found'
                          : 'Could not read right now'}
                    </span>
                  </li>
                ))}
              </ul>
              <p className="note">
                {p.verified
                  ? 'This repository was verified: its README contains the token address.'
                  : 'This repository was linked by the token’s own on-chain metadata. It is not verified until the builder submits it.'}{' '}
                Merges, bot commits, dependency bumps, typo fixes and docs-only commits are not counted.
                {p.copies > 0 && (
                  <>
                    {' '}
                    {p.copies} newer Pons token{p.copies > 1 ? 's' : ''} also link this repository. Shiplog shows only the earliest launch.{' '}
                    <Link href="/copycats">See copycats</Link>
                  </>
                )}
              </p>
            </div>
          )}

          <div className="panel">
            <h2>Badge for your README</h2>
            <img src={`/api/badge/${p.slug}`} alt={`Shiplog status for ${p.name}`} height={20} style={{ height: 20, width: 'auto' }} />
            <pre><code>{`[![Shiplog](${badgeUrl})](${pageUrl})`}</code></pre>
            <p className="note">The badge updates with the project’s status and momentum.</p>
          </div>
        </div>

        <aside>
          <div className="panel">
            <h2>Build momentum</h2>
            {p.momentum == null ? (
              <p className="muted">Not measured. {STATUS[p.status]?.note}</p>
            ) : (
              <>
                <p className="bignum num">
                  {p.momentum}
                  <small>of 100</small>
                </p>
                <ul className="parts">
                  {PARTS.map(([k, label, max]) => (
                    <li key={k}>
                      <span>{label}</span>
                      <span className="num">{p.parts[k]}/{max}</span>
                      <span className="meter">
                        <span style={{ width: `${(p.parts[k] / max) * 100}%` }} />
                      </span>
                    </li>
                  ))}
                </ul>
                <p className="note">
                  Built only from shipping evidence. Price, volume and holders never enter it. <Link href="/method">Rules</Link>
                </p>
              </>
            )}
          </div>

          {p.token && (
            <div className="panel">
              <h2>On Pons</h2>
              <dl className="facts">
                <dt>Contract</dt>
                <dd>
                  <a href={`${CHAIN.explorer}/token/${p.token}`} target="_blank" rel="noopener noreferrer">{short(p.token)}</a>
                </dd>
                {p.launch?.ts && (
                  <>
                    <dt>Launched</dt>
                    <dd>{new Date(p.launch.ts * 1000).toISOString().slice(0, 10)} ({agoTs(p.launch.ts)})</dd>
                  </>
                )}
                {p.launch?.version && (
                  <>
                    <dt>Launchpad</dt>
                    <dd>Pons {p.launch.version.toUpperCase()}</dd>
                  </>
                )}
                {p.launch?.phase != null && (
                  <>
                    <dt>Curve</dt>
                    <dd>{PHASE[p.launch.phase]}</dd>
                  </>
                )}
                {(p.launch?.progress != null || p.launch?.phase === 2) && (
                  <dd style={{ gridColumn: '1 / -1', textAlign: 'left' }}>
                    <CurveBar progress={p.launch.progress} phase={p.launch.phase} />
                  </dd>
                )}
                {p.launch?.deployer && (
                  <>
                    <dt>Deployer</dt>
                    <dd>
                      <a href={`${CHAIN.explorer}/address/${p.launch.deployer}`} target="_blank" rel="noopener noreferrer">{short(p.launch.deployer)}</a>
                    </dd>
                  </>
                )}
              </dl>
            </div>
          )}

          {p.token && p.launch?.deployer && (
            <Suspense fallback={<div className="panel"><h2>Dev wallet and holders</h2><p className="muted">Reading every transfer of this token from the chain…</p></div>}>
              <HoldersPanel token={p.token} launch={p.launch} pool={m?.pairAddress} />
            </Suspense>
          )}

          {p.launch?.deployer && (
            <Suspense fallback={<div className="panel"><h2>Deployer history</h2><p className="muted">Reading launches from the chain…</p></div>}>
              <DeployerPanel deployer={p.launch.deployer} current={p.token} />
            </Suspense>
          )}

          <div className="panel">
            <h2>Token market</h2>
            {m ? (
              <dl className="facts">
                <dt>Status</dt>
                <dd>{MARKET_STATUS[m.status]}</dd>
                <dt>Price</dt>
                <dd>{m.priceUsd != null ? `$${m.priceUsd < 0.01 ? m.priceUsd.toPrecision(3) : m.priceUsd.toFixed(4)}` : '—'}</dd>
                <dt>24h change</dt>
                <dd className={m.change24 > 0 ? 'up' : m.change24 < 0 ? 'down' : ''}>{pct(m.change24) || '—'}</dd>
                <dt>Valuation</dt>
                <dd>{usd(m.fdv)}</dd>
                <dt>Liquidity</dt>
                <dd>{usd(m.liquidity)}</dd>
                <dt>Volume 24h</dt>
                <dd>{usd(m.volume24)}</dd>
              </dl>
            ) : (
              <p className="muted">{p.token ? 'No DEX market yet. The token may still be on its Pons curve.' : 'This project has no token.'}</p>
            )}
            <p className="note">Market context only. It never changes status, momentum or order.</p>
          </div>

          {p.lastShip && (
            <div className="panel">
              <h2>Last ship</h2>
              <p style={{ margin: 0 }}>{p.lastShip.title}</p>
              <p className="note" style={{ marginTop: 4 }}>
                {ago(p.lastShip.date)}, <a href={p.lastShip.url} target="_blank" rel="noopener noreferrer">see the proof</a>
              </p>
            </div>
          )}
        </aside>
      </div>
    </>
  );
}
