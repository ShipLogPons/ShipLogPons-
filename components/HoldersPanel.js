import { getHolders, DEV_STATUS } from '@/lib/holders';
import { CHAIN } from '@/lib/pons';
import { short } from '@/lib/format';

const fmt = (n) => (n == null ? '—' : n >= 10 ? `${n.toFixed(1)}%` : n >= 0.01 ? `${n.toFixed(2)}%` : n > 0 ? '<0.01%' : '0%');

// Deployer wallet behaviour and holder concentration, rebuilt from on-chain Transfer events.
export default async function HoldersPanel({ token, launch, pool }) {
  let h = null;
  try {
    h = await getHolders(token, { block: launch?.block, deployer: launch?.deployer, curve: launch?.curve, pool });
  } catch {
    h = null;
  }
  if (!h) {
    return (
      <div className="panel">
        <h2>Dev wallet and holders</h2>
        <p className="muted">The chain did not answer right now. Try again in a few minutes.</p>
      </div>
    );
  }
  const d = h.dev;
  const st = d ? DEV_STATUS[d.status] : null;
  const wallets = h.top.filter((x) => !x.label || x.label === 'Deployer').length;
  const few = h.holders <= 12;
  const conc = few ? '' : h.top10Pct >= 60 ? 'warn' : h.top10Pct <= 30 ? 'ok' : '';

  return (
    <>
      {d && (
        <div className="panel">
          <h2>Dev wallet</h2>
          <p className={`dev-status ${st.tone}`}>{st.label}</p>
          <dl className="facts">
            <dt>Holds now</dt>
            <dd>{fmt(d.nowPct)} of supply</dd>
            <dt>Most it held</dt>
            <dd>{fmt(d.peakPct)}</dd>
            <dt>Sold</dt>
            <dd className={d.soldPct > 0 ? 'down' : ''}>{fmt(d.soldPct)}</dd>
            {d.burnedPct > 0 && (
              <>
                <dt>Burned</dt>
                <dd>{fmt(d.burnedPct)}</dd>
              </>
            )}
            <dt>Sent to wallets</dt>
            <dd>{fmt(d.movedPct)}</dd>
          </dl>
          {d.peakPct > 0 && (
            <div className="devbar" aria-hidden="true">
              <span style={{ width: `${Math.min(100, ((d.nowPct + (d.burnedPct || 0)) / d.peakPct) * 100)}%` }} />
            </div>
          )}
          {d.movedTo.length > 0 && d.movedPct >= 0.5 && (
            <p className="note">
              Tokens sent to other wallets can be sold from there. Largest:{' '}
              {d.movedTo.map((m, i) => (
                <span key={m.address}>
                  {i > 0 && ', '}
                  <a href={`${CHAIN.explorer}/address/${m.address}`} target="_blank" rel="noopener noreferrer">{short(m.address)}</a> ({fmt(m.pct)})
                </span>
              ))}
              .
            </p>
          )}
          <p className="note">{st.note} Sells count transfers to the Pons curve, the DEX pool and other contracts. Transfers to 0x0 or 0x…dEaD count as burned.</p>
        </div>
      )}

      <div className="panel">
        <h2>Holders</h2>
        <p className={`dev-status ${conc}`}>
          {wallets === 0 ? 'No wallet holds this token yet' : `Top 10 wallets hold ${fmt(h.top10Pct)} of circulating supply`}
        </p>
        <ul className="holder-list">
          {h.top.map((x) => (
            <li key={x.address}>
              <a href={`${CHAIN.explorer}/address/${x.address}`} target="_blank" rel="noopener noreferrer">{short(x.address)}</a>
              {x.label && <span className="hl-tag">{x.label}</span>}
              <span className="hl-bar" aria-hidden="true">
                <span style={{ width: `${Math.min(100, x.pct)}%` }} />
              </span>
              <span className="num small">{fmt(x.pct)}</span>
            </li>
          ))}
        </ul>
        <p className="note">
          {h.holders.toLocaleString('en-US')} holders from {h.transfers.toLocaleString('en-US')} transfers. Circulating supply leaves out the Pons
          curve, the DEX pool and burned tokens ({fmt(h.circulatingPct)} of supply circulates).
          {few && wallets > 0 && ` Only ${wallets} wallet${wallets === 1 ? '' : 's'} hold${wallets === 1 ? 's' : ''} this token so far, so concentration is high by nature.`}
          {h.partial && ' The transfer history was too long to read in full, so these numbers are partial.'}
        </p>
      </div>
    </>
  );
}
