import { after } from 'next/server';
import { revalidateTag } from 'next/cache';
import { runIndexer } from './indexer';
import { maybeSendDigest } from './digest';

// When the index is older than a few minutes, run one indexing pass after the response is sent.
export function kickIndexer(indexedAt) {
  const stale = !indexedAt || Date.now() - Date.parse(indexedAt) > 4 * 60000;
  if (!stale) return;
  after(async () => {
    try {
      const r = await runIndexer({ budgetMs: 36000 });
      if (r.ok) revalidateTag('index');
    } catch {
      /* next visit retries */
    }
    try {
      await maybeSendDigest();
    } catch {
      /* the digest is best effort */
    }
  });
}
