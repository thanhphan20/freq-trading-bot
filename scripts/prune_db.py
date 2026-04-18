import sqlite3
import os
from datetime import datetime, timedelta

DB_PATH = "user_data/dashboard.sqlite"

def prune_db():
    if not os.path.exists(DB_PATH):
        print(f"Error: Database not found at {DB_PATH}")
        return

    print(f"Pruning local database: {DB_PATH}")
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    try:
        # 1. Identify Top 10 Strategies
        cursor.execute("SELECT strategy_id FROM strategy_metrics ORDER BY total_profit_abs DESC LIMIT 10")
        top_ids = [row[0] for row in cursor.fetchall()]
        
        if not top_ids:
            print("No strategies found to prune.")
            return

        print(f"Keeping Top 10 Strategies: {', '.join(top_ids)}")
        placeholders = ', '.join(['?'] * len(top_ids))

        # 2. Delete non-top strategies
        cursor.execute(f"DELETE FROM strategy_metrics WHERE strategy_id NOT IN ({placeholders})", top_ids)
        print(f"Deleted {cursor.rowcount} low-performance strategies from metrics.")

        # 3. Calculate 6 month cutoff
        cutoff_date = (datetime.now() - timedelta(days=180)).strftime('%Y-%m-%d')
        print(f"Pruning data older than: {cutoff_date}")

        # 4. Prune Equity Curve
        cursor.execute(f"DELETE FROM equity_curve WHERE strategy_id NOT IN ({placeholders}) OR timestamp < ?", top_ids + [cutoff_date])
        print(f"Deleted {cursor.rowcount} rows from equity_curve.")

        # 5. Prune Daily Performance
        cursor.execute(f"DELETE FROM daily_performance WHERE strategy_id NOT IN ({placeholders}) OR date < ?", top_ids + [cutoff_date])
        print(f"Deleted {cursor.rowcount} rows from daily_performance.")

        # 6. Commit and Cleanup
        conn.commit()
        print("Optimizing database file size (VACUUM)...")
        conn.execute("VACUUM")
        print("Database pruning complete!")

    except Exception as e:
        print(f"Error during pruning: {e}")
        conn.rollback()
    finally:
        conn.close()

if __name__ == "__main__":
    prune_db()
