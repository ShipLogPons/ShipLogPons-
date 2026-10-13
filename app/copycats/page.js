import Link from 'next/link';
import { getIndex } from '@/lib/data';
import { kickIndexer } from '@/lib/kick';
import { Avatar } from '@/components/ProjectRow';
import { PONS_URL } from '@/lib/pons';
import { short, agoTs } from '@/lib/format';

export const metadata = { title: 'Copycats' };
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export default async function Copycats() {
  const idx = await getIndex();
  kickIndexer(idx.indexedAt);
  const groups = idx.projects.filter((p) => p.copies > 0).sort((a, b) => b.copies - a.copies);

  return (
    <section>
      <div className="wrap" style={{ maxWidth: 900 }}>
        <h1 className="page-title">Copycats</h1>
        <p className="lede">
          Pons tokens that point at a GitHub repository another, earlier token already claimed. Anyone can paste a popular
          repo into a token description. Shiplog keeps the earliest launch, or the one the builder verified, and lists the
          rest here.
        </p>
        {groups.length ? (
          groups.map((p) => (
            <div key={p.slug} className="panel" style={{ marginTop: 22 }}>
              <div className="cc-head">
                <Avatar p={p} size={36} />
                <div>
                  <Link href={`/project/${p.slug}`} className="log-project">
                    {p.name} {p.symbol && <span className="prow-sym">${p.symbol}</span>}
                  </Link>
                  <div className="small muted">
                    {p.verified ? 'Verified by README' : 'Earliest launch'} of github.com/{p.repos[0]}
                  </div>
                </div>
              </div>
              <ul className="dep-list">
                {p.copyTokens.map((c) => (
                  <li key={c.token}>
                    <a href={PONS_URL(c.token)} target="_blank" rel="noopener noreferrer">
                      {c.name || short(c.token)} {c.symbol && `$${c.symbol}`}
                    </a>
                    <span className="muted small">
                      {short(c.token)}
                      {c.ts ? `, ${agoTs(c.ts)}` : ''}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ))
        ) : (
          <p className="alert ok">No copycats found yet.</p>
        )}
        <p className="note">
          Builders: put your token address in your README and <Link href="/submit">submit the repo</Link>. A verified token
          always wins over copies.
        </p>
      </div>
    </section>
  );
}
