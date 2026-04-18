import { createClient } from '@libsql/client';
import path from 'path';

// Load static demo data as a hard fallback
import demoData from '../data/demo_data.json';

// Environment Configuration
export const IS_DEMO_MODE = process.env.NEXT_PUBLIC_DEMO_MODE === 'true';
const TURSO_URL = process.env.TURSO_URL;
const TURSO_TOKEN = process.env.TURSO_AUTH_TOKEN;

// Local DB Path
const DB_PATH = path.resolve(process.cwd(), '../user_data/dashboard.sqlite');

/**
 * Smart Query Engine
 * 1. Priority: Turso Cloud (if credentials exist)
 * 2. Fallback: Static JSON (if DEMO_MODE is true)
 * 3. Local: SQLite (for local dev)
 */
export async function queryDb<T = unknown>(query: string, params: unknown[] = []): Promise<T[]> {
  // --- 1. TURSO CLOUD MODE ---
  if (TURSO_URL) {
    try {
      const client = createClient({
        url: TURSO_URL,
        authToken: TURSO_TOKEN,
      });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = await client.execute({ sql: query, args: params as any });
      // Convert result to standard array of objects
      return result.rows.map(row => {
        const obj: Record<string, unknown> = {};
        result.columns.forEach((col, idx) => {
          obj[col] = row[idx];
        });
        return obj as T;
      });
    } catch (err) {
      console.error('Turso Query Error:', err);
      // Fall through to JSON if Turso fails
    }
  }

  // --- 2. STATIC JSON MODE ---
  if (IS_DEMO_MODE) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data = demoData as any;
    const lowerQuery = query.toLowerCase();
    if (lowerQuery.includes('strategy_metrics')) {
      return data.strategies as T[];
    }
    if (lowerQuery.includes('equity_curve')) {
      return data.equityCurve as T[];
    }
    if (lowerQuery.includes('daily_performance')) {
      return data.dailyPerformance as T[];
    }
    return [];
  }

  // --- 3. LOCAL SQLITE MODE (For local development only) ---
  try {
    // We use eval('require') to prevent Next.js from bundling sqlite3 in production/Vercel
    const sqlite3 = eval('require("sqlite3")');
    return new Promise((resolve, reject) => {
      const db = new sqlite3.Database(DB_PATH, sqlite3.OPEN_READONLY, (err: Error | null) => {
        if (err) return reject(err);
      });

      db.all(query, params, (err: Error | null, rows: T[]) => {
        db.close();
        if (err) reject(err);
        else resolve(rows);
      });
    });
  } catch {
    console.warn('Local SQLite not available, falling back to empty results.');
    return [];
  }
}
