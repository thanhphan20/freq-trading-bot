import { NextResponse } from 'next/server';
import { queryDb } from '@/lib/db';

export async function GET() {
  try {
    const curve = await queryDb('SELECT * FROM equity_curve ORDER BY timestamp ASC');
    return NextResponse.json({ curve });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to fetch equity curve' }, { status: 500 });
  }
}
