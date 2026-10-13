'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Flag from '@/components/Flag';
import { readWatchlist } from '@/components/WatchButton';

function ago(iso) {
  if (!iso) return '';
  const h = Math.round((Date.now() - Date.parse(iso)) / 3600000);
  return h < 24 ? `${Math.max(h, 1)}h ago` : `${Math.round(h / 24)}d ago`;
}

export default function WatchlistView() {
  const [state, setState] = useState({ loading: true, items: [], error: '' });

  useEffect(() => {
    const slugs = readWatchlist();
    if (!slugs.length) {
      setState({ loading: false, items: [], error: '' });
      return;
    }
    fetch('/api/projects')
      .then((r) => r.json())
      .then((j) => {
        const map = new Map((j.projects || []).map((p) => [p.slug, p]));
        setState({ loading: false, items: slugs.map((s) => map.get(s)).filter(Boolean), error: '' });
      })
      .catch(() => setState({ loading: false, items: [], error: 'Shiplog could not load your watchlist. Refresh to try again.' }));
  }, []);

  if (state.loading) return <p className="muted" style={{ marginTop: 24 }}>Loading your watchlist…</p>;
  if (state.error) return <p className="alert" role="alert">{state.error}</p>;
  if (!state.items.length) {
    return (
      <p className="alert ok" style={{ marginTop: 24 }}>
        Nothing here yet. Open any <Link href="/explore">builder page</Link> and press Watch to follow it.
      </p>
    );
  }
  return (
    <div className="panel-card" style={{ marginTop: 24 }}>
      <ul className="plist">
        {state.items.map((p) => (
          <li key={p.slug} className="prow">
            <Link href={`/project/${p.slug}`} className="prow-link" style={{ gridTemplateColumns: 'minmax(0,1fr) auto' }}>
              <span className="prow-main">
                <span className="prow-name">
                  <span className="nm">{p.name}</span>
                  {p.symbol && <span className="prow-sym">${p.symbol}</span>}
                </span>
                <span className="prow-sub">
                  <span className="prow-ship">{p.lastShip ? p.lastShip.title : 'No ship in the last 90 days'}</span>
                  {p.lastShip && <span className="prow-when">{ago(p.lastShip.date)}</span>}
                </span>
              </span>
              <Flag status={p.status} withLabel />
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
