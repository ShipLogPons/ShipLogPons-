'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Flag from '@/components/Flag';
import CurveBar from '@/components/CurveBar';

const fmtUsd = (n) =>
  n == null ? '—' : n >= 1e6 ? `$${(n / 1e6).toFixed(1)}M` : n >= 1e3 ? `$${(n / 1e3).toFixed(1)}K` : `$${Number(n).toFixed(0)}`;

const DEV = {
  holding: ['Still holding', 'ok'],
  some: ['Sold some', ''],
  most: ['Sold most', 'warn'],
  exited: ['Fully out', 'warn'],
  never: ['Never held', ''],
};
const p2 = (n) => (n == null ? '—' : n >= 10 ? `${n.toFixed(1)}%` : n >= 0.01 ? `${n.toFixed(2)}%` : n > 0 ? '<0.01%' : '0%');

const IDENTITY = {
  verified: 'Verified: the repository’s README contains this token’s address.',
  metadata: 'Linked by the token’s own on-chain metadata. Not verified by a submission yet.',
  none: 'No repository is tied to this token.',
};

export default function ScanForm({ initial = '' }) {
  const [value, setValue] = useState(initial);
  const [state, setState] = useState({ loading: false, error: '', data: null });

  async function run(address) {
    setState({ loading: true, error: '', data: null });
    try {
      const res = await fetch(`/api/scan?address=${encodeURIComponent(address.trim())}`);
      const json = await res.json();
      if (!res.ok) setState({ loading: false, error: json.error || 'Scan failed. Try again.', data: null });
      else setState({ loading: false, error: '', data: json });
    } catch {
      setState({ loading: false, error: 'Scan could not reach Shiplog. Check your connection and try again.', data: null });
    }
  }

  useEffect(() => {
    if (initial) run(initial);
  }, [initial]);

  const d = state.data;
  return (
    <>
      <form
        className="search"
        onSubmit={(e) => {
          e.preventDefault();
          run(value);
        }}
        style={{ maxWidth: '38rem' }}
      >
        <label htmlFor="addr" className="sr">Token address</label>
        <input id="addr" value={value} onChange={(e) => setValue(e.target.value)} placeholder="0x…" spellCheck={false} autoComplete="off" required />
        <button type="submit" disabled={state.loading}>{state.loading ? 'Scanning…' : 'Scan'}</button>
      </form>
      {state.error && <p className="error" role="alert">{state.error}</p>}

      {d && (
        <div aria-live="polite">
          <div className={`verdict ${d.verdict.level === 'strong' ? '' : d.verdict.level}`}>
            <h2>{d.verdict.title}</h2>
            <p>{d.verdict.text}</p>
          </div>

          <div className="scan-result">
            <div className="panel">
              <h2>The token</h2>
              {d.token ? (
                <>
                  <p style={{ margin: '0 0 8px', fontWeight: 650 }}>
                    {d.token.name || 'Unnamed'} {d.token.symbol && <span className="muted">${d.token.symbol}</span>}
                  </p>
                  {d.token.description && <p className="small muted" style={{ margin: '0 0 10px', overflowWrap: 'anywhere' }}>{d.token.description}</p>}
                </>
              ) : (
                <p className="muted">No token data on chain.</p>
              )}
              {d.launch && (
                <dl className="facts">
                  <dt>Launchpad</dt>
                  <dd>Pons {d.launch.version.toUpperCase()}</dd>
                  {d.launch.ts && (
                    <>
                      <dt>Launched</dt>
                      <dd>{new Date(d.launch.ts * 1000).toISOString().slice(0, 10)}</dd>
                    </>
                  )}
                  {d.launch.phase && (
                    <>
                      <dt>Curve</dt>
                      <dd>{d.launch.phase}</dd>
                    </>
                  )}
                  {d.deployer && (
                    <>
                      <dt>Deployer</dt>
                      <dd>
                        {d.deployer.count} Pons launch{d.deployer.count === 1 ? '' : 'es'}
                        {d.deployer.count > 1 ? `, ${d.deployer.withRepo} with a builder` : ''}
                      </dd>
                    </>
                  )}
                </dl>
              )}
              {d.launch && (d.launch.progress != null || d.launch.phase === 'Graduated') && (
                <div style={{ marginTop: 12 }}>
                  <CurveBar progress={d.launch.progress} phase={d.launch.phase === 'Graduated' ? 2 : 0} />
                </div>
              )}
              {d.deployer && d.deployer.count >= 10 && d.deployer.withRepo <= 1 && (
                <p className="note dep-warn">This wallet has launched many tokens with almost no builder behind them.</p>
              )}
              <p className="note">
                <a href={d.pons} target="_blank" rel="noopener noreferrer">Pons page</a>, <a href={d.explorer} target="_blank" rel="noopener noreferrer">explorer</a>
              </p>
            </div>

            <div className="panel">
              <h2>Who builds it</h2>
              <p style={{ margin: '0 0 10px' }}>{IDENTITY[d.identity]}</p>
              {d.builder && (
                <>
                  <p style={{ margin: '0 0 8px' }}>
                    <Flag status={d.builder.status} withLabel />
                  </p>
                  <dl className="facts">
                    <dt>Momentum</dt>
                    <dd>{d.builder.momentum == null ? 'not measured' : `${d.builder.momentum} of 100`}</dd>
                    {d.builder.repos?.map((r) => (
                      <div key={r} style={{ display: 'contents' }}>
                        <dt>Repo</dt>
                        <dd><a href={`https://github.com/${r}`} target="_blank" rel="noopener noreferrer">{r}</a></dd>
                      </div>
                    ))}
                  </dl>
                  {d.builder.lastShip && (
                    <p className="note">
                      Last ship: <a href={d.builder.lastShip.url} target="_blank" rel="noopener noreferrer">{d.builder.lastShip.title}</a>
                    </p>
                  )}
                  {d.builder.slug && <p className="note"><Link href={`/project/${d.builder.slug}`}>Open the builder page</Link></p>}
                </>
              )}
              {!d.builder && (
                <p className="note">
                  Is this your token? <Link href="/submit">Submit your repo</Link> to get it verified.
                </p>
              )}
            </div>

            {d.holders && (
              <div className="panel">
                <h2>Dev wallet and holders</h2>
                {d.holders.dev && (
                  <>
                    <p className={`dev-status ${DEV[d.holders.dev.status][1]}`}>Deployer: {DEV[d.holders.dev.status][0]}</p>
                    <dl className="facts">
                      <dt>Holds now</dt>
                      <dd>{p2(d.holders.dev.nowPct)}</dd>
                      <dt>Most it held</dt>
                      <dd>{p2(d.holders.dev.peakPct)}</dd>
                      <dt>Sold</dt>
                      <dd>{p2(d.holders.dev.soldPct)}</dd>
                      <dt>Sent to wallets</dt>
                      <dd>{p2(d.holders.dev.movedPct)}</dd>
                    </dl>
                  </>
                )}
                <p className={`dev-status ${d.holders.top10Pct >= 60 ? 'warn' : d.holders.top10Pct <= 30 ? 'ok' : ''}`} style={{ marginTop: 12 }}>
                  Top 10 wallets: {p2(d.holders.top10Pct)} of circulating supply
                </p>
                <p className="note">
                  {d.holders.holders.toLocaleString('en-US')} holders.{d.holders.partial && ' Partial: the transfer history was too long to read in full.'}
                </p>
              </div>
            )}

            <div className="panel">
              <h2>Market</h2>
              {d.market ? (
                <dl className="facts">
                  <dt>Valuation</dt>
                  <dd>{fmtUsd(d.market.fdv)}</dd>
                  <dt>Liquidity</dt>
                  <dd>{fmtUsd(d.market.liquidity)}</dd>
                  <dt>Volume 24h</dt>
                  <dd>{fmtUsd(d.market.volume24)}</dd>
                </dl>
              ) : (
                <p className="muted">No DEX market yet. The token may still be on its Pons curve.</p>
              )}
              <p className="note">Context only, never part of the verdict.</p>
            </div>
          </div>

          <p className="note">
            Read: {d.seen.join(', ') || 'nothing'}.{d.blind.length > 0 && <> Not seen: {d.blind.join('; ')}.</>} A blind spot
            means Shiplog could not see something, not that it is missing.
          </p>
        </div>
      )}
    </>
  );
}
