import { unstable_cache } from 'next/cache';
import { FACTORIES, client, parseLaunch, readMetaMany } from '@/lib/pons';

// The official Shiplog token: launched on Pons by this deployer with this ticker.
// The footer shows its contract address as soon as it exists on chain.
export const OFFICIAL = {
  deployer: '0xE63894B1c80a68300E6101Eb498eA6458A3D7d44',
  name: 'ShipLogPons',
  symbol: 'SHIPLOG',
};

async function lookup() {
  const d = '0x' + OFFICIAL.deployer.toLowerCase().slice(2).padStart(64, '0');
  const latest = Number(await client.getBlockNumber());
  const launches = [];
  for (const f of FACTORIES) {
    const topics = f.version === 'v2' ? [f.topic, null, null, d] : [f.topic, null, d];
    for (let to = latest; to >= f.start; to -= 10000000) {
      const from = Math.max(f.start, to - 9999999);
      const logs = await client.request({
        method: 'eth_getLogs',
        params: [{ address: f.address, topics, fromBlock: `0x${from.toString(16)}`, toBlock: `0x${to.toString(16)}` }],
      });
      for (const l of logs) launches.push(parseLaunch(l, f));
    }
  }
  if (!launches.length) return null;
  const meta = await readMetaMany(launches.map((l) => l.token), { pause: 0 });
  const want = OFFICIAL.symbol.toLowerCase();
  const matches = launches
    .filter((l) => (meta.get(l.token)?.symbol || '').replace(/^\$/, '').toLowerCase() === want)
    .sort((a, b) => a.block - b.block);
  if (!matches.length) return null;
  // Prefer the one with the expected name; otherwise the first launch with the ticker.
  const named = matches.find((l) => (meta.get(l.token)?.name || '').toLowerCase() === OFFICIAL.name.toLowerCase());
  const pick = named || matches[0];
  return { address: pick.token, name: meta.get(pick.token)?.name || OFFICIAL.name, symbol: OFFICIAL.symbol };
}

const cached = unstable_cache(lookup, ['shiplog-official-ca-v1'], { revalidate: 120 });

// The official token, or null before launch or if the chain could not be read.
export async function getOfficialToken() {
  if (process.env.OFFICIAL_CA && /^0x[0-9a-fA-F]{40}$/.test(process.env.OFFICIAL_CA)) {
    return { address: process.env.OFFICIAL_CA.toLowerCase(), name: OFFICIAL.name, symbol: OFFICIAL.symbol };
  }
  try {
    return await cached();
  } catch {
    return null;
  }
}
