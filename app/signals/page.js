import Link from 'next/link';
import { getIndex } from '@/lib/data';
import { kickIndexer } from '@/lib/kick';
import SignalList, { SIGNAL_LABEL } from '@/components/SignalList';

export const metadata = { title: 'Signals' };
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export default async function Signals({ searchParams }) {
  const sp = await searchParams;
  const type = typeof sp.type === 'string' ? sp.type : 'all';
  const idx = await getIndex();
  kickIndexer(idx.indexedAt);
  const list = idx.signals.filter((s) => type === 'all' || s.type === type);
  const count = (t) => idx.signals.filter((s) => s.type === t).length;

  return (
    <section>
      <div className="wrap" style={{ maxWidth: 900 }}>
        <h1 className="page-title">Signals</h1>
        <p className="lede">
          Measured changes on Pons builders: new builders, graduations, major releases and development spikes. Each one is a
          fact Shiplog observed, not a prediction.
        </p>
        <nav className="tabs" aria-label="Filter signals">
          <Link className="tab" href="/signals" aria-current={type === 'all' ? 'page' : undefined}>
            All <span className="count">{idx.signals.length}</span>
          </Link>
          {Object.entries(SIGNAL_LABEL).map(([k, v]) => (
            <Link key={k} className="tab" href={`/signals?type=${k}`} aria-current={type === k ? 'page' : undefined}>
              {v.label} <span className="count">{count(k)}</span>
            </Link>
          ))}
        </nav>
        <div className="panel-card">
          {list.length ? <SignalList signals={list} /> : <p className="empty">No signals of this kind yet. They appear as Shiplog reads more of Pons.</p>}
        </div>
        <p className="note">
          Want these in Telegram? Use the Shiplog bot and send <code>/watch all</code>.
        </p>
      </div>
    </section>
  );
}
