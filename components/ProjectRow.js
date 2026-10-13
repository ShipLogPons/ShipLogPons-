import Link from 'next/link';
import Flag from './Flag';
import { ago, usd, MARKET_STATUS } from '@/lib/format';
import { STATUS } from '@/lib/score';
import AvatarImg from './AvatarImg';

// IPFS logos go through Shiplog's own gateway fallback.
export function logoSrc(url) {
  if (!url) return null;
  const m = url.match(/\/ipfs\/([A-Za-z0-9]{20,100}(?:\/[A-Za-z0-9._-]{1,120})*)/);
  return m ? `/api/logo/${m[1]}` : url;
}

export function Avatar({ p, src, name, size = 40 }) {
  const label = name || p?.name || '?';
  const image = src !== undefined ? src : p?.avatar;
  const initials = label.replace(/[^A-Za-z0-9]/g, '').slice(0, 2).toUpperCase() || '?';
  return (
    <span className="avatar" style={{ width: size, height: size, fontSize: Math.max(9, Math.round(size / 3)) }}>
      {initials}
      {image && <AvatarImg src={logoSrc(image)} size={size} />}
    </span>
  );
}

export default function ProjectRow({ p }) {
  return (
    <li className="prow">
      <Link href={`/project/${p.slug}`} className="prow-link">
        <Avatar p={p} />
        <span className="prow-main">
          <span className="prow-name">
            <span className="nm">{p.name}</span>
            {p.verified && <span className="tick" title="Repository verified by its README">✓</span>}
            {p.symbol && <span className="prow-sym">${p.symbol}</span>}
          </span>
          <span className="prow-sub">
            {p.lastShip ? (
              <>
                <span className="prow-ship">{p.lastShip.title}</span>
                <span className="prow-when">{ago(p.lastShip.date)}</span>
              </>
            ) : (
              <span className="prow-ship muted">{STATUS[p.status]?.note}</span>
            )}
          </span>
        </span>
        <span className="prow-status">
          <Flag status={p.status} withLabel />
        </span>
        <span className="prow-meter" aria-label={p.momentum == null ? 'Momentum not measured' : `Momentum ${p.momentum} of 100`}>
          {p.momentum == null ? (
            <span className="muted">not measured</span>
          ) : (
            <>
              <span className="meter">
                <span style={{ width: `${Math.max(2, p.momentum)}%` }} />
              </span>
              <span className="num">{p.momentum}</span>
            </>
          )}
        </span>
        <span className="prow-mkt">
          {p.market ? (
            <>
              <span className="num">{usd(p.market.fdv)}</span>
              <span className="muted small">{MARKET_STATUS[p.market.status]}</span>
            </>
          ) : (
            <span className="muted small">
              {p.token
                ? p.launch?.progress != null && p.launch.phase !== 2
                  ? `${Math.min(99, Math.max(0, Math.round(p.launch.progress)))}% to graduation`
                  : p.phaseLabel || 'No market'
                : 'No token'}
            </span>
          )}
        </span>
      </Link>
    </li>
  );
}
