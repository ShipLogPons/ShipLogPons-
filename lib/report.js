const DAY = 86400000;

// Weeks run Monday 00:00 UTC to Sunday 23:59 UTC. A week is named by its Monday, like 2026-10-05.
export function weekStart(ts = Date.now()) {
  const d = new Date(ts);
  const day = (d.getUTCDay() + 6) % 7;
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() - day);
}

export const weekKey = (start) => new Date(start).toISOString().slice(0, 10);

export function parseWeek(key) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(key || '')) return null;
  const t = Date.parse(`${key}T00:00:00Z`);
  if (!Number.isFinite(t) || new Date(t).getUTCDay() !== 1) return null;
  return t;
}

const fmtDay = (t) => new Date(t).toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });
export const weekRange = (start) => `${fmtDay(start)} to ${fmtDay(start + 6 * DAY)}, ${new Date(start).getUTCFullYear()}`;

const plural = (n, one, many = `${one}s`) => `${n.toLocaleString('en-US')} ${n === 1 ? one : many}`;
const list = (all) => {
  const names = [...new Set(all)];
  return names.length < 2 ? names.join('') : `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`;
};

function pointsIn(p, start, end) {
  let commits = 0;
  let releases = 0;
  for (let t = start; t < end; t += DAY) {
    const v = p.activity?.[new Date(t).toISOString().slice(0, 10)];
    if (v) {
      commits += v[0];
      releases += v[1];
    }
  }
  return { commits, releases, points: commits + releases * 5 };
}

export function buildReport(idx, start) {
  const end = start + 7 * DAY;
  const now = Date.now();
  const inWeek = (iso) => {
    const t = Date.parse(iso);
    return t >= start && t < end;
  };
  const partial = end > now;
  const { projects } = idx;
  const bySlug = new Map(projects.map((p) => [p.slug, p]));

  const ships = projects.flatMap((p) => (p.ships || []).filter((s) => inWeek(s.date)).map((s) => ({ ...s, p })));
  ships.sort((a, b) => Date.parse(b.date) - Date.parse(a.date));

  const board = projects
    .map((p) => ({ p, now: pointsIn(p, start, end), prev: pointsIn(p, start - 7 * DAY, start) }))
    .filter((x) => x.now.points > 0)
    .sort((a, b) => b.now.points - a.now.points || b.now.releases - a.now.releases);

  const total = board.reduce((a, x) => ({ commits: a.commits + x.now.commits, releases: a.releases + x.now.releases }), { commits: 0, releases: 0 });
  const prevTotal = projects.reduce(
    (a, p) => {
      const v = pointsIn(p, start - 7 * DAY, start);
      return { commits: a.commits + v.commits, releases: a.releases + v.releases, builders: a.builders + (v.points > 0 ? 1 : 0) };
    },
    { commits: 0, releases: 0, builders: 0 },
  );

  const sig = (type) =>
    (idx.signals || [])
      .filter((s) => s.type === type && inWeek(s.date))
      .map((s) => ({ ...s, p: bySlug.get(s.slug) }))
      .filter((s) => s.p);

  const report = {
    key: weekKey(start),
    start,
    end,
    partial,
    range: weekRange(start),
    ships,
    board: board.slice(0, 10),
    builders: board.length,
    commits: total.commits,
    releases: total.releases,
    prev: prevTotal,
    newBuilders: sig('builder'),
    graduated: sig('graduated'),
    majors: sig('major'),
    contracts: sig('contract'),
    spikes: sig('spike'),
    quiet: sig('quiet'),
    devsold: sig('devsold'),
    liqgone: sig('liqgone'),
    resumed: sig('resumed'),
  };
  report.empty = !report.builders && !report.ships.length && !report.newBuilders.length && !report.graduated.length;
  report.headline = headline(report);
  report.paragraphs = paragraphs(report);
  return report;
}

function headline(r) {
  if (r.empty) return 'No building recorded this week';
  const lead = r.board[0];
  if (r.graduated.length && lead) return `${lead.p.name} leads as ${plural(r.graduated.length, 'builder token')} graduate`;
  if (lead && r.board.length > 1) return `${lead.p.name} leads ${plural(r.builders, 'active builder')}`;
  if (lead) return `${lead.p.name} is the only builder shipping`;
  if (r.newBuilders.length) return `${plural(r.newBuilders.length, 'new builder')} found on Pons`;
  return `${plural(r.ships.length, 'ship')} logged`;
}

function change(now, before, noun) {
  if (!before) return now ? `up from none the week before` : '';
  const d = Math.round(((now - before) / before) * 100);
  if (Math.abs(d) < 5) return `about the same as the week before`;
  return `${d > 0 ? 'up' : 'down'} ${Math.abs(d)}% on the week before (${before.toLocaleString('en-US')} ${noun})`;
}

function paragraphs(r) {
  const out = [];
  if (r.empty) {
    out.push(
      'Shiplog found no real commits, releases or new contracts from any tracked Pons builder in this week. That can mean builders paused, or that their work happened in repositories Shiplog does not read.',
    );
    return out;
  }

  const so = r.partial ? 'So far this week' : 'This week';
  const c = change(r.commits, r.prev.commits, 'commits');
  out.push(
    `${so}, ${plural(r.builders, 'tracked builder')} shipped real work: ${plural(r.commits, 'real commit')} and ${plural(r.releases, 'release')}${c ? `, commits ${c}` : ''}. Shiplog logged ${plural(r.ships.length, 'ship')} in total.`,
  );

  if (r.board.length) {
    const [a, b, d] = r.board;
    let s = `${a.p.name} did the most work, with ${plural(a.now.commits, 'commit')}${a.now.releases ? ` and ${plural(a.now.releases, 'release')}` : ''}.`;
    if (b) s += ` ${b.p.name} followed with ${plural(b.now.points, 'point')}${d ? `, then ${d.p.name} with ${d.now.points}` : ''}.`;
    const climbers = r.board.filter((x) => x.now.points > 0 && x.prev.points === 0).map((x) => x.p.name);
    if (climbers.length) s += ` ${list(climbers.slice(0, 3))} had nothing the week before.`;
    out.push(s);
  }

  const news = [];
  if (r.newBuilders.length) news.push(`${plural(r.newBuilders.length, 'Pons token')} linked a GitHub repository for the first time (${list(r.newBuilders.slice(0, 4).map((s) => s.p.name))}${r.newBuilders.length > 4 ? ' and others' : ''})`);
  if (r.graduated.length) news.push(`${list(r.graduated.map((s) => s.p.name))} filled ${r.graduated.length === 1 ? 'its' : 'their'} bonding curve and moved to a DEX pool`);
  if (r.majors.length) news.push(`${list(r.majors.map((s) => s.p.name))} published a major release`);
  if (r.contracts.length) news.push(`${plural(r.contracts.length, 'new contract')} came from builder wallets`);
  if (r.resumed.length) news.push(`${list(r.resumed.map((s) => s.p.name))} started shipping again after a long pause`);
  if (news.length) out.push(`${news.map((x) => x[0].toUpperCase() + x.slice(1)).join('. ')}.`);

  const risk = [];
  if (r.devsold.length) risk.push(`the deployer wallet of ${list(r.devsold.map((s) => s.p.name))} dropped below half of its peak holding`);
  if (r.liqgone.length) risk.push(`the pool of ${list(r.liqgone.map((s) => s.p.name))} went close to empty`);
  if (r.quiet.length) risk.push(`${list(r.quiet.slice(0, 4).map((s) => s.p.name))} reached 30 days without real work`);
  if (risk.length) out.push(`On the other side, ${risk.join('; ')}. These are measured facts, not judgments about why.`);

  return out;
}

// Weeks that have anything to report, newest first.
export function reportWeeks(idx, max = 12) {
  const first = weekStart();
  const out = [];
  for (let i = 0; i < max; i++) {
    const r = buildReport(idx, first - i * 7 * DAY);
    if (!r.empty || i === 0) out.push(r);
  }
  return out;
}
