import { NextResponse } from 'next/server';
import { revalidateTag } from 'next/cache';
import { runIndexer } from '@/lib/indexer';
import { maybeSendDigest } from '@/lib/digest';

export async function GET(req) {
  const secret = process.env.CRON_SECRET;
  if (secret && req.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Not allowed' }, { status: 401 });
  }
  const force = new URL(req.url).searchParams.get('force') === '1';
  try {
    const r = await runIndexer({ budgetMs: 36000, force });
    if (r.ok) revalidateTag('index');
    let digest = null;
    try {
      digest = await maybeSendDigest();
    } catch {
      digest = { sent: 0, reason: 'error' };
    }
    return NextResponse.json({ ...r, digest });
  } catch (e) {
    return NextResponse.json({ ok: false, error: String(e?.message || e).slice(0, 300) }, { status: 500 });
  }
}
