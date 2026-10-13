import { NextResponse } from 'next/server';
import { getIndex } from '@/lib/data';
import { buildReport, parseWeek, weekStart } from '@/lib/report';

export async function GET(req) {
  const w = new URL(req.url).searchParams.get('week');
  const start = w ? parseWeek(w) : weekStart();
  if (start == null) return NextResponse.json({ error: 'week must be a Monday, like 2026-10-05' }, { status: 400 });
  const r = buildReport(await getIndex(), start);
  const ref = (s) => ({ slug: s.p.slug, name: s.p.name, date: s.date, title: s.title || null });
  return NextResponse.json(
    {
      week: r.key,
      range: r.range,
      partial: r.partial,
      headline: r.headline,
      summary: r.paragraphs,
      totals: { builders: r.builders, commits: r.commits, releases: r.releases, ships: r.ships.length },
      previous: r.prev,
      board: r.board.map((x, i) => ({ rank: i + 1, slug: x.p.slug, name: x.p.name, commits: x.now.commits, releases: x.now.releases, points: x.now.points })),
      newBuilders: r.newBuilders.map(ref),
      graduated: r.graduated.map(ref),
      majorReleases: r.majors.map(ref),
      contracts: r.contracts.map(ref),
      devSold: r.devsold.map(ref),
      liquidityGone: r.liqgone.map(ref),
      url: `/reports/${r.key}`,
    },
    { headers: { 'access-control-allow-origin': '*' } },
  );
}
