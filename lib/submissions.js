import { readJSON, writeJSON } from './store';
import { readme, repoExists, githubFromUrl } from './github';
import { readTokenMeta, findLaunch } from './pons';

export async function getSubmissions() {
  const doc = await readJSON('submissions.json', { items: [] });
  return Array.isArray(doc.items) ? doc.items : [];
}

export function parseRepo(input) {
  const s = (input || '').trim();
  const g = githubFromUrl(s.includes('github.com') ? s : `github.com/${s}`);
  if (!g?.owner || !g?.repo) return null;
  return `${g.owner}/${g.repo}`;
}

// Verification: the repository's README must contain the token's contract address.
// Without a token, the README must say the project is built on Robinhood Chain.
export async function verifySubmission({ repo, token, name }) {
  const full = parseRepo(repo);
  if (!full) return { ok: false, error: 'Enter a GitHub repository, like github.com/owner/repo.' };
  if (!(await repoExists(full))) return { ok: false, error: `ShipLog could not find github.com/${full}. Check that the repository is public.` };

  const text = await readme(full);
  if (!text) return { ok: false, error: `github.com/${full} has no README ShipLog can read. Add a README.md to the default branch.` };
  const lower = text.toLowerCase();

  let launch = null;
  let meta = null;
  const t = (token || '').trim().toLowerCase();
  if (t) {
    if (!/^0x[0-9a-f]{40}$/.test(t)) return { ok: false, error: 'The token address must be 0x followed by 40 characters.' };
    meta = await readTokenMeta(t);
    if (!meta?.ponsInfo) return { ok: false, error: 'That address is not a Pons token. ShipLog lists tokens launched on Pons, or projects without a token.' };
    if (!lower.includes(t)) {
      return {
        ok: false,
        error: `Add the token address ${t} to the README of github.com/${full}, then submit again. This proves the repository belongs to the token.`,
      };
    }
    launch = await findLaunch(t);
  } else if (!/robinhood\s*chain|chain\s*id\s*:?\s*4663|\b4663\b/.test(lower)) {
    return {
      ok: false,
      error: `Mention “Robinhood Chain” in the README of github.com/${full}, then submit again.`,
    };
  }

  return {
    ok: true,
    item: {
      repo: full,
      token: t || null,
      name: (name || '').trim().slice(0, 60) || meta?.name || full.split('/')[1],
      meta,
      launch,
      verifiedAt: new Date().toISOString(),
      method: t ? 'readme-contains-token' : 'readme-mentions-chain',
    },
  };
}

export async function saveSubmission(item) {
  const items = await getSubmissions();
  const key = (x) => `${x.repo.toLowerCase()}|${x.token || ''}`;
  const rest = items.filter((x) => key(x) !== key(item));
  rest.unshift(item);
  await writeJSON('submissions.json', { items: rest.slice(0, 2000) });
  return rest.length;
}
