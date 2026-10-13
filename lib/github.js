const GH = 'https://api.github.com';
const DAY = 86400000;

export const hasGithubToken = () => Boolean(process.env.GITHUB_TOKEN);

function headers() {
  const h = {
    Accept: 'application/vnd.github+json',
    'User-Agent': 'shiplog-app',
    'X-GitHub-Api-Version': '2022-11-28',
  };
  if (process.env.GITHUB_TOKEN) h.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
  return h;
}

async function gh(path, revalidate = 1800) {
  try {
    const res = await fetch(GH + path, {
      headers: headers(),
      next: { revalidate },
      signal: AbortSignal.timeout(9000),
    });
    if (!res.ok) return { ok: false, status: res.status };
    return { ok: true, data: await res.json() };
  } catch {
    return { ok: false, status: 0 };
  }
}

// Most recently pushed public repos of a user or org (used when a token links only to a GitHub profile).
export async function ownerRepos(owner, n = 3) {
  const r = await gh(`/users/${owner}/repos?sort=pushed&per_page=10`, 21600);
  if (!r.ok || !Array.isArray(r.data)) return [];
  return r.data
    .filter((x) => !x.fork && !x.archived)
    .slice(0, n)
    .map((x) => x.full_name);
}

// README text straight from raw.githubusercontent.com (no API quota used).
export async function readme(full) {
  for (const name of ['README.md', 'readme.md', 'Readme.md', 'README', 'README.MD', 'docs/README.md']) {
    try {
      const res = await fetch(`https://raw.githubusercontent.com/${full}/HEAD/${name}`, {
        cache: 'no-store',
        signal: AbortSignal.timeout(8000),
      });
      if (res.ok) return await res.text();
    } catch {
      /* try next */
    }
  }
  return null;
}

export async function repoExists(full) {
  try {
    const res = await fetch(`https://github.com/${full}`, { method: 'HEAD', cache: 'no-store', signal: AbortSignal.timeout(8000) });
    return res.ok;
  } catch {
    return false;
  }
}

const BOT = /\[bot\]|dependabot|renovate|github-actions|semantic-release/i;
const TRIVIAL =
  /^(merge\b|bump\b|release v?\d|v?\d+\.\d+\.\d+$|chore\(deps|chore\(release|chore: ?(release|bump|update dep)|docs?[:( ]|readme|update readme|(fix )?typos?\b|format(ting)?\b|lint\b|style:|wip$|initial commit$|update \S+\.(md|txt|json|lock)$|add files via upload$|create \S+\.md$|delete \S+$)/i;

export function isMeaningfulCommit(c) {
  if (!c?.commit) return false;
  if ((c.parents || []).length > 1) return false;
  const author = `${c.author?.login || ''} ${c.commit.author?.name || ''}`;
  if (BOT.test(author)) return false;
  const msg = (c.commit.message || '').split('\n')[0].trim();
  if (!msg || TRIVIAL.test(msg)) return false;
  return true;
}

function releaseTitle(tag, name) {
  const n = (name || '').trim();
  const bare = tag.replace(/^v/i, '');
  if (!n || n === tag) return tag || 'Release';
  if (bare && n.includes(bare)) return n;
  return `${tag} ${n}`;
}

function utcDay(iso) {
  return iso.slice(0, 10);
}

const unescape = (s) =>
  (s || '')
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&amp;/g, '&')
    .trim();

// GitHub's public Atom feeds need no token and do not count against the API quota.
async function atom(url) {
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'shiplog-app', Accept: 'application/atom+xml' },
      next: { revalidate: 1800 },
      signal: AbortSignal.timeout(9000),
    });
    if (!res.ok) return { ok: false, status: res.status };
    const xml = await res.text();
    const entries = [...xml.matchAll(/<entry>([\s\S]*?)<\/entry>/g)].map(([, e]) => ({
      title: unescape(/<title[^>]*>([\s\S]*?)<\/title>/.exec(e)?.[1]),
      updated: unescape(/<updated>([\s\S]*?)<\/updated>/.exec(e)?.[1]),
      link: unescape(/<link[^>]*href="([^"]+)"/.exec(e)?.[1]),
      author: unescape(/<author>\s*<name>([\s\S]*?)<\/name>/.exec(e)?.[1]),
    }));
    return { ok: true, entries };
  } catch {
    return { ok: false, status: 0 };
  }
}

// Same shapes as the REST API, built from the feeds.
async function releasesFromFeed(full) {
  const f = await atom(`https://github.com/${full}/releases.atom`);
  if (!f.ok) return f;
  return {
    ok: true,
    data: f.entries.map((e) => ({
      tag_name: decodeURIComponent(e.link.split('/releases/tag/')[1] || e.title),
      name: e.title,
      published_at: e.updated,
      html_url: e.link,
      draft: false,
      prerelease: /alpha|beta|rc\d*|preview|canary/i.test(e.title),
    })),
  };
}

async function commitsFromFeed(full, since) {
  const f = await atom(`https://github.com/${full}/commits.atom`);
  if (!f.ok) return f;
  return {
    ok: true,
    data: f.entries
      .filter((e) => e.updated >= since)
      .map((e) => ({
        commit: { message: e.title, author: { name: e.author, date: e.updated } },
        author: { login: e.author },
        parents: [],
        html_url: e.link,
      })),
  };
}

// Reads one repository and turns it into "ships": releases, and weeks with real code work.
// With GITHUB_TOKEN the REST API gives deep history; without it, public feeds give the newest commits.
export async function readRepo(full) {
  const since = new Date(Date.now() - 90 * DAY).toISOString().slice(0, 10) + 'T00:00:00Z';
  let [rel, com] = hasGithubToken()
    ? await Promise.all([gh(`/repos/${full}/releases?per_page=30`), gh(`/repos/${full}/commits?since=${since}&per_page=100`)])
    : await Promise.all([releasesFromFeed(full), commitsFromFeed(full, since)]);
  // If the API is rate-limited, fall back to the feeds.
  if (hasGithubToken() && !rel.ok && !com.ok && [403, 429].includes(com.status)) {
    [rel, com] = await Promise.all([releasesFromFeed(full), commitsFromFeed(full, since)]);
  }

  // With a token there is quota to read further back than the newest 100 commits.
  if (hasGithubToken() && com.ok && Array.isArray(com.data) && com.data.length === 100) {
    for (const page of [2, 3]) {
      const more = await gh(`/repos/${full}/commits?since=${since}&per_page=100&page=${page}`);
      if (!more.ok || !Array.isArray(more.data) || !more.data.length) break;
      com.data.push(...more.data);
      if (more.data.length < 100) break;
    }
  }

  const readable = rel.ok || com.ok;
  const ships = [];

  if (rel.ok && Array.isArray(rel.data)) {
    const byDay = new Map();
    for (const r of rel.data) {
      if (r.draft || !r.published_at) continue;
      const day = utcDay(r.published_at);
      const prev = byDay.get(day);
      if (!prev || prev.published_at < r.published_at) byDay.set(day, r);
    }
    for (const r of byDay.values()) {
      const tag = r.tag_name || '';
      const major = /^v?\d+\.0\.0$/.test(tag);
      ships.push({
        kind: 'release',
        title: releaseTitle(tag, r.name),
        date: r.published_at,
        url: r.html_url,
        repo: full,
        weight: r.prerelease ? 4 : major ? 9 : 6,
        proof: 'GitHub release',
      });
    }
  }

  // Day-by-day counts for the activity calendar: [real commits, releases].
  const daily = {};
  const bump = (iso, k) => {
    const d = utcDay(iso);
    daily[d] = daily[d] || [0, 0];
    // Releases count at most once per day, so a burst of tags cannot inflate a builder.
    daily[d][k] = k === 1 ? 1 : daily[d][k] + 1;
  };
  if (rel.ok && Array.isArray(rel.data)) for (const r of rel.data) if (!r.draft && r.published_at) bump(r.published_at, 1);

  let commitsTotal = 0;
  let commitsMeaningful = 0;
  if (com.ok && Array.isArray(com.data)) {
    const weeks = new Map();
    for (const c of com.data) {
      commitsTotal++;
      if (!isMeaningfulCommit(c)) continue;
      commitsMeaningful++;
      const d = c.commit.author?.date || c.commit.committer?.date;
      if (!d) continue;
      bump(d, 0);
      const wk = Math.floor((Date.now() - Date.parse(d)) / (7 * DAY));
      const w = weeks.get(wk) || { count: 0, latest: d, sample: '', url: '' };
      w.count++;
      if (d >= w.latest) {
        w.latest = d;
        w.sample = c.commit.message.split('\n')[0].slice(0, 90);
        w.url = c.html_url;
      }
      weeks.set(wk, w);
    }
    for (const w of weeks.values()) {
      ships.push({
        kind: 'code',
        title: `${w.count >= 300 ? '300+' : w.count} code change${w.count > 1 ? 's' : ''}: ${w.sample}`,
        date: w.latest,
        url: w.url || `https://github.com/${full}/commits`,
        repo: full,
        weight: w.count >= 5 ? 4 : 3,
        proof: 'GitHub commits',
      });
    }
  }

  return {
    repo: full,
    readable,
    status: rel.status || com.status || 200,
    ships,
    daily,
    commitsTotal,
    commitsMeaningful,
  };
}

export function githubFromUrl(url) {
  const m = /github\.com\/([A-Za-z0-9-_.]+)(?:\/([A-Za-z0-9-_.]+))?/i.exec(url || '');
  if (!m) return null;
  return { owner: m[1], repo: m[2] ? m[2].replace(/\.git$/, '') : null };
}

// Public profile of a GitHub user or organization.
export async function getUser(owner) {
  const r = await gh(`/users/${owner}`, 21600);
  if (!r.ok || !r.data) return null;
  const u = r.data;
  return {
    login: u.login,
    name: u.name || null,
    avatar: u.avatar_url || `https://github.com/${owner}.png?size=120`,
    bio: u.bio || '',
    type: u.type,
    repos: u.public_repos ?? null,
    followers: u.followers ?? null,
    created: u.created_at || null,
    blog: u.blog || null,
    twitter: u.twitter_username || null,
  };
}
