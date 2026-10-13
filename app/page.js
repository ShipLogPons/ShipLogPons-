import Link from 'next/link';
import { getIndex, shipsOf, counts, weekBoard } from '@/lib/data';
import { kickIndexer } from '@/lib/kick';
import { Avatar } from '@/components/ProjectRow';
import ProjectCard from '@/components/ProjectCard';
import LogEntry from '@/components/LogEntry';
import TokenTile from '@/components/TokenTile';
import SignalList from '@/components/SignalList';
import { timeLabel, dayLabel } from '@/lib/format';
import './home.css';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export default async function Home() {
  const idx = await getIndex();
  kickIndexer(idx.indexedAt);
  const { projects } = idx;
  const c = counts(idx);
  const recent = shipsOf(projects, 14).slice(0, 7);
  const building = projects.filter((p) => ['shipping', 'resumed', 'active'].includes(p.status));
  const fresh = idx.feed.filter((f) => f.name || f.symbol).slice(0, 8);
  const max = Math.max(1, ...c.days.map((d) => d.n));
  const today = new Date().toISOString().slice(0, 10);
  const week = weekBoard(projects, 3);

  return (
    <>
      <section className="hero">
        <div className="wrap">
          <p className="hero-context">Pons launchpad on Robinhood Chain</p>
          <h1>Find out who is really building on Pons.</h1>
          <p className="lede">
            The chart shows what traders think. Shiplog shows what the builder shipped, with a link to every commit and release.
          </p>
          <div className="hero-ctas">
            <Link className="btn" href="/launch">Launch a token</Link>
            <Link className="btn btn-ghost" href="/submit">Submit a project</Link>
          </div>
          <form action="/explore" role="search">
            <label htmlFor="q" className="search-label">Search a project, or paste a contract</label>
            <div className="search">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true"><circle cx="11" cy="11" r="6.5" /><path d="m16 16 4.5 4.5" /></svg>
              <input id="q" name="q" placeholder="Name, $ticker or 0x…" autoComplete="off" />
              <button type="submit">Search</button>
            </div>
          </form>
          <p className="hint">
            Holding a Pons token? <Link href="/scan">Check if anyone is building it</Link>
          </p>
          <ul className="hero-stats">
            <li>
              <strong className="num">{c.shipping}</strong>
              <span>shipping this week</span>
            </li>
            <li>
              <strong className="num">{c.tracked}</strong>
              <span>builders tracked</span>
            </li>
            <li>
              <strong className="num">{c.launches24.toLocaleString('en-US')}</strong>
              <span>Pons launches in 24h</span>
            </li>
          </ul>
        </div>
      </section>

      <section style={{ paddingTop: 12 }}>
        <div className="wrap">
          <div className="sec-head">
            <h2>Building now</h2>
            <Link className="sec-link" href="/explore">All {projects.length} builders</Link>
          </div>
          {building.length ? (
            <ul className="pcards">
              {building.slice(0, 6).map((p) => (
                <ProjectCard key={p.slug} p={p} />
              ))}
            </ul>
          ) : (
            <p className="panel empty">
              No builder has shipped in the last 30 days yet. Building on Pons? <Link href="/submit">Submit your repo</Link>.
            </p>
          )}
        </div>
      </section>

      {!idx.githubToken && (
        <div className="wrap">
          <p className="banner">
            Shiplog reads GitHub through its public feeds, which show the newest 20 commits of each repository. Busy builders may
            have done more than the log shows.
          </p>
        </div>
      )}

      <section>
        <div className="wrap two">
          <div>
            <div className="logbook">
              <div className="logbook-head">
                <h2>Ship log</h2>
                <span>UTC</span>
              </div>
              {recent.length ? (
                <ul className="log-list">
                  {recent.map((s, i) => (
                    <LogEntry
                      key={`${s.url}-${i}`}
                      s={s}
                      stamp={
                        <>
                          {dayLabel(s.date).split(' ').slice(1).join(' ')}
                          <br />
                          {timeLabel(s.date)}
                        </>
                      }
                    />
                  ))}
                </ul>
              ) : (
                <p className="log-empty">No ships logged in the last two weeks.</p>
              )}
              <p className="logbook-foot">
                <Link href="/log">Open the full log</Link>
              </p>
            </div>
            <div className="strip" aria-label="Ships per day, last 14 days">
              {c.days.map((d) => (
                <span key={d.day} className={d.day === today ? 'today' : undefined} style={{ height: `${Math.max(4, (d.n / max) * 100)}%` }} title={`${d.day}: ${d.n} ships`} />
              ))}
            </div>
            <p className="strip-cap">Ships per day, last two weeks. Today in yellow.</p>
          </div>

          <div>
            {week.length > 0 && (
              <div className="panel">
                <div className="sec-head" style={{ marginBottom: 10 }}>
                  <h2 style={{ marginBottom: 0 }}>Builders of the week</h2>
                  <Link className="sec-link" href="/leaderboard">Leaderboard</Link>
                </div>
                <ol className="board">
                  {week.map((x, i) => (
                    <li key={x.p.slug} style={{ gridTemplateColumns: '28px minmax(0, 1fr) 44px', padding: '10px 0' }}>
                      <span className="board-rank num">{i + 1}</span>
                      <Link href={`/project/${x.p.slug}`} className="board-name">
                        <Avatar p={x.p} size={30} />
                        <span>
                          <span className="nm">{x.p.name}</span>
                          <span className="small muted board-sub">
                            {x.commits} commit{x.commits === 1 ? '' : 's'}
                            {x.releases > 0 && `, ${x.releases} release${x.releases > 1 ? 's' : ''}`}
                          </span>
                        </span>
                      </Link>
                      <span className="board-pts num">{x.points}</span>
                    </li>
                  ))}
                </ol>
              </div>
            )}
            {idx.signals.length > 0 && (
              <div className="panel-card">
                <div className="sec-head" style={{ padding: '16px 18px 0', marginBottom: 4 }}>
                  <h2 style={{ fontSize: '1.1rem' }}>Latest signals</h2>
                  <Link className="sec-link" href="/signals">All signals</Link>
                </div>
                <SignalList signals={idx.signals.slice(0, 5)} />
              </div>
            )}
          </div>
        </div>
      </section>

      <section style={{ paddingTop: 0 }}>
        <div className="wrap">
          <div className="sec-head">
            <div>
              <h2>Fresh on Pons</h2>
              <p>The newest launches, with what each token wrote about itself on chain.</p>
            </div>
            <Link className="sec-link" href="/launches">All new launches</Link>
          </div>
          {fresh.length ? (
            <ul className="tiles">
              {fresh.map((t) => (
                <TokenTile key={t.token} t={t} />
              ))}
            </ul>
          ) : (
            <p className="muted">Reading the latest launches from the chain. Refresh in a minute.</p>
          )}
          {idx.indexedAt && (
            <p className="note">Chain read {new Date(idx.indexedAt).toUTCString().slice(5, 22)} UTC. New launches are picked up every few minutes.</p>
          )}
        </div>
      </section>
    </>
  );
}
