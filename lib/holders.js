import { unstable_cache } from 'next/cache';
import { client, findLaunch } from './pons';

const TRANSFER = '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef';
const ZERO = '0x0000000000000000000000000000000000000000';
const DEAD = new Set([ZERO, '0x000000000000000000000000000000000000dead']);
const MAX_LOGS = 60000;
const addr = (t) => ('0x' + (t || '').slice(26)).toLowerCase();
const hex = (n) => `0x${n.toString(16)}`;
const share = (part, whole) => (whole > 0n ? Number((part * 100000n) / whole) / 1000 : 0);

// Every Transfer log of one token, oldest first. Ranges that return too many results are split.
async function transferLogs(token, from, to, deadline) {
  const out = [];
  let partial = false;
  const stack = [];
  for (let end = to; end >= from; end -= 10000000) stack.unshift([Math.max(from, end - 9999999), end]);
  while (stack.length) {
    if (deadline() || out.length >= MAX_LOGS) {
      partial = true;
      break;
    }
    const [a, b] = stack.shift();
    try {
      const logs = await client.request({ method: 'eth_getLogs', params: [{ address: token, topics: [TRANSFER], fromBlock: hex(a), toBlock: hex(b) }] });
      out.push(...logs);
    } catch (e) {
      if (b - a < 200) {
        partial = true;
        continue;
      }
      const mid = Math.floor((a + b) / 2);
      stack.unshift([a, mid], [mid + 1, b]);
    }
  }
  return { logs: out, partial };
}

async function isContract(addresses) {
  const list = [...new Set(addresses)];
  const out = new Set();
  for (let i = 0; i < list.length; i += 30) {
    const part = list.slice(i, i + 30);
    const res = await Promise.all(part.map((a) => client.request({ method: 'eth_getCode', params: [a, 'latest'] }).catch(() => null)));
    part.forEach((a, k) => {
      const code = res[k];
      if (code && code !== '0x') out.add(a);
    });
  }
  return out;
}

// Holder distribution and what the deployer wallet did, rebuilt from the token's Transfer history.
export async function readHolders(token, { block, deployer, curve, pool, budgetMs = 20000 } = {}) {
  const t0 = Date.now();
  const deadline = () => Date.now() - t0 > budgetMs;
  token = token.toLowerCase();
  if (!block || !deployer) {
    const l = await findLaunch(token);
    if (!l) return null;
    block = l.block;
    deployer = l.deployer;
    curve = curve || l.curve;
  }
  deployer = deployer?.toLowerCase() || null;
  curve = curve?.toLowerCase() || null;
  pool = pool?.toLowerCase() || null;

  const latest = Number(await client.getBlockNumber());
  const [{ logs, partial }, supplyRes] = await Promise.all([
    transferLogs(token, block, latest, deadline),
    client.request({ method: 'eth_call', params: [{ to: token, data: '0x18160ddd' }, 'latest'] }).catch(() => null),
  ]);
  const supply = supplyRes && supplyRes !== '0x' ? BigInt(supplyRes) : 0n;

  const bal = new Map();
  const add = (a, v) => bal.set(a, (bal.get(a) || 0n) + v);
  let devBal = 0n;
  let devPeak = 0n;
  let devIn = 0n;
  const devOut = new Map();
  for (const l of logs) {
    const from = addr(l.topics[1]);
    const to = addr(l.topics[2]);
    const v = l.data && l.data !== '0x' ? BigInt(l.data) : 0n;
    if (from !== ZERO) add(from, -v);
    add(to, v);
    if (deployer && to === deployer && from !== deployer) {
      devBal += v;
      devIn += v;
      if (devBal > devPeak) devPeak = devBal;
    }
    if (deployer && from === deployer && to !== deployer) {
      devBal -= v;
      devOut.set(to, (devOut.get(to) || 0n) + v);
    }
  }

  const holders = [...bal.entries()].filter(([a, v]) => v > 0n && !DEAD.has(a));
  holders.sort((a, b) => (b[1] > a[1] ? 1 : b[1] < a[1] ? -1 : 0));
  const outTargets = [...devOut.keys()].filter((a) => a !== curve && a !== pool).slice(0, 30);
  const contracts = await isContract([...holders.slice(0, 25).map(([a]) => a), ...outTargets]);

  const label = (a) =>
    a === curve ? 'Pons curve' : a === pool ? 'DEX pool' : a === deployer ? 'Deployer' : a === token ? 'Token contract' : contracts.has(a) ? 'Contract' : null;
  const locked = holders.filter(([a]) => a === curve || a === pool || a === token).reduce((s, [, v]) => s + v, 0n);
  const burned = [...DEAD].reduce((s, a) => s + (bal.get(a) > 0n ? bal.get(a) : 0n), 0n);
  const circulating = supply > locked + burned ? supply - locked - burned : 0n;
  const wallets = holders.filter(([a]) => !label(a) || a === deployer);
  const top10 = wallets.slice(0, 10).reduce((s, [, v]) => s + v, 0n);

  let sold = 0n;
  let moved = 0n;
  let devBurned = 0n;
  for (const [to, v] of devOut) {
    if (DEAD.has(to)) devBurned += v;
    else if (to === curve || to === pool || contracts.has(to)) sold += v;
    else moved += v;
  }
  const devNow = deployer ? bal.get(deployer) || 0n : 0n;
  let devStatus = 'never';
  if (devPeak > 0n) {
    const left = Number((devNow * 1000n) / devPeak) / 10;
    // Burned tokens can never be sold, so they count as kept for the status.
    const kept = Number(((devNow + devBurned) * 1000n) / devPeak) / 10;
    devStatus = kept >= 90 ? (left < 90 ? 'burned' : 'holding') : kept >= 50 ? 'some' : kept > 2 ? 'most' : 'exited';
  }

  return {
    at: new Date().toISOString(),
    partial,
    transfers: logs.length,
    holders: holders.length,
    supplyKnown: supply > 0n,
    circulatingPct: share(circulating, supply),
    top10Pct: share(top10, circulating),
    top10OfSupply: share(top10, supply),
    top: holders.slice(0, 10).map(([a, v]) => ({ address: a, pct: share(v, supply), label: label(a) })),
    dev: deployer
      ? {
          address: deployer,
          nowPct: share(devNow, supply),
          peakPct: share(devPeak, supply),
          inPct: share(devIn, supply),
          soldPct: share(sold, supply),
          movedPct: share(moved, supply),
          burnedPct: share(devBurned, supply),
          status: devStatus,
          movedTo: [...devOut.entries()]
            .filter(([a]) => !(a === curve || a === pool || contracts.has(a)))
            .sort((a, b) => (b[1] > a[1] ? 1 : -1))
            .slice(0, 3)
            .map(([a, v]) => ({ address: a, pct: share(v, supply) })),
        }
      : null,
  };
}

// Cached for 30 minutes per token, since a full Transfer history can take several seconds to read.
export const getHolders = (token, opts = {}) =>
  unstable_cache(() => readHolders(token, opts), ['holders-v1', token.toLowerCase()], { revalidate: 1800 })();

export const DEV_STATUS = {
  burned: { label: 'Burned its tokens', tone: 'ok', note: 'The deployer burned what it let go of. Burned tokens can never be sold.' },
  holding: { label: 'Still holding', tone: 'ok', note: 'The deployer still holds at least 90% of the most it ever held.' },
  some: { label: 'Sold some', tone: '', note: 'The deployer has let go of between 10% and 50% of its peak holding.' },
  most: { label: 'Sold most', tone: 'warn', note: 'The deployer has let go of more than half of its peak holding.' },
  exited: { label: 'Fully out', tone: 'warn', note: 'The deployer wallet holds almost nothing of what it once held.' },
  never: { label: 'Never held', tone: '', note: 'The deployer wallet never bought or received this token.' },
};
