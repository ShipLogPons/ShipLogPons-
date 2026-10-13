import { NextResponse } from 'next/server';
import { getIndex } from '@/lib/data';

export async function GET() {
  const { projects, updatedAt, indexedAt, indexer } = await getIndex();
  return NextResponse.json({
    updatedAt,
    indexedAt,
    indexer,
    count: projects.length,
    projects: projects.map((p) => ({
      slug: p.slug,
      name: p.name,
      symbol: p.symbol || null,
      narrative: p.narrative,
      status: p.status,
      momentum: p.momentum,
      verified: Boolean(p.verified),
      token: p.token || null,
      launch: p.launch || null,
      repos: p.repos,
      lastShip: p.lastShip ? { title: p.lastShip.title, date: p.lastShip.date, url: p.lastShip.url } : null,
      market: p.market ? { fdv: p.market.fdv, liquidity: p.market.liquidity, volume24: p.market.volume24, status: p.market.status } : null,
      url: `/project/${p.slug}`,
    })),
  }, { headers: { 'access-control-allow-origin': '*' } });
}
