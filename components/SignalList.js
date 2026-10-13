import Link from 'next/link';
import { ago } from '@/lib/format';
import { Avatar } from './ProjectRow';

export const SIGNAL_LABEL = {
  builder: { label: 'New builder', note: 'A Pons token linked a GitHub repo for the first time.' },
  graduated: { label: 'Graduated', note: 'The bonding curve filled and the token moved to its DEX pool.' },
  major: { label: 'Major release', note: 'A new major version, like v1.0.0 or v2.0.0.' },
  spike: { label: 'Development spike', note: 'At least twice as many real commits as the week before.' },
  resumed: { label: 'Back to building', note: 'Shipping again after more than 60 quiet days.' },
  contract: { label: 'New contract', note: 'The builder wallet deployed a new contract on Robinhood Chain.' },
  quiet: { label: 'Went quiet', note: 'No real work for 30 days.' },
  liqgone: { label: 'Liquidity gone', note: 'A pool that held real money is now close to empty. A fact, not a judgment.' },
  devburn: { label: 'Dev burned', note: 'The deployer sent its own tokens to a burn address.' },
  devsold: { label: 'Dev sold', note: 'The deployer wallet sold more than half of its peak holding. Burns do not count.' },
  copycat: { label: 'Copycats', note: 'Other Pons tokens link the same repository.' },
};

export default function SignalList({ signals }) {
  return (
    <ul className="sig-list">
      {signals.map((s, i) => (
        <li key={`${s.type}-${s.slug}-${s.date}-${i}`} className={`sig sig-${s.type}`}>
          <span className="sig-kind">{SIGNAL_LABEL[s.type]?.label || s.type}</span>
          <span className="sig-main">
            <Link href={s.type === 'copycat' ? '/copycats' : `/project/${s.slug}`} className="log-project">
              <Avatar src={s.avatar || null} name={s.name} size={20} />
              {s.name}
              {s.symbol && <span className="prow-sym">${s.symbol}</span>}
            </Link>
            <span className="small">
              {s.title ? (
                s.url ? (
                  <a href={s.url} target="_blank" rel="noopener noreferrer">{s.title}</a>
                ) : (
                  s.title
                )
              ) : (
                <span className="muted">{SIGNAL_LABEL[s.type]?.note}</span>
              )}
            </span>
          </span>
          <span className="sig-when muted small">{ago(s.date)}</span>
        </li>
      ))}
    </ul>
  );
}
