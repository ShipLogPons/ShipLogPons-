import { NextResponse } from 'next/server';
import { put } from '@vercel/blob';
import { hasStore } from '@/lib/store';

const TYPES = { 'image/png': 'png', 'image/jpeg': 'jpg', 'image/webp': 'webp', 'image/gif': 'gif' };
const MAX = 2 * 1024 * 1024;
const recent = new Map();

// Stores a token logo for a Pons launch made from Shiplog and returns its public address.
export async function POST(req) {
  if (!hasStore()) return NextResponse.json({ ok: false, error: 'Logo upload is not set up on this deployment.' }, { status: 503 });
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0] || 'unknown';
  if (Date.now() - (recent.get(ip) || 0) < 5000) return NextResponse.json({ ok: false, error: 'Wait a few seconds and try again.' }, { status: 429 });
  recent.set(ip, Date.now());
  let file;
  try {
    file = (await req.formData()).get('file');
  } catch {
    return NextResponse.json({ ok: false, error: 'Choose an image and try again.' }, { status: 400 });
  }
  if (!file || typeof file === 'string') return NextResponse.json({ ok: false, error: 'Choose an image and try again.' }, { status: 400 });
  const ext = TYPES[file.type];
  if (!ext) return NextResponse.json({ ok: false, error: 'Use a PNG, JPG, WebP or GIF image.' }, { status: 415 });
  if (file.size > MAX) return NextResponse.json({ ok: false, error: 'The image is larger than 2 MB. Use a smaller one.' }, { status: 413 });
  const id = crypto.randomUUID().replace(/-/g, '');
  const blob = await put(`launch-logos/${id}.${ext}`, file, { access: 'public', addRandomSuffix: false, contentType: file.type, cacheControlMaxAge: 31536000 });
  return NextResponse.json({ ok: true, url: blob.url });
}
