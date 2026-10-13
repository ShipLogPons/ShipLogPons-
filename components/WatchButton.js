'use client';

import { useEffect, useState } from 'react';

const KEY = 'shiplog.watchlist';

export function readWatchlist() {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) || '[]');
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
}

function writeWatchlist(list) {
  try {
    localStorage.setItem(KEY, JSON.stringify(list));
  } catch {
    /* storage unavailable */
  }
}

export default function WatchButton({ slug }) {
  const [on, setOn] = useState(false);
  useEffect(() => setOn(readWatchlist().includes(slug)), [slug]);
  function toggle() {
    const list = readWatchlist();
    const next = list.includes(slug) ? list.filter((s) => s !== slug) : [slug, ...list];
    writeWatchlist(next);
    setOn(next.includes(slug));
  }
  return (
    <button type="button" className="watch" aria-pressed={on} onClick={toggle}>
      {on ? '★ Watching' : '☆ Watch'}
    </button>
  );
}
