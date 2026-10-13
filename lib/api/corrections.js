import { NextResponse } from 'next/server';
import { addCorrection } from '@/lib/corrections';
import { hasStore } from '@/lib/store';

const recent = new Map();

export async function POST(req) {
  if (!hasStore()) return NextResponse.json({ ok: false, error: 'Corrections are not set up on this deployment yet.' }, { status: 503 });
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0] || 'unknown';
  if (Date.now() - (recent.get(ip) || 0) < 30000) {
    return NextResponse.json({ ok: false, error: 'Wait half a minute before sending another report.' }, { status: 429 });
  }
  let body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: 'Send the form again.' }, { status: 400 });
  }
  if (body.website) return NextResponse.json({ ok: true, id: 0 });
  const r = await addCorrection(body);
  if (!r.ok) return NextResponse.json(r, { status: 422 });
  recent.set(ip, Date.now());
  return NextResponse.json(r);
}
