import { CHAIN } from './pons';

const DS = 'https://api.dexscreener.com';

async function ds(path, revalidate = 600) {
  try {
    const res = await fetch(DS + path, { next: { revalidate }, signal: AbortSignal.timeout(9000) });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

function summarize(pairs) {
  const own = pairs.filter((p) => p.chainId === CHAIN.dexscreenerId);
  if (!own.length) return null;
  own.sort((a, b) => (b.liquidity?.usd || 0) - (a.liquidity?.usd || 0));
  const top = own[0];
  const liquidity = own.reduce((s, p) => s + (p.liquidity?.usd || 0), 0);
  const volume24 = own.reduce((s, p) => s + (p.volume?.h24 || 0), 0);
  const fdv = top.fdv || top.marketCap || null;
  let status = 'active';
  if (liquidity < 1) status = 'no-liquidity';
  else if (liquidity < 5000) status = 'low-liquidity';
  else if (volume24 < 1) status = 'inactive';
  return {
    name: top.baseToken?.name,
    symbol: top.baseToken?.symbol,
    address: top.baseToken?.address,
    priceUsd: top.priceUsd ? Number(top.priceUsd) : null,
    fdv,
    liquidity,
    volume24,
    change24: top.priceChange?.h24 ?? null,
    pairs: own.length,
    dex: top.dexId,
    url: top.url,
    pairAddress: top.pairAddress || null,
    image: top.info?.imageUrl || null,
    websites: (top.info?.websites || []).map((w) => w.url),
    socials: (top.info?.socials || []).map((s) => ({ type: s.type, url: s.url })),
    status,
  };
}

// One call for up to 30 token addresses.
export async function marketsFor(addresses) {
  const out = new Map();
  const list = [...new Set(addresses.filter(Boolean).map((a) => a.toLowerCase()))];
  for (let i = 0; i < list.length; i += 30) {
    const chunk = list.slice(i, i + 30);
    const data = await ds(`/latest/dex/tokens/${chunk.join(',')}`);
    const pairs = data?.pairs || [];
    for (const addr of chunk) {
      const mine = pairs.filter((p) => p.baseToken?.address?.toLowerCase() === addr);
      const s = summarize(mine);
      if (s) out.set(addr, s);
    }
  }
  return out;
}

export async function marketFor(address) {
  const m = await marketsFor([address]);
  return m.get(address.toLowerCase()) || null;
}
