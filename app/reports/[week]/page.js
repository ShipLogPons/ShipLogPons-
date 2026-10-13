import Link from 'next/link';
import '../../pages.css';
import { notFound } from 'next/navigation';
import { getIndex } from '@/lib/data';
import { buildReport, parseWeek, weekStart, weekKey } from '@/lib/report';
import { Avatar } from '@/components/ProjectRow';
import LogEntry from '@/components/LogEntry';
import SignalList from '@/components/SignalList';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const WEEK = 7 * 86400000;

export async function generateMetadata({ params }) {
  const { week } = await params;
  return { title: `Week of ${week}` };
}

export default async function Report({ params }) {
  const { week } = await params;
  const start = parseWeek(week);
  if (start == null || start > weekStart()) notFound();
  const idx = await getIndex();
  const r = buildReport(idx, start);
  const prevKey = weekKey(start - WEEK);
  const nextKey = start + WEEK <= weekStart() ? weekKey(start + WEEK) : null;
  const notable = [...r.newBuilders, ...r.graduated, ...r.majors, ...r.contracts, ...r.resumed, ...r.devsold, ...r.liqgone, ...r.quiet].sort(
    (a, b) => Date.parse(b.date) - Date.parse(a.date),
  );

  return (
    <article>
      <div className="wrap" style={{ maxWidth: 860, paddingTop: 36, paddingBottom: 56 }}>
        <p className="crumb">
          <Link href="/reports">Weekly reports</Link>
        </p>
        <p className="rp-when" style={{ marginTop: 18 }}>
          {r.range}
          {r.partial && ', in progress'}
        </p>
        <h1 className="page-title" style={{ marginTop: 6 }}>{r.headline}</h1>

        <div className="rp-body">
          {r.paragraphs.map((t, i) => (
            <p key={i}>{t}</p>
          ))}
        </div>

        <dl className="rp-stats">
          <div><dt>Builders shipping</dt><dd className="num">{r.builders}</dd></div>
          <div><dt>Real commits</dt><dd className="num">{r.commits.toLocaleString('en-US')}</dd></div>
          <div><dt>Releases</dt><dd className="num">{r.releases}</dd></div>
          <div><dt>New builders</dt><dd className="num">{r.newBuilders.length}</dd></div>
          <div><dt>Graduated</dt><dd className="num">{r.graduated.length}</dd></div>
        </dl>

        {r.board.length > 0 && (
          <>
            <h2 className="sec-title">Who did the work</h2>
            <div className="panel-card">
              <ol className="board">
                {r.board.map((x, i) => (
                  <li key={x.p.slug} style={{ gridTemplateColumns: '30px minmax(0, 1fr) 52px' }}>
                    <span className="board-rank num">{i + 1}</span>
                    <Link href={`/project/${x.p.slug}`} className="board-name">
                      <Avatar p={x.p} size={30} />
                      <span>
                        <span className="nm">{x.p.name}</span>
                        <span className="small muted board-sub">
                          {x.now.commits} commit{x.now.commits === 1 ? '' : 's'}
                          {x.now.releases > 0 && `, ${x.now.releases} release${x.now.releases > 1 ? 's' : ''}`}
                        </span>
                      </span>
                    </Link>
                    <span className="board-pts num">{x.now.points}</span>
                  </li>
                ))}
              </ol>
            </div>
            <p className="note">Points: one per real commit, five per release, the same as Builders of the week.</p>
          </>
        )}

        {notable.length > 0 && (
          <>
            <h2 className="sec-title">What changed</h2>
            <div className="panel-card">
              <SignalList signals={notable} />
            </div>
          </>
        )}

        {r.ships.length > 0 && (
          <>
            <h2 className="sec-title">Every ship this week</h2>
            <div className="logbook">
              <ul className="log-list">
                {r.ships.slice(0, 60).map((s, i) => (
                  <LogEntry key={`${s.url}-${i}`} s={s} />
                ))}
              </ul>
              {r.ships.length > 60 && <p className="logbook-foot">{r.ships.length - 60} more in the <Link href="/log">full log</Link>.</p>}
            </div>
          </>
        )}

        <nav className="rp-pager" aria-label="Other weeks">
          <Link href={`/reports/${prevKey}`}>Previous week</Link>
          {nextKey && <Link href={`/reports/${nextKey}`}>Next week</Link>}
        </nav>
        <p className="note">
          Written automatically from on-chain data and public GitHub activity. Nothing here is financial advice.{' '}
          <Link href="/corrections">Report a correction</Link>.
        </p>
      </div>
    </article>
  );
}
