import Link from 'next/link';
import '../pages.css';
import { getIndex } from '@/lib/data';
import { kickIndexer } from '@/lib/kick';
import { reportWeeks } from '@/lib/report';

export const metadata = { title: 'Weekly reports' };
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export default async function Reports() {
  const idx = await getIndex();
  kickIndexer(idx.indexedAt);
  const weeks = reportWeeks(idx, 12);
  const [current, ...past] = weeks;

  return (
    <section>
      <div className="wrap" style={{ maxWidth: 860 }}>
        <h1 className="page-title">Weekly reports</h1>
        <p className="lede">
          What Pons builders shipped each week, written from the evidence Shiplog collected. Weeks run Monday to Sunday, UTC.
        </p>

        <Link href={`/reports/${current.key}`} className="rp-lead">
          <span className="rp-when">{current.partial ? 'This week, so far' : current.range}</span>
          <strong>{current.headline}</strong>
          <span className="rp-text">{current.paragraphs[0]}</span>
          <span className="rp-nums">
            <span><b className="num">{current.builders}</b> builders</span>
            <span><b className="num">{current.commits}</b> commits</span>
            <span><b className="num">{current.releases}</b> releases</span>
            <span><b className="num">{current.newBuilders.length}</b> new builders</span>
          </span>
        </Link>

        <h2 className="sec-title">Earlier weeks</h2>
        {past.length ? (
          <ul className="rp-list">
            {past.map((r) => (
              <li key={r.key}>
                <Link href={`/reports/${r.key}`}>
                  <span className="rp-when">{r.range}</span>
                  <span className="rp-title">{r.headline}</span>
                  <span className="rp-mini num">
                    {r.builders} builders, {r.commits} commits, {r.releases} releases
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="panel empty">Earlier weeks appear here as Shiplog reads more Pons history.</p>
        )}
        <p className="note">
          Reports are generated from the same data as the rest of Shiplog. Spot something wrong? <Link href="/corrections">Report a correction</Link>.
        </p>
      </div>
    </section>
  );
}
