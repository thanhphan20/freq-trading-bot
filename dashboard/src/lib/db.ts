import sqlite3 from 'sqlite3';
import path from 'path';

// Resolve to ft_userdata/user_data/dashboard.sqlite
const dbPath = path.resolve(process.cwd(), '../user_data/dashboard.sqlite');

export function getDbConnection() {
  return new sqlite3.Database(dbPath, sqlite3.OPEN_READONLY, (err) => {
    if (err) {
      console.error('Error connecting to database:', err);
    }
  });
}

export function queryDb<T = unknown>(query: string, params: unknown[] = []): Promise<T[]> {
  return new Promise((resolve, reject) => {
    const db = getDbConnection();
    db.all(query, params, (err, rows) => {
      db.close();
      if (err) reject(err);
      else resolve(rows as T[]);
    });
  });
}
