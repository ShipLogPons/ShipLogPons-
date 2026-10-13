import Link from 'next/link';
import { Avatar } from './ProjectRow';
import { agoTs, socialLinks } from '@/lib/format';
import { PONS_URL } from '@/lib/pons';
import CurveBar from './CurveBar';

export default function TokenTile({ t }) {
  const links = socialLinks(t.socials);
  return (
    <li className="tile">
      <div className="tile-top">
        <Avatar src={t.logo} name={t.name || t.symbol || t.token.slice(2, 4)} size={38} />
        <div className="tile-id">
          <span className="tile-name">{t.name || 'Unnamed token'}</span>
          <span className="tile-sym">{t.symbol ? `$${t.symbol}` : t.token.slice(0, 10)}, {agoTs(t.ts)}</span>
        </div>
      </div>
      <p className="tile-desc">{t.description || 'No description on chain.'}</p>
      <CurveBar progress={t.progress} phase={t.phase} compact />
      <div className="tile-foot">
        <span className="socials">
          {links.map((l) => (
            <a key={l.key} className={`soc${l.key === 'gh' ? ' gh' : ''}`} href={l.url} target="_blank" rel="noopener noreferrer nofollow">
              {l.label}
            </a>
          ))}
          {!links.length && <span className="muted">No links</span>}
        </span>
        {t.builder ? (
          <Link className="badge-gh" href={`/project/${t.builder}`}>Builder page</Link>
        ) : (
          <a className="small" href={PONS_URL(t.token)} target="_blank" rel="noopener noreferrer">Pons</a>
        )}
      </div>
    </li>
  );
}
