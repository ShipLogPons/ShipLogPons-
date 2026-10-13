import { NextResponse } from 'next/server';
import { revalidateTag } from 'next/cache';
import { verifySubmission, saveSubmission } from '@/lib/submissions';
import { hasStore } from '@/lib/store';

const recent = new Map();

export async function POST(req) {
  if (!hasStore()) return NextResponse.json({ ok: false, error: 'Submissions are not set up on this deployment yet.' }, { status: 503 });
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0] || 'unknown';
  const last = recent.get(ip) || 0;
  if (Date.now() - last < 8000) {
    return NextResponse.json({ ok: false, error: 'Wait a few seconds before submitting again.' }, { status: 429 });
  }
  recent.set(ip, Date.now());

  let body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: 'Send the form again.' }, { status: 400 });
  }
  const result = await verifySubmission({ repo: body.repo, token: body.token, name: body.name });
  if (!result.ok) return NextResponse.json(result, { status: 422 });
  await saveSubmission(result.item);
  revalidateTag('index');
  return NextResponse.json({ ok: true, repo: result.item.repo, token: result.item.token, method: result.item.method });
}
