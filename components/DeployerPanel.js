import Link from 'next/link';
import { getDeployerHistory } from '@/lib/deployers';
import { getIndex } from '@/lib/data';
import { CHAIN, PONS_URL } from '@/lib/pons';
import { short } from '@/lib/format';

// How many Pons tokens this deployer has launched, and how many of them have a builder behind them.
export default async function DeployerPanel({ deployer, current }) {
  if (!deployer) return null;
  let hist;
  try {
    hist = await getDeployerHistory(deployer);
  } catch {
    return null;
  }
  const { projects } = await getIndex();
  const slugByToken = new Map(projects.filter((p) => p.token).map((p) => [p.token, p.slug]));
  const others = hist.launches.filter((l) => l.token !== current);
  const withBuilder = hist.launches.filter((l) => slugByToken.has(l.token)).length;
  const tone = hist.count >= 10 && withBuilder <= 1 ? 'warn' : hist.count <= 3 ? 'ok' : '';

  return (
    <div className="panel">
      <h2>Deployer history</h2>
      <p className={`dep-sum ${tone}`}>
        <a href={`${CHAIN.explorer}/address/${deployer}`} target="_blank" rel="noopener noreferrer">{short(deployer)}</a> has launched{' '}
        <strong>{hist.count}</strong> Pons token{hist.count === 1 ? '' : 's'}
        {hist.count > 1 && (
          <>
            , <strong>{withBuilder}</strong> with a builder page on Shiplog
          </>
        )}
        .
      </p>
      {tone === 'warn' && <p className="note">Many launches from one wallet with few builders behind them is a pattern worth checking before you trust a token.</p>}
      {others.length > 0 && (
        <ul className="dep-list">
          {others.slice(0, 6).map((l) => (
            <li key={l.token}>
              {slugByToken.has(l.token) ? (
                <Link href={`/project/${slugByToken.get(l.token)}`}>{short(l.token)}</Link>
              ) : (
                <a href={PONS_URL(l.token)} target="_blank" rel="noopener noreferrer">{short(l.token)}</a>
              )}
              <span className="muted small">Pons {l.version.toUpperCase()}, block {l.block.toLocaleString('en-US')}</span>
            </li>
          ))}
        </ul>
      )}
      {!hist.complete && <p className="note">Part of the history could not be read right now.</p>}
    </div>
  );
}
