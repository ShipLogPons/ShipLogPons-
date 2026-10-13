import { NextResponse } from 'next/server';
import { getIndex, shipsOf } from '@/lib/data';

export async function GET() {
  const { projects, updatedAt } = await getIndex();
  const ships = shipsOf(projects, 30);
  return NextResponse.json({ updatedAt, count: ships.length, ships }, { headers: { 'access-control-allow-origin': '*' } });
}
