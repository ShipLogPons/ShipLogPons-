import Link from 'next/link';
import { getIndex } from '@/lib/data';
import { kickIndexer } from '@/lib/kick';
import TokenTile from '@/components/TokenTile';
import { socialLinks } from '@/lib/format';

export const metadata = { title: 'New on Pons' };
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const FILTERS = [
  { key: 'all', label: 'All named', test: (t) => t.name || t.symbol },
  { key: 'links', label: 'Has links', test: (t) => socialLinks(t.socials).length > 0 },
  { key: 'github', label: 'Links GitHub', test: (t) => socialLinks(t.socials).some((l) => l.key === 'gh') || /github\.com/i.test(t.description) },
  { key: 'described', label: 'Has a description', test: (t) => (t.description || '').length > 20 },
];

export default async function Launches({ searchParams }) {
  const sp = await searchParams;
  const key = typeof sp.f === 'string' ? sp.f : 'all';
  const idx = await getIndex();
  kickIndexer(idx.indexedAt);
  const f = FILTERS.find((x) => x.key === key) || FILTERS[0];
  const list = idx.feed.filter(f.test).slice(0, 120);

  return (
    <section>
      <div className="wrap">
        <h1 className="page-title">New on Pons</h1>
        <p className="lede">
          The latest token launches, read from the Pons factory contracts on Robinhood Chain. Each card shows what the
          token wrote about itself on chain. Most launches have no builder behind them. The ones that link a GitHub repo
          get a builder page.
        </p>
        <nav className="tabs" aria-label="Filter launches">
          {FILTERS.map((x) => (
            <Link key={x.key} className="tab" href={x.key === 'all' ? '/launches' : `/launches?f=${x.key}`} aria-current={x.key === f.key ? 'page' : undefined}>
              {x.label} <span className="count">{idx.feed.filter(x.test).length}</span>
            </Link>
          ))}
        </nav>
        {list.length ? (
          <ul className="tiles">
            {list.map((t) => (
              <TokenTile key={t.token} t={t} />
            ))}
          </ul>
        ) : (
          <p className="muted">No launches match this filter in the latest {idx.feed.length} launches.</p>
        )}
        <p className="note">
          Showing up to 120 of the latest {idx.feed.length} launches Shiplog has read. Descriptions and links are written by
          whoever launched the token and are not checked.
        </p>
      </div>
    </section>
  );
}
