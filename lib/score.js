const DAY = 86400000;

export const STATUS = {
  shipping: { label: 'Shipping', note: 'Shipped something real in the last 7 days.' },
  resumed: { label: 'Back to building', note: 'Shipping again after more than 60 quiet days.' },
  active: { label: 'Active', note: 'Shipped in the last 30 days, or twice in 45 days.' },
  quiet: { label: 'Quiet', note: 'Nothing real shipped for 30 to 60 days.' },
  dormant: { label: 'Dormant', note: 'Nothing real shipped for over 60 days on the sources ShipLog reads.' },
  unknown: { label: 'Can’t read', note: 'A source is linked but ShipLog could not read it right now.' },
  nosource: { label: 'No builder source', note: 'No GitHub repository linked, so building is not measured. Trading is not building.' },
};

export const STATUS_ORDER = ['shipping', 'resumed', 'active', 'quiet', 'dormant', 'unknown', 'nosource'];

export function scoreProject({ ships, repoCount, readableCount, now = Date.now() }) {
  if (!repoCount && !ships.length) return { status: 'nosource', momentum: null, parts: null, lastShip: null };
  if (repoCount && !readableCount && !ships.length) return { status: 'unknown', momentum: null, parts: null, lastShip: null };

  const sorted = [...ships].sort((a, b) => Date.parse(b.date) - Date.parse(a.date));
  const age = (s) => (now - Date.parse(s.date)) / DAY;
  if (!sorted.length) {
    return { status: 'dormant', momentum: 0, parts: { recency: 0, consistency: 0, weight: 0, spread: 0 }, lastShip: null };
  }

  const last = sorted[0];
  const d = age(last);
  const in45 = sorted.filter((s) => age(s) <= 45).length;

  let status;
  if (d <= 7) {
    const recent = sorted.filter((s) => age(s) <= 14);
    const before = sorted.find((s) => age(s) > 14);
    const oldestRecent = recent[recent.length - 1];
    const gap = before ? (Date.parse(oldestRecent.date) - Date.parse(before.date)) / DAY : 0;
    status = before && gap >= 60 ? 'resumed' : 'shipping';
  } else if (d <= 30 || in45 >= 2) status = 'active';
  else if (d <= 60) status = 'quiet';
  else status = 'dormant';

  // Build Momentum: 0-100, from shipping evidence only. Price never enters.
  const recency = 40 * Math.exp(-d / 14);
  const weeks = new Set(sorted.filter((s) => age(s) < 56).map((s) => Math.floor(age(s) / 7)));
  const consistency = (weeks.size / 8) * 30;
  const weight30 = sorted.filter((s) => age(s) <= 30).reduce((sum, s) => sum + s.weight, 0);
  const weight = (Math.min(weight30, 30) / 30) * 20;
  const repos30 = new Set(sorted.filter((s) => age(s) <= 30).map((s) => s.repo)).size;
  const kinds30 = new Set(sorted.filter((s) => age(s) <= 30).map((s) => s.kind)).size;
  const spread = (Math.min(repos30 + (kinds30 > 1 ? 1 : 0), 3) / 3) * 10;

  const parts = {
    recency: Math.round(recency),
    consistency: Math.round(consistency),
    weight: Math.round(weight),
    spread: Math.round(spread),
  };
  const momentum = Math.min(100, parts.recency + parts.consistency + parts.weight + parts.spread);
  return { status, momentum, parts, lastShip: last };
}
