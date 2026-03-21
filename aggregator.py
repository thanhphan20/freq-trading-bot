import sqlite3
import pandas as pd
import glob
import os
from datetime import datetime

# Path to the dashboard database
DASHBOARD_DB = "dashboard.sqlite"

def init_db():
    conn = sqlite3.connect(DASHBOARD_DB)
    cursor = conn.cursor()
    
    # Create tables
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS strategy_metrics (
        strategy_name TEXT PRIMARY KEY,
        total_profit_abs REAL,
        total_profit_pct REAL,
        total_trades INTEGER,
        win_rate REAL,
        max_drawdown REAL,
        updated_at DATETIME
    )
    ''')
    
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS daily_performance (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        strategy_name TEXT,
        date DATE,
        daily_profit_abs REAL,
        cumulative_profit_abs REAL,
        trades_count INTEGER,
        wins INTEGER,
        UNIQUE(strategy_name, date)
    )
    ''')
    
    conn.commit()
    return conn

def process_trades(source_db_path, conn):
    if not os.path.exists(source_db_path):
        print(f"Source DB not found: {source_db_path}")
        return

    try:
        # Read trades using pandas
        source_conn = sqlite3.connect(source_db_path)
        query = "SELECT strategy, open_date, close_date, close_profit_abs, is_open FROM trades WHERE is_open = 0"
        df = pd.read_sql_query(query, source_conn)
        source_conn.close()

        if df.empty:
            print(f"No closed trades found in {source_db_path}")
            return

        # Ensure datetime format
        df['close_date'] = pd.to_datetime(df['close_date'])
        df['date'] = df['close_date'].dt.date
        df['win'] = (df['close_profit_abs'] > 0).astype(int)

        strategies = df['strategy'].unique()
        
        cursor = conn.cursor()

        for strategy in strategies:
            strat_df = df[df['strategy'] == strategy].copy()
            strat_df = strat_df.sort_values('close_date')

            total_trades = len(strat_df)
            wins = strat_df['win'].sum()
            win_rate = (wins / total_trades) * 100 if total_trades > 0 else 0
            total_profit_abs = strat_df['close_profit_abs'].sum()

            # Calculate daily performance
            daily_stats = strat_df.groupby('date').agg(
                daily_profit_abs=('close_profit_abs', 'sum'),
                trades_count=('close_profit_abs', 'count'),
                wins=('win', 'sum')
            ).reset_index()

            # Insert or replace strategy metrics
            cursor.execute('''
            INSERT OR REPLACE INTO strategy_metrics 
            (strategy_name, total_profit_abs, total_profit_pct, total_trades, win_rate, max_drawdown, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?)
            ''', (strategy, float(total_profit_abs), 0.0, int(total_trades), float(win_rate), 0.0, datetime.now()))

            cumulative_profit = 0
            # Insert daily performance
            for _, row in daily_stats.iterrows():
                cumulative_profit += row['daily_profit_abs']
                cursor.execute('''
                INSERT OR REPLACE INTO daily_performance 
                (strategy_name, date, daily_profit_abs, cumulative_profit_abs, trades_count, wins)
                VALUES (?, ?, ?, ?, ?, ?)
                ''', (strategy, row['date'].strftime('%Y-%m-%d'), float(row['daily_profit_abs']), 
                      float(cumulative_profit), int(row['trades_count']), int(row['wins'])))

        conn.commit()
        print(f"Successfully processed {len(strategies)} strategies from {source_db_path}")

    except Exception as e:
        print(f"Error processing {source_db_path}: {e}")

if __name__ == "__main__":
    print("Starting Aggregator...")
    conn = init_db()
    
    # Process the main freqtrade DB
    process_trades("user_data/tradesv3.sqlite", conn)
    
    # Process any other bot DBs if they exist in subfolders
    for db_path in glob.glob("user_data/bot*/tradesv3.sqlite"):
        process_trades(db_path, conn)

    conn.close()
    print("Aggregation complete.")
