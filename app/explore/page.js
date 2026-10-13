import Link from 'next/link';
import { getIndex, narratives } from '@/lib/data';
import { kickIndexer } from '@/lib/kick';
import { STATUS } from '@/lib/score';
import ProjectRow from '@/components/ProjectRow';
import Flag from '@/components/Flag';

export const metadata = { title: 'Builders' };
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const TABS = [
  { key: 'all', label: 'All', test: () => true },
  { key: 'shipping', label: 'Shipping', test: (p) => ['shipping', 'resumed'].includes(p.status) },
  { key: 'active', label: 'Active', test: (p) => ['shipping', 'resumed', 'active'].includes(p.status) },
  { key: 'radar', label: 'Little attention', test: (p) => p.underRadar },
  { key: 'verified', label: 'Verified repo', test: (p) => p.verified },
  { key: 'graduated', label: 'Graduated', test: (p) => p.launch?.phase === 2 },
  { key: 'quiet', label: 'Quiet or dormant', test: (p) => ['quiet', 'dormant'].includes(p.status) },
];

function href(params) {
  const q = new URLSearchParams(Object.entries(params).filter(([, v]) => v && v !== 'all'));
  const s = q.toString();
  return s ? `/explore?${s}` : '/explore';
}

export default async function Explore({ searchParams }) {
  const sp = await searchParams;
  const status = typeof sp.status === 'string' ? sp.status : 'all';
  const narrative = typeof sp.narrative === 'string' ? sp.narrative : '';
  const q = typeof sp.q === 'string' ? sp.q.trim() : '';
  const idx = await getIndex();
  kickIndexer(idx.indexedAt);
  const { projects } = idx;

  const tab = TABS.find((t) => t.key === status) || TABS[0];
  const ql = q.toLowerCase().replace(/^\$/, '');
  const base = projects.filter(
    (p) =>
      (!narrative || p.narrative === narrative) &&
      (!ql ||
        p.name?.toLowerCase().includes(ql) ||
        p.symbol?.toLowerCase().includes(ql) ||
        p.token?.toLowerCase() === ql ||
        p.repos.some((r) => r.toLowerCase().includes(ql)))
  );
  const list = base.filter(tab.test);
  const tokenMatch = /^0x[0-9a-f]{40}$/.test(ql) && !list.length;

  return (
    <section>
      <div className="wrap">
        <h1 className="page-title">Builders on Pons</h1>
        <p className="lede">
          Pons projects with a GitHub repo, from the link in their own token metadata or a verified submission. Sorted by
          what the builder is shipping. Price never changes the order.
        </p>

        <form className="search" action="/explore" role="search">
          <label htmlFor="q" className="sr">Search builders</label>
          <input id="q" name="q" defaultValue={q} placeholder="Name, $symbol, repo or contract" autoComplete="off" />
          {status !== 'all' && <input type="hidden" name="status" value={status} />}
          <button type="submit">Search</button>
        </form>

        <nav className="tabs" aria-label="Filter by status">
          {TABS.map((t) => (
            <Link key={t.key} className="tab" href={href({ status: t.key, narrative, q })} aria-current={t.key === tab.key ? 'page' : undefined}>
              {t.label} <span className="count">{base.filter(t.test).length}</span>
            </Link>
          ))}
        </nav>

        {narratives(projects).length > 1 && (
          <div className="chips" style={{ marginBottom: 18 }}>
            {narratives(projects).map(([n, count]) => (
              <Link key={n} className="tab" href={href({ status, narrative: n === narrative ? '' : n, q })} aria-current={n === narrative ? 'page' : undefined}>
                {n} <span className="count">{count}</span>
              </Link>
            ))}
          </div>
        )}

        {(narrative || q) && (
          <p className="muted">
            {narrative && <>Narrative: <strong>{narrative}</strong>. </>}
            {q && <>Search: <strong>{q}</strong>. </>}
            <Link href={href({ status })}>Clear</Link>
          </p>
        )}

        <div className="panel-card">
          {list.length ? (
            <>
              <div className="list-head" aria-hidden="true">
                <span />
                <span>Project and latest ship</span>
                <span className="h-status">Status</span>
                <span className="h-meter">Momentum</span>
                <span>Valuation</span>
              </div>
              <ul className="plist">
                {list.map((p) => (
                  <ProjectRow key={p.slug} p={p} />
                ))}
              </ul>
            </>
          ) : tokenMatch ? (
            <p className="empty">
              No builder is linked to this token yet. <Link href={`/scan?address=${ql}`}>Scan the token</Link> to see what
              the chain says about it.
            </p>
          ) : (
            <p className="empty">
              No builder matches. Try another filter, or <Link href="/submit">submit a project</Link>.
            </p>
          )}
        </div>

        <details style={{ marginTop: 24 }}>
          <summary>What the flags mean</summary>
          <dl className="facts" style={{ marginTop: 12, maxWidth: 680 }}>
            {Object.entries(STATUS).map(([k, v]) => (
              <div key={k} style={{ display: 'contents' }}>
                <dt><Flag status={k} withLabel /></dt>
                <dd style={{ textAlign: 'left' }}>{v.note}</dd>
              </div>
            ))}
          </dl>
        </details>
      </div>
    </section>
  );
}
