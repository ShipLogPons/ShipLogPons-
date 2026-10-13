import { client, FACTORIES, scanRange, scanBackward, readMetaMany, readCurves, githubFromMeta, blockTimestamp } from './pons';
import { notifySignals } from './telegram';
import { marketsFor } from './market';
import { readJSON, writeJSON, hasStore } from './store';

const DAY_SECONDS = 86400;
// OwnershipTransferred(address,address): Ownable contracts emit it from address(0) when they are deployed.
const OWNERSHIP = '0x8be0079c531659141344cd1fd0a4f28419497f9722a3daafe3b4186f6b6457e0';
const ZERO_TOPIC = '0x' + '0'.repeat(64);
const hex = (n) => `0x${n.toString(16)}`;
const FEED_MAX = 1500;

function emptyState() {
  return {
    v: 1,
    anchor: null,
    secPerBlock: 0.1024,
    fwd: {},
    back: {},
    feed: [],
    builders: {},
    stats: { inspected: 0, runs: 0 },
    updatedAt: null,
  };
}

function compact(l, meta) {
  return {
    token: l.token,
    curve: l.curve,
    deployer: l.deployer,
    version: l.version,
    block: l.block,
    ts: l.ts || null,
    meta: meta || null,
  };
}

function toBuilder(item, gh) {
  return { ...item, github: gh, foundAt: Date.now() };
}

const SIGNALS_MAX = 300;

function addSignal(s, sig) {
  s.signals = s.signals || [];
  if (s.signals.some((x) => x.type === sig.type && x.token === sig.token && x.key === sig.key)) return null;
  const full = { ...sig, at: Date.now() };
  s.signals.unshift(full);
  s.signals = s.signals.slice(0, SIGNALS_MAX);
  return full;
}

function setBuilder(s, token, item, gh, fresh) {
  const isNew = !s.builders[token];
  s.builders[token] = { ...(s.builders[token] || {}), ...toBuilder(item, gh) };
  if (isNew && fresh) {
    const sig = addSignal(s, { type: 'builder', token, key: token });
    if (sig) fresh.push(sig);
  }
}

export function estimateTs(state, block) {
  if (!state?.anchor) return null;
  return Math.round(state.anchor.ts - (state.anchor.block - block) * state.secPerBlock);
}

// One indexing pass, bounded by budgetMs. Safe to call often: a lock prevents overlap.
export async function runIndexer({ budgetMs = 36000, force = false } = {}) {
  if (!hasStore()) return { ok: false, reason: 'no-store' };
  const t0 = Date.now();
  const deadline = () => Date.now() - t0 > budgetMs;

  const lock = await readJSON('lock.json', null);
  if (!force && lock && Date.now() - lock.at < 75000) return { ok: false, reason: 'locked' };
  await writeJSON('lock.json', { at: Date.now() });

  const s = (await readJSON('state.json', null)) || emptyState();
  const queueDoc = (await readJSON('queue.json', null)) || { items: [] };
  const report = { newLaunches: 0, inspected: 0, builders: 0, backfill: {} };
  const newSignals = [];

  // Anchor: block time from two real blocks.
  const latest = Number(await client.getBlockNumber());
  const [tsNow, tsPast] = await Promise.all([blockTimestamp(latest), blockTimestamp(latest - 1000000)]);
  if (tsNow && tsPast) s.secPerBlock = (tsNow - tsPast) / 1000000;
  if (tsNow) s.anchor = { block: latest, ts: tsNow };

  const known = new Set(s.feed.map((x) => x.token));
  const marks = [];
  const mark = (label) => marks.push(`${label} +${Date.now() - t0}ms`);
  mark('anchor');

  // 1. Forward: every new launch since the last pass goes into the feed.
  const fresh = [];
  for (const f of FACTORIES) {
    const startDefault = latest - Math.round(DAY_SECONDS / s.secPerBlock);
    const from = (s.fwd[f.address] ?? Math.max(f.start, startDefault)) + 1;
    if (from > latest) continue;
    const { launches, scannedTo } = await scanRange(f, from, latest, { deadline });
    s.fwd[f.address] = scannedTo;
    if (s.back[f.address] == null) s.back[f.address] = from - 1;
    for (const l of launches) if (!known.has(l.token)) fresh.push(l);
  }
  mark(`forward scanned, ${fresh.length} new`);
  fresh.sort((a, b) => b.block - a.block);
  report.newLaunches = fresh.length;
  const metaNow = await readMetaMany(fresh.slice(0, 150).map((l) => l.token), { deadline });
  for (const l of fresh) {
    l.ts = estimateTs(s, l.block);
    const meta = metaNow.get(l.token) || null;
    const item = compact(l, meta);
    s.feed.unshift(item);
    const gh = githubFromMeta(meta);
    if (gh.length) setBuilder(s, l.token, item, gh, newSignals);
  }
  s.feed.sort((a, b) => b.block - a.block);
  s.feed = s.feed.slice(0, FEED_MAX);

  mark('forward meta');
  // 2. Fill metadata for feed items that missed it.
  const missing = s.feed.filter((x) => !x.meta).slice(0, 200);
  if (missing.length && !deadline()) {
    const m = await readMetaMany(missing.map((x) => x.token), { deadline });
    for (const x of missing) {
      if (!m.has(x.token)) continue;
      x.meta = m.get(x.token);
      const gh = githubFromMeta(x.meta);
      if (gh.length) setBuilder(s, x.token, x, gh, newSignals);
    }
  }

  mark('feed meta');
  // 3. Backfill history: older launches are checked once for a GitHub link; only builders are kept.
  // It stops a few seconds early so the chain checks below always get their turn.
  const backfillDeadline = () => Date.now() - t0 > budgetMs - 5000;
  while (!backfillDeadline()) {
    if (!queueDoc.items.length) {
      const f = FACTORIES.find((x) => (s.back[x.address] ?? latest) >= x.start);
      if (!f) break;
      const to = s.back[f.address] ?? latest;
      const { launches, scannedFrom } = await scanBackward(f, f.start, to, { deadline, wantAtLeast: 300 });
      s.back[f.address] = scannedFrom - 1;
      launches.sort((a, b) => b.block - a.block);
      queueDoc.items.push(...launches.filter((l) => !known.has(l.token) && !s.builders[l.token]));
      if (!launches.length && scannedFrom > f.start) break;
      continue;
    }
    const batch = queueDoc.items.splice(0, 300);
    const m = await readMetaMany(batch.map((l) => l.token), { deadline, infoOnly: true });
    const unread = batch.filter((l) => !m.has(l.token));
    queueDoc.items.unshift(...unread);
    report.inspected += batch.length - unread.length;
    const hits = batch.filter((l) => m.has(l.token) && githubFromMeta(m.get(l.token)).length);
    const full = hits.length ? await readMetaMany(hits.map((l) => l.token)) : new Map();
    for (const l of hits) {
      const meta = full.get(l.token) || m.get(l.token);
      l.ts = estimateTs(s, l.block);
      setBuilder(s, l.token, compact(l, meta), githubFromMeta(meta), null);
      report.builders++;
    }
  }
  for (const f of FACTORIES) {
    const span = Math.max(1, latest - f.start);
    report.backfill[f.version + ':' + f.address.slice(0, 6)] = Math.round(((latest - Math.max(f.start, s.back[f.address] ?? latest)) / span) * 100);
  }

  mark(`backfill, inspected ${report.inspected}`);
  // 4. Curve progress for builders and the newest launches; graduation becomes a signal.
  const builders = Object.values(s.builders);
  const curveTargets = [
    ...builders.filter((x) => x.version === 'v2' && x.curveState?.phase !== 2 && (x.curveState?.at || 0) < Date.now() - 20 * 60000),
    ...s.feed.filter((x) => x.version === 'v2').slice(0, 120),
  ];
  const curves = await readCurves([...new Set(curveTargets.map((x) => x.token))], { deadline: () => Date.now() - t0 > budgetMs + 7000 });
  for (const b of builders) {
    const c = curves.get(b.token);
    if (!c) continue;
    if (c.phase === 2 && b.curveState && b.curveState.phase !== 2) {
      const sig = addSignal(s, { type: 'graduated', token: b.token, key: 'grad' });
      if (sig) newSignals.push(sig);
    }
    b.curveState = c;
    b.phase = c.phase;
  }
  for (const f of s.feed) {
    const c = curves.get(f.token);
    if (c) f.curveState = c;
  }
  // 5. Deployer wallets of builders: selling under half of the peak holding becomes a signal.
  // Tokens the deployer burns (sent to 0x0 / 0x…dEaD, or burned so supply drops) do not count as selling,
  // and a burn of at least 0.5% of supply becomes its own signal.
  const DEAD_WORDS = ['0'.repeat(64), '0'.repeat(60) + 'dead'];
  const devTargets = builders
    .filter((x) => x.deployer)
    .sort((a, b) => (a.dev?.at || 0) - (b.dev?.at || 0))
    .slice(0, 60);
  const big = (r) => (r && r !== '0x' ? BigInt(r) : 0n);
  const pctOf = (v, sup) => Number((v * 100000n) / sup) / 1000;
  for (let i = 0; i < devTargets.length && Date.now() - t0 < budgetMs + 10000; i += 15) {
    const part = devTargets.slice(i, i + 15);
    const calls = part.flatMap((b) => [
      { method: 'eth_call', params: [{ to: b.token, data: '0x70a08231' + b.deployer.slice(2).padStart(64, '0') }, 'latest'] },
      { method: 'eth_call', params: [{ to: b.token, data: '0x18160ddd' }, 'latest'] },
      ...DEAD_WORDS.map((w) => ({ method: 'eth_call', params: [{ to: b.token, data: '0x70a08231' + w }, 'latest'] })),
    ]);
    const res = await Promise.all(calls.map((c) => client.request(c).catch(() => null)));
    part.forEach((b, k) => {
      const [balRaw, supRaw, z, d] = res.slice(k * 4, k * 4 + 4);
      if (!balRaw || !supRaw || big(supRaw) === 0n) return;
      const bal = big(balRaw);
      const sup = big(supRaw);
      const dead = big(z) + big(d);
      const pct = pctOf(bal, sup);
      const prev = b.dev || {};
      const peak = Math.max(prev.peak || 0, pct);
      let sold = prev.sold || 0;
      let burnt = prev.burnt || 0;
      let burnNow = 0;
      if (prev.bal != null && prev.sup != null && prev.dead != null) {
        const prevBal = BigInt(prev.bal);
        if (bal < prevBal) {
          const drop = prevBal - bal;
          let burnGain = dead - BigInt(prev.dead) + (BigInt(prev.sup) - sup);
          if (burnGain < 0n) burnGain = 0n;
          const burnPart = burnGain < drop ? burnGain : drop;
          burnNow = pctOf(burnPart, sup);
          burnt += burnNow;
          sold += pctOf(drop - burnPart, sup);
        }
      } else if (prev.pct != null && pct < prev.pct) {
        sold += prev.pct - pct; // no burn baseline yet: older records
      }
      const next = { pct, peak, sold, burnt, bal: bal.toString(), sup: sup.toString(), dead: dead.toString(), at: Date.now(), soldSignal: !!prev.soldSignal };
      if (burnNow >= 0.5) {
        const sig = addSignal(s, { type: 'devburn', token: b.token, key: `devburn-${next.dead}-${next.sup}`, title: `Deployer burned ${Math.round(burnNow * 1000) / 1000}% of supply` });
        if (sig) newSignals.push(sig);
      }
      if (peak >= 1 && sold >= peak / 2 && !next.soldSignal) {
        const sig = addSignal(s, { type: 'devsold', token: b.token, key: 'devsold', title: `Deployer wallet sold ${Math.round(sold * 1000) / 1000}% of supply, from a peak of ${peak}%` });
        if (sig) newSignals.push(sig);
        next.soldSignal = true;
      }
      b.dev = next;
    });
  }
  mark('dev wallets');

  // 6. New contracts from builder wallets: Ownable contracts whose first owner is a builder's deployer.
  const byDeployer = new Map();
  for (const b of builders) {
    if (!b.deployer) continue;
    if (!byDeployer.has(b.deployer)) byDeployer.set(b.deployer, []);
    byDeployer.get(b.deployer).push(b);
  }
  const deployers = [...byDeployer.keys()];
  if (deployers.length) {
    s.deployScan = s.deployScan || {};
    const firstScan = s.deployScan.to == null;
    const skip = new Set([...Object.keys(s.builders), ...s.feed.map((f) => f.token), ...builders.map((b) => b.curve).filter(Boolean)]);
    const factories = new Set(FACTORIES.map((f) => f.address.toLowerCase()));
    let from = Math.max((s.deployScan.to ?? latest - 300000) + 1, latest - 900000);
    while (from <= latest && Date.now() - t0 < budgetMs + 13000) {
      const to = Math.min(latest, from + 29999);
      let ok = true;
      for (let i = 0; i < deployers.length && ok; i += 50) {
        const part = deployers.slice(i, i + 50).map((d) => '0x' + d.slice(2).padStart(64, '0'));
        try {
          const logs = await client.request({ method: 'eth_getLogs', params: [{ topics: [OWNERSHIP, ZERO_TOPIC, part], fromBlock: hex(from), toBlock: hex(to) }] });
          for (const l of logs) {
            const addr = l.address.toLowerCase();
            if (skip.has(addr)) continue;
            // A Pons launch also creates Ownable contracts; those are not new work.
            const tx = await client.request({ method: 'eth_getTransactionByHash', params: [l.transactionHash] }).catch(() => null);
            if (tx?.to && factories.has(tx.to.toLowerCase())) continue;
            const dep = ('0x' + l.topics[2].slice(26)).toLowerCase();
            const block = parseInt(l.blockNumber, 16);
            for (const b of byDeployer.get(dep) || []) {
              b.contracts = b.contracts || [];
              if (b.contracts.some((c) => c.address === addr)) continue;
              b.contracts.unshift({ address: addr, block, ts: estimateTs(s, block), tx: l.transactionHash });
              b.contracts = b.contracts.slice(0, 20);
              report.contracts = (report.contracts || 0) + 1;
              if (!firstScan) {
                const sig = addSignal(s, { type: 'contract', token: b.token, key: addr, title: `Deployed contract ${addr.slice(0, 6)}…${addr.slice(-4)}` });
                if (sig) newSignals.push(sig);
              }
            }
          }
        } catch {
          ok = false;
        }
      }
      if (!ok) break;
      s.deployScan.to = to;
      from = to + 1;
    }
  }
  mark('contracts');

  // 7. Liquidity: a pool that held real money and then emptied becomes a signal.
  if (Date.now() - t0 < budgetMs + 15000 && Date.now() - (s.liqAt || 0) > 15 * 60000) {
    try {
      const markets = await marketsFor(builders.map((b) => b.token));
      s.liqAt = Date.now();
      for (const b of builders) {
        const m = markets.get(b.token);
        const now = m ? m.liquidity || 0 : 0;
        const prev = b.liq || { max: 0, gone: false };
        const max = Math.max(prev.max || 0, now);
        let gone = prev.gone;
        if (max >= 1000 && now < 50 && !gone) {
          gone = true;
          const sig = addSignal(s, { type: 'liqgone', token: b.token, key: `liq-${Date.now()}`, title: `Liquidity fell from $${Math.round(max).toLocaleString('en-US')} to $${Math.round(now)}` });
          if (sig) newSignals.push(sig);
        } else if (gone && now >= max / 2) {
          gone = false;
        }
        b.liq = { max, last: now, gone };
      }
    } catch {
      /* market data is best effort */
    }
  }
  mark('liquidity');

  for (const b of builders.filter((x) => !x.tsExact).slice(0, 20)) {
    if (Date.now() - t0 > budgetMs + 8000) break;
    const ts = await blockTimestamp(b.block);
    if (ts) {
      b.ts = ts;
      b.tsExact = true;
    }
  }

  s.stats.inspected = (s.stats.inspected || 0) + report.inspected + fresh.length;
  s.stats.runs = (s.stats.runs || 0) + 1;
  s.stats.queue = queueDoc.items.length;
  s.stats.backfill = report.backfill;
  s.updatedAt = new Date().toISOString();

  if (newSignals.length) {
    try {
      await notifySignals(newSignals, s);
    } catch {
      /* notifications are best effort */
    }
  }
  mark('saving');
  await writeJSON('queue.json', queueDoc);
  await writeJSON('state.json', s);
  await writeJSON('lock.json', { at: 0 });

  return { ok: true, ...report, newBuilders: report.builders, ms: Date.now() - t0, latest, feed: s.feed.length, builders: Object.keys(s.builders).length, queue: queueDoc.items.length, signals: newSignals.length, contracts: report.contracts || 0, marks };
}
