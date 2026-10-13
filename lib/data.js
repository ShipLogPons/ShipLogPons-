import { unstable_cache } from 'next/cache';
import { readJSON } from './store';
import { readRepo, ownerRepos, hasGithubToken } from './github';
import { marketsFor } from './market';
import { scoreProject, STATUS_ORDER } from './score';
import { getSubmissions } from './submissions';
import { PHASE } from './pons';

const DAY = 86400000;

async function pool(items, size, fn) {
  const out = new Array(items.length);
  let i = 0;
  await Promise.all(
    Array.from({ length: Math.min(size, items.length) }, async () => {
      while (i < items.length) {
        const idx = i++;
        out[idx] = await fn(items[idx], idx);
      }
    })
  );
  return out;
}

function guessNarrative(text) {
  const t = (text || '').toLowerCase();
  if (/agent|mcp\b|llm|\bai\b|inference|gpt/.test(t)) return 'AI Agents';
  if (/\bdex\b|swap|amm|liquidity|uniswap|router/.test(t)) return 'DEX';
  if (/lend|borrow|vault|yield|perp|stablecoin|defi/.test(t)) return 'DeFi';
  if (/stock|equit|tokenized|rwa/.test(t)) return 'Stocks & RWA';
  if (/game|play|arcade/.test(t)) return 'Gaming';
  if (/nft|collectible|art\b/.test(t)) return 'NFT';
  if (/launch(pad)?|bonding|curve/.test(t)) return 'Launchpad';
  if (/wallet/.test(t)) return 'Wallet';
  if (/analytics|dashboard|explorer|indexer|tracker|data/.test(t)) return 'Analytics';
  if (/sdk|library|cli|tool|api/.test(t)) return 'Tooling';
  if (/meme|cat|dog|frog|inu|pepe/.test(t)) return 'Meme';
  return 'Other';
}

const slugify = (s) => (s || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '').slice(0, 40);

function tokenProject(b) {
  const m = b.meta || {};
  return {
    slug: `${slugify(m.symbol || m.name || 'token')}-${b.token.slice(2, 8)}`,
    name: m.name || m.symbol || `Token ${b.token.slice(0, 8)}`,
    symbol: m.symbol || null,
    tagline: m.description || '',
    avatar: m.logo || null,
    token: b.token,
    socials: m.socials || {},
    launch: {
      version: b.version || null,
      block: b.block || null,
      ts: b.ts || null,
      deployer: b.deployer || null,
      curve: b.curve || null,
      phase: b.curveState?.phase ?? b.phase ?? null,
      progress: b.curveState?.progress ?? null,
    },
    githubLinks: b.github || [],
    contracts: b.contracts || [],
    repos: [],
    source: 'pons',
  };
}

async function buildAll() {
  const [state, subs] = await Promise.all([readJSON('state.json', null), getSubmissions()]);
  const builders = Object.values(state?.builders || {});

  const byToken = new Map();
  let projects = [];
  for (const b of builders) {
    const p = tokenProject(b);
    byToken.set(b.token, p);
    projects.push(p);
  }

  // Verified submissions: attach to their Pons token, or stand alone.
  for (const s of subs) {
    if (s.token) {
      let p = byToken.get(s.token);
      if (!p) {
        p = tokenProject({ token: s.token, meta: s.meta, version: s.launch?.version, block: s.launch?.block, deployer: s.launch?.deployer, curve: s.launch?.curve, github: [] });
        p.source = 'submitted';
        byToken.set(s.token, p);
        projects.push(p);
      }
      if (!p.repos.includes(s.repo)) p.repos.unshift(s.repo);
      p.verified = true;
    } else {
      const [owner, repo] = s.repo.split('/');
      projects.push({
        slug: slugify(`${owner}-${repo}`),
        name: s.name || repo,
        symbol: null,
        tagline: '',
        avatar: `https://github.com/${owner}.png?size=96`,
        token: null,
        socials: {},
        launch: null,
        githubLinks: [],
        repos: [s.repo],
        verified: true,
        source: 'submitted',
      });
    }
  }

  // Resolve GitHub links from token metadata into repositories.
  await pool(projects, 6, async (p) => {
    for (const g of p.githubLinks) {
      if (g.repo) {
        const full = `${g.owner}/${g.repo}`;
        if (!p.repos.some((r) => r.toLowerCase() === full.toLowerCase())) p.repos.push(full);
      } else if (p.repos.length < 3) {
        for (const r of await ownerRepos(g.owner, 2)) if (!p.repos.includes(r)) p.repos.push(r);
      }
    }
    p.repos = p.repos.slice(0, 4);
  });

  // Copycat tokens: when several unverified tokens point at the same repo, keep the earliest launch.
  // Any shared repository counts, not just the first one listed, so the same repo is never ranked twice.
  const firstByRepo = new Map();
  for (const p of [...projects].sort((a, b) => (b.verified ? 1 : 0) - (a.verified ? 1 : 0) || (a.launch?.block || 0) - (b.launch?.block || 0))) {
    const keys = p.repos.map((r) => r.toLowerCase());
    if (!keys.length) continue;
    const first = keys.map((k) => firstByRepo.get(k)).find(Boolean);
    if (!first || p.verified) {
      for (const k of keys) if (!firstByRepo.has(k)) firstByRepo.set(k, p);
      continue;
    }
    {
      p.copyOf = first.slug;
      first.copies = (first.copies || 0) + 1;
      first.copyTokens = [...(first.copyTokens || []), { token: p.token, name: p.name, symbol: p.symbol, ts: p.launch?.ts || null, deployer: p.launch?.deployer || null }];
    }
  }
  const copies = projects.filter((p) => p.copyOf).map((p) => ({ slug: p.slug, copyOf: p.copyOf, name: p.name, symbol: p.symbol, token: p.token, avatar: p.avatar, repos: p.repos, ts: p.launch?.ts || null }));
  projects = projects.filter((p) => !p.copyOf);

  // Read GitHub activity: the API with a token, public feeds without one.
  const cap = hasGithubToken() ? 200 : 150;
  const order = [...projects].sort((a, b) => (b.verified ? 1 : 0) - (a.verified ? 1 : 0) || (b.launch?.block || 0) - (a.launch?.block || 0));
  const allRepos = [...new Set(order.flatMap((p) => p.repos))].slice(0, cap);
  const reads = await pool(allRepos, 6, (r) => readRepo(r));
  const readMap = new Map(reads.map((r) => [r.repo.toLowerCase(), r]));

  const markets = await marketsFor(projects.map((p) => p.token).filter(Boolean));

  const now = Date.now();
  for (const c of copies) c.owners = [...new Set(c.repos.map((r) => r.split('/')[0]))];
  for (const p of projects) {
    const rs = p.repos.map((r) => readMap.get(r.toLowerCase())).filter(Boolean);
    // Contracts the builder's wallet deployed on Robinhood Chain count as ships too.
    const chainShips = (p.contracts || [])
      .filter((c) => c.ts)
      .map((c) => ({
        kind: 'contract',
        title: `Deployed a new contract ${c.address.slice(0, 6)}…${c.address.slice(-4)}`,
        date: new Date(c.ts * 1000).toISOString(),
        url: `https://robinhoodchain.blockscout.com/address/${c.address}`,
        repo: null,
        weight: 5,
        proof: 'Contract on Robinhood Chain',
      }));
    const ships = [...rs.flatMap((r) => r.ships), ...chainShips].filter((s) => now - Date.parse(s.date) <= 90 * DAY);
    ships.sort((a, b) => Date.parse(b.date) - Date.parse(a.date));
    const score = scoreProject({ ships, repoCount: p.repos.length, readableCount: rs.filter((r) => r.readable).length, now });
    // Activity calendar: real commits and releases per UTC day, last 91 days.
    const cutoff = new Date(now - 91 * DAY).toISOString().slice(0, 10);
    const activity = {};
    for (const r of rs) {
      for (const [d, [c, rel]] of Object.entries(r.daily || {})) {
        if (d < cutoff) continue;
        activity[d] = activity[d] || [0, 0];
        activity[d][0] += c;
        activity[d][1] += rel;
      }
    }
    for (const c of chainShips) {
      const d = c.date.slice(0, 10);
      if (d < cutoff) continue;
      activity[d] = activity[d] || [0, 0];
      activity[d][1] += 1;
    }
    p.activity = activity;
    p.owners = [...new Set(p.repos.map((r) => r.split('/')[0]))];
    p.ships = ships.slice(0, 40).map((s) => ({ ...s, project: p.slug, projectName: p.name, avatar: p.avatar }));
    p.status = score.status;
    p.momentum = score.momentum;
    p.parts = score.parts;
    p.lastShip = score.lastShip;
    p.reposRead = rs.map((r) => ({ repo: r.repo, readable: r.readable, status: r.status, commits: r.commitsTotal, meaningful: r.commitsMeaningful }));
    p.market = p.token ? markets.get(p.token) || null : null;
    if (p.market && !p.avatar) p.avatar = p.market.image;
    p.narrative = guessNarrative(`${p.name} ${p.tagline} ${p.repos.join(' ')}`);
    p.phaseLabel = p.launch?.phase != null ? PHASE[p.launch.phase] : null;
    p.underRadar = (p.momentum ?? 0) >= 40 && ['shipping', 'active', 'resumed'].includes(p.status) && (!p.market || (p.market.fdv || 0) < 250000);
    delete p.githubLinks;
    delete p.contracts;
  }

  projects.sort((a, b) => {
    const s = STATUS_ORDER.indexOf(a.status) - STATUS_ORDER.indexOf(b.status);
    if (s) return s;
    return (b.momentum ?? -1) - (a.momentum ?? -1);
  });

  const slugByToken = new Map(projects.filter((p) => p.token).map((p) => [p.token, p.slug]));
  const bySlug = new Map(projects.map((p) => [p.slug, p]));

  // Signals: measured changes, newest first. Chain events come from the indexer, the rest from the ship log.
  const signals = [];
  for (const sig of state?.signals || []) {
    const slug = slugByToken.get(sig.token);
    if (!slug) continue;
    signals.push({ type: sig.type, slug, date: new Date(sig.at).toISOString(), title: sig.title || undefined });
  }
  for (const p of projects) {
    for (const s of p.ships) {
      if (s.kind === 'release' && /(^|[^\d.])v?[1-9]\d*\.0\.0(?![\d.])/.test(s.title)) {
        signals.push({ type: 'major', slug: p.slug, date: s.date, title: s.title, url: s.url });
      }
    }
    const codeWeeks = p.ships.filter((s) => s.kind === 'code').slice(0, 2);
    const n = (s) => parseInt(s?.title, 10) || 0;
    if (codeWeeks.length === 2 && n(codeWeeks[0]) >= 10 && n(codeWeeks[0]) >= 2 * n(codeWeeks[1]) && Date.now() - Date.parse(codeWeeks[0].date) < 7 * DAY) {
      signals.push({ type: 'spike', slug: p.slug, date: codeWeeks[0].date, title: `${n(codeWeeks[1])} → ${n(codeWeeks[0])} real commits a week`, url: codeWeeks[0].url });
    }
    if (p.status === 'quiet' && p.lastShip && now - Date.parse(p.lastShip.date) < 37 * DAY) {
      signals.push({ type: 'quiet', slug: p.slug, date: new Date(Date.parse(p.lastShip.date) + 30 * DAY).toISOString(), title: 'No real work for 30 days' });
    }
    if (p.status === 'resumed' && p.lastShip) signals.push({ type: 'resumed', slug: p.slug, date: p.lastShip.date, url: p.lastShip.url });
    if (p.copies) signals.push({ type: 'copycat', slug: p.slug, date: new Date(Math.max(...p.copyTokens.map((c) => (c.ts || 0) * 1000)) || Date.now()).toISOString(), title: `${p.copies} other token${p.copies > 1 ? 's' : ''} link the same repo` });
  }
  for (const sg of signals) {
    const p = bySlug.get(sg.slug);
    sg.name = p?.name;
    sg.symbol = p?.symbol;
    sg.avatar = p?.avatar;
  }
  signals.sort((a, b) => Date.parse(b.date) - Date.parse(a.date));
  const feed = (state?.feed || []).slice(0, 400).map((f) => ({
    token: f.token,
    block: f.block,
    ts: f.ts,
    version: f.version,
    deployer: f.deployer,
    name: f.meta?.name || null,
    symbol: f.meta?.symbol || null,
    logo: f.meta?.logo || null,
    description: f.meta?.description || '',
    socials: f.meta?.socials || {},
    progress: f.curveState?.progress ?? null,
    phase: f.curveState?.phase ?? null,
    builder: slugByToken.get(f.token) || null,
  }));

  return {
    updatedAt: new Date().toISOString(),
    indexedAt: state?.updatedAt || null,
    indexer: state ? { runs: state.stats?.runs || 0, inspected: state.stats?.inspected || 0, backfill: state.stats?.backfill || {}, queue: state.stats?.queue || 0 } : null,
    githubToken: hasGithubToken(),
    launches24: (() => {
      const all = state?.feed || [];
      const n = all.filter((f) => f.ts && f.ts >= Date.now() / 1000 - 86400).length;
      return n >= all.length && all.length >= 1500 ? '1,500+' : n;
    })(),
    projects,
    copies,
    feed,
    signals: signals.slice(0, 150),
  };
}

export const getIndex = unstable_cache(buildAll, ['shiplog-index-v6'], { revalidate: 300, tags: ['index'] });

export async function getProject(slug) {
  const idx = await getIndex();
  return idx.projects.find((p) => p.slug === slug) || null;
}

export function shipsOf(projects, days = 60) {
  const now = Date.now();
  return projects
    .flatMap((p) => p.ships || [])
    .filter((s) => now - Date.parse(s.date) <= days * DAY)
    .sort((a, b) => Date.parse(b.date) - Date.parse(a.date));
}

export function counts(idx) {
  const { projects, feed } = idx;
  const now = Date.now();
  const dayAgo = now / 1000 - 86400;
  return {
    tracked: projects.length,
    shipping: projects.filter((p) => p.status === 'shipping' || p.status === 'resumed').length,
    active: projects.filter((p) => ['shipping', 'resumed', 'active'].includes(p.status)).length,
    launches24: idx.launches24 ?? feed.filter((f) => f.ts && f.ts >= dayAgo).length,
    days: Array.from({ length: 14 }, (_, i) => {
      const day = new Date(now - (13 - i) * DAY).toISOString().slice(0, 10);
      return { day, n: projects.flatMap((p) => p.ships || []).filter((s) => s.date.slice(0, 10) === day).length };
    }),
  };
}

export function narratives(projects) {
  const m = new Map();
  for (const p of projects) m.set(p.narrative, (m.get(p.narrative) || 0) + 1);
  return [...m.entries()].sort((a, b) => b[1] - a[1]);
}

// Sum of [commits, releases] over the `days` days ending `offset` days ago.
export function activitySum(activity, days, offset = 0) {
  const now = Date.now();
  let c = 0;
  let r = 0;
  for (let i = offset; i < offset + days; i++) {
    const v = activity?.[new Date(now - i * DAY).toISOString().slice(0, 10)];
    if (v) {
      c += v[0];
      r += v[1];
    }
  }
  return { commits: c, releases: r };
}

// Builder of the week: real commits plus releases (worth 5 commits each) over the last 7 days.
export function weekBoard(projects, limit = 25) {
  return projects
    .map((p) => {
      const now = activitySum(p.activity, 7);
      const prev = activitySum(p.activity, 7, 7);
      const points = now.commits + now.releases * 5;
      const before = prev.commits + prev.releases * 5;
      return { p, ...now, points, before, delta: points - before };
    })
    .filter((x) => x.points > 0)
    .sort((a, b) => b.points - a.points || b.releases - a.releases || (b.p.momentum ?? 0) - (a.p.momentum ?? 0))
    .slice(0, limit);
}

// Projects grouped by the GitHub account behind their repositories.
export function developers(idx) {
  const m = new Map();
  for (const p of idx.projects) {
    for (const o of p.owners || []) {
      const k = o.toLowerCase();
      if (!m.has(k)) m.set(k, { owner: o, projects: [], copies: [] });
      m.get(k).projects.push(p);
    }
  }
  for (const c of idx.copies || []) {
    for (const o of c.owners || []) {
      const d = m.get(o.toLowerCase());
      if (d) d.copies.push(c);
    }
  }
  return m;
}

export async function getDeveloper(owner) {
  const idx = await getIndex();
  return developers(idx).get((owner || '').toLowerCase()) || null;
}
