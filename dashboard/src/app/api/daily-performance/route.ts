import { NextResponse } from 'next/server';
import { queryDb } from '@/lib/db';

export async function GET() {
  try {
    const performance = await queryDb('SELECT * FROM daily_performance ORDER BY date ASC');
    return NextResponse.json({ performance });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to fetch daily performance' }, { status: 500 });
  }
}
