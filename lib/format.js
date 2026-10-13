const DAY = 86400000;

export function ago(iso) {
  if (!iso) return '';
  const ms = Date.now() - Date.parse(iso);
  const m = Math.round(ms / 60000);
  if (m < 60) return `${Math.max(m, 1)}m ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.round(ms / DAY);
  if (d < 30) return `${d}d ago`;
  const mo = Math.round(d / 30);
  return `${mo}mo ago`;
}

export function usd(n) {
  if (n == null || Number.isNaN(n)) return '—';
  if (n >= 1e9) return `$${(n / 1e9).toFixed(1)}B`;
  if (n >= 1e6) return `$${(n / 1e6).toFixed(1)}M`;
  if (n >= 1e3) return `$${(n / 1e3).toFixed(n >= 1e5 ? 0 : 1)}K`;
  return `$${n.toFixed(n < 1 ? 4 : 0)}`;
}

export function pct(n) {
  if (n == null) return '';
  return `${n > 0 ? '+' : ''}${n.toFixed(1)}%`;
}

export function short(addr) {
  if (!addr) return '';
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

export function dayLabel(iso) {
  const d = new Date(iso);
  return d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' });
}

export function timeLabel(iso) {
  return new Date(iso).toISOString().slice(11, 16);
}

export const MARKET_STATUS = {
  active: 'Trading',
  'low-liquidity': 'Low liquidity',
  'no-liquidity': 'No liquidity',
  inactive: 'No trades in 24h',
};

export function agoTs(ts) {
  if (!ts) return '';
  return ago(new Date(ts * 1000).toISOString());
}

function normalizeUrl(v, base) {
  const s = (v || '').trim();
  if (!s) return null;
  if (/^https?:\/\//i.test(s)) return s;
  if (base && /^@?[A-Za-z0-9_]{1,30}$/.test(s)) return base + s.replace(/^@/, '');
  if (/^[\w.-]+\.[a-z]{2,}(\/.*)?$/i.test(s)) return `https://${s}`;
  return null;
}

// Links a token published about itself on chain, ready to render.
export function socialLinks(socials = {}) {
  const out = [];
  const add = (key, label, url) => url && /^https?:\/\//i.test(url) && out.push({ key, label, url });
  const all = Object.values(socials || {}).join(' ');
  const gh = /https?:\/\/(?:www\.)?github\.com\/[\w.-]+(?:\/[\w.-]+)?/i.exec(all);
  if (gh) add('gh', 'GitHub', gh[0]);
  add('x', 'X', normalizeUrl(socials.x, 'https://x.com/'));
  add('tg', 'Telegram', normalizeUrl(socials.telegram, 'https://t.me/'));
  add('dc', 'Discord', normalizeUrl(socials.discord));
  const web = normalizeUrl(socials.website);
  if (web && !/github\.com/i.test(web)) add('web', 'Web', web);
  add('fc', 'Farcaster', normalizeUrl(socials.farcaster, 'https://farcaster.xyz/'));
  return out;
}
