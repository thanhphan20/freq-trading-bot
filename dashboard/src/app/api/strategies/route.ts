import { NextResponse } from 'next/server';
import { queryDb } from '@/lib/db';

export async function GET() {
  try {
    const strategies = await queryDb('SELECT * FROM strategy_metrics ORDER BY total_profit_abs DESC');
    return NextResponse.json({ strategies });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to fetch strategies' }, { status: 500 });
  }
}
