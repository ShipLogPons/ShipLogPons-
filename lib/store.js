import { put, list, del } from '@vercel/blob';

// Each write goes to a new path (name/<timestamp>.json), so a read never hits a stale CDN copy.
// list() is an API call, not CDN-cached, so it always sees the newest version.

export const hasStore = () => Boolean(process.env.BLOB_READ_WRITE_TOKEN);

async function versions(name) {
  const { blobs } = await list({ prefix: `${name}/`, limit: 100 });
  return blobs.sort((a, b) => (a.pathname < b.pathname ? 1 : -1));
}

export async function readJSON(name, fallback) {
  if (!hasStore()) return fallback;
  try {
    const [latest] = await versions(name);
    if (!latest) return fallback;
    const res = await fetch(latest.url, { cache: 'no-store', signal: AbortSignal.timeout(10000) });
    if (!res.ok) return fallback;
    return await res.json();
  } catch {
    return fallback;
  }
}

export async function writeJSON(name, data) {
  if (!hasStore()) return false;
  const stamp = String(Date.now()).padStart(15, '0');
  await put(`${name}/${stamp}.json`, JSON.stringify(data), {
    access: 'public',
    addRandomSuffix: false,
    contentType: 'application/json',
    cacheControlMaxAge: 31536000,
  });
  try {
    const old = (await versions(name)).slice(2).map((b) => b.url);
    if (old.length) await del(old);
  } catch {
    /* cleanup can wait for the next write */
  }
  return true;
}
