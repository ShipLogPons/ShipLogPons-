import Link from 'next/link';
import Flag from './Flag';
import CopyAddress from './CopyAddress';
import { Avatar } from './ProjectRow';
import { CHAIN } from '@/lib/pons';
import { ago, usd } from '@/lib/format';

const KIND = { release: 'Release', code: 'Code changes', contract: 'New contract' };

function handle(url) {
  const m = /(?:x|twitter)\.com\/([A-Za-z0-9_]{1,15})(?:[/?#]|$)/i.exec(url || '');
  if (!m || ['i', 'intent', 'home', 'search', 'share', 'hashtag'].includes(m[1].toLowerCase())) return null;
  return m[1];
}

// A builder at a glance: status, last ship, the one number that matters, and the contract.
export default function ProjectCard({ p }) {
  const x = handle(p.socials?.x);
  const onCurve = p.launch && p.launch.phase !== 2 && p.launch.progress != null;
  return (
    <li className="pcard">
      <div className="pc-top">
        <Avatar p={p} size={52} />
        <div className="pc-id">
          <Link href={`/project/${p.slug}`} className="pc-name">
            {p.name}
            {p.verified && <span className="tick" style={{ display: 'inline-grid', marginLeft: 8, verticalAlign: 'middle' }} title="Repository verified">✓</span>}
          </Link>
          <span className="pc-sub">{[p.symbol && `$${p.symbol}`, p.narrative !== 'Other' && p.narrative].filter(Boolean).join(', ')}</span>
        </div>
      </div>
      <div className="pc-status">
        <span className={`spill s-${p.status}`}><Flag status={p.status} withLabel size={16} /></span>
        {p.lastShip && (
          <span>
            {KIND[p.lastShip.kind] || 'Ship'} <span className="when">{ago(p.lastShip.date)}</span>
          </span>
        )}
      </div>
      {p.tagline && <p className="pc-desc">{p.tagline}</p>}
      <dl className="pc-row">
        {p.market ? (
          <>
            <dt>Valuation</dt>
            <dd>{usd(p.market.fdv)}</dd>
          </>
        ) : onCurve ? (
          <>
            <dt>Pons curve</dt>
            <dd>{p.launch.progress < 1 ? 'Under 1%' : `${Math.round(p.launch.progress)}%`} to graduation</dd>
          </>
        ) : (
          <>
            <dt>Momentum</dt>
            <dd>{p.momentum ?? '—'}{p.momentum != null && <span className="muted" style={{ fontWeight: 400 }}> of 100</span>}</dd>
          </>
        )}
      </dl>
      <div className="pc-foot">
        {p.token && <CopyAddress address={p.token} href={`${CHAIN.explorer}/token/${p.token}`} />}
        <span className="spacer" />
        {p.launch?.version && <span>via Pons {p.launch.version.toUpperCase()}</span>}
        {x && (
          <a href={`https://x.com/${x}`} target="_blank" rel="noopener noreferrer nofollow">@{x}</a>
        )}
      </div>
    </li>
  );
}
