import Link from 'next/link';
import { getIndex, weekBoard, activitySum } from '@/lib/data';
import { kickIndexer } from '@/lib/kick';
import { Avatar } from '@/components/ProjectRow';
import Flag from '@/components/Flag';
import Heatmap from '@/components/Heatmap';

export const metadata = { title: 'Builders of the week', description: 'The Pons builders who shipped the most real code in the last 7 days.' };
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

function Trend({ delta, before }) {
  if (before === 0) return <span className="trend new">new this week</span>;
  if (delta === 0) return <span className="trend">same as last week</span>;
  return <span className={`trend ${delta > 0 ? 'up' : 'down'}`}>{delta > 0 ? '▲' : '▼'} {Math.abs(delta)} vs last week</span>;
}

export default async function Leaderboard() {
  const idx = await getIndex();
  kickIndexer(idx.indexedAt);
  const board = weekBoard(idx.projects, 25);
  const [first, ...rest] = board;
  const month = idx.projects
    .map((p) => ({ p, ...activitySum(p.activity, 30) }))
    .filter((x) => x.commits + x.releases > 0)
    .sort((a, b) => b.commits + b.releases * 5 - (a.commits + a.releases * 5))
    .slice(0, 5);

  return (
    <section>
      <div className="wrap" style={{ maxWidth: 900 }}>
        <h1 className="page-title">Builders of the week</h1>
        <p className="lede">
          Pons builders ranked by real work in the last 7 days. One point per real commit, five per release. Merges, bots,
          dependency bumps and typo fixes do not count.
        </p>

        {first ? (
          <>
            <div className="champ">
              <span className="champ-rank">#1</span>
              <Avatar p={first.p} size={72} />
              <div className="champ-main">
                <Link href={`/project/${first.p.slug}`} className="champ-name">
                  {first.p.name} {first.p.symbol && <span className="prow-sym">${first.p.symbol}</span>}
                </Link>
                <p className="champ-sub">
                  <strong className="num">{first.points}</strong> points: {first.commits} real commit{first.commits === 1 ? '' : 's'}
                  {first.releases > 0 && `, ${first.releases} release${first.releases > 1 ? 's' : ''}`}. <Trend delta={first.delta} before={first.before} />
                </p>
                <Heatmap activity={first.p.activity} weeks={6} compact />
              </div>
            </div>

            {rest.length > 0 && (
              <div className="panel-card">
                <ol className="board" start={2}>
                  {rest.map((x, i) => (
                    <li key={x.p.slug}>
                      <span className="board-rank num">{i + 2}</span>
                      <Link href={`/project/${x.p.slug}`} className="board-name">
                        <Avatar p={x.p} size={32} />
                        <span>
                          <span className="nm">{x.p.name}</span>
                          {x.p.symbol && <span className="prow-sym">${x.p.symbol}</span>}
                          <span className="small muted board-sub">
                            {x.commits} commit{x.commits === 1 ? '' : 's'}
                            {x.releases > 0 && `, ${x.releases} release${x.releases > 1 ? 's' : ''}`} · <Trend delta={x.delta} before={x.before} />
                          </span>
                        </span>
                      </Link>
                      <Flag status={x.p.status} size={16} />
                      <span className="board-pts num">{x.points}</span>
                    </li>
                  ))}
                </ol>
              </div>
            )}
          </>
        ) : (
          <p className="empty">No tracked builder shipped real work in the last 7 days yet.</p>
        )}

        {month.length > 0 && (
          <>
            <h2 className="sec-title">Most work in the last 30 days</h2>
            <div className="panel-card">
              <ol className="board">
                {month.map((x, i) => (
                  <li key={x.p.slug}>
                    <span className="board-rank num">{i + 1}</span>
                    <Link href={`/project/${x.p.slug}`} className="board-name">
                      <Avatar p={x.p} size={32} />
                      <span>
                        <span className="nm">{x.p.name}</span>
                        <span className="small muted board-sub">
                          {x.commits} commits{x.releases > 0 && `, ${x.releases} release${x.releases > 1 ? 's' : ''}`}
                        </span>
                      </span>
                    </Link>
                    <Flag status={x.p.status} size={16} />
                    <span className="board-pts num">{x.commits + x.releases * 5}</span>
                  </li>
                ))}
              </ol>
            </div>
          </>
        )}
        <p className="note">
          Weeks are rolling 7-day windows in UTC. {idx.githubToken ? '' : 'Shiplog reads the newest 20 commits of each repository from GitHub\u2019s public feeds, so very busy builders may score higher than shown. '}
          <Link href="/method">How Shiplog counts work</Link>
        </p>
      </div>
    </section>
  );
}
