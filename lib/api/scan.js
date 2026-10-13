import { NextResponse } from 'next/server';
import { scanToken } from '@/lib/scan';

export async function GET(req) {
  const result = await scanToken(new URL(req.url).searchParams.get('address'));
  const headers = { 'access-control-allow-origin': '*' };
  if (result.error) return NextResponse.json(result, { status: 400, headers });
  return NextResponse.json(result, { headers });
}
