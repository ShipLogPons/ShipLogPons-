import Link from 'next/link';
import { getIndex, shipsOf } from '@/lib/data';
import { kickIndexer } from '@/lib/kick';
import LogEntry from '@/components/LogEntry';
import { dayLabel, timeLabel } from '@/lib/format';

export const metadata = { title: 'Ship log' };
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export default async function LogPage() {
  const idx = await getIndex();
  kickIndexer(idx.indexedAt);
  const ships = shipsOf(idx.projects, 30);
  const days = new Map();
  for (const s of ships) {
    const d = s.date.slice(0, 10);
    if (!days.has(d)) days.set(d, []);
    days.get(d).push(s);
  }
  const builders = new Set(ships.map((s) => s.project)).size;

  return (
    <section>
      <div className="wrap" style={{ maxWidth: 840 }}>
        <h1 className="page-title">Ship log</h1>
        <p className="lede">
          Every release and week of real code work from Pons builders in the last 30 days: {ships.length} entries from{' '}
          {builders} builders. Each entry links to its proof on GitHub.
        </p>
        {[...days.entries()].map(([day, list]) => (
          <div key={day} className="panel" style={{ marginTop: 22, marginBottom: 0 }}>
            <h2 style={{ fontSize: '1.1rem' }}>
              {dayLabel(day + 'T12:00:00Z')} <span className="muted small num">{list.length} ships</span>
            </h2>
            <ul className="log-list">
              {list.map((s, i) => (
                <LogEntry key={`${s.url}-${i}`} s={s} stamp={timeLabel(s.date)} />
              ))}
            </ul>
          </div>
        ))}
        {!ships.length && (
          <p className="alert ok" style={{ marginTop: 24 }}>
            No ships logged yet. Builders appear once a Pons token links a GitHub repo or a builder{' '}
            <Link href="/submit">submits one</Link>.
          </p>
        )}
      </div>
    </section>
  );
}
