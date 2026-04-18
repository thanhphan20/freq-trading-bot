import sqlite3
import pandas as pd
import glob
import os
import numpy as np
from datetime import datetime

# Path to the dashboard database (mounted to host)
DASHBOARD_DB = "user_data/dashboard.sqlite"

def init_db():
    conn = sqlite3.connect(DASHBOARD_DB)
    cursor = conn.cursor()
    
    # Raw trades table
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS trades (
        id INTEGER,
        bot_name TEXT,
        strategy_name TEXT,
        strategy_id TEXT,
        open_date DATETIME,
        close_date DATETIME,
        close_profit_abs REAL,
        close_profit_pct REAL,
        trade_duration_min REAL,
        is_win INTEGER,
        PRIMARY KEY(id, bot_name)
    )
    ''')

    # Metrics
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS strategy_metrics (
        strategy_id TEXT PRIMARY KEY,
        bot_name TEXT,
        strategy_name TEXT,
        total_profit_abs REAL,
        total_profit_pct REAL,
        total_trades INTEGER,
        win_rate REAL,
        max_drawdown REAL,
        sharpe_ratio REAL,
        avg_duration_min REAL,
        updated_at DATETIME
    )
    ''')
    
    # Daily Performance snapshot
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS daily_performance (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        strategy_id TEXT,
        date DATE,
        daily_profit_abs REAL,
        cumulative_profit_abs REAL,
        trades_count INTEGER,
        wins INTEGER,
        UNIQUE(strategy_id, date)
    )
    ''')

    # Equity Curve
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS equity_curve (
        strategy_id TEXT,
        timestamp DATETIME,
        profit_abs REAL,
        cumulative_profit REAL,
        drawdown REAL,
        UNIQUE(strategy_id, timestamp)
    )
    ''')

    conn.commit()
    return conn

def calculate_sharpe(daily_returns):
    if len(daily_returns) < 2:
        return 0.0
    mean_return = daily_returns.mean()
    std_return = daily_returns.std()
    if std_return == 0:
        return 0.0
    return (mean_return / std_return) * np.sqrt(365) # Annualized Sharpe ratio assuming daily data

def process_bot_db(source_db_path, bot_name, conn):
    if not os.path.exists(source_db_path):
        print(f"Source DB not found: {source_db_path}")
        return

    try:
        # Get the last processed close_date for this bot to enable incremental updates
        cursor = conn.cursor()
        cursor.execute("SELECT MAX(close_date) FROM trades WHERE bot_name = ?", (bot_name,))
        last_date_row = cursor.fetchone()
        last_close_date = last_date_row[0] if last_date_row and last_date_row[0] else '1970-01-01 00:00:00'

        # Read only new trades using read-only mode to prevent locks
        db_uri = f"file:{os.path.abspath(source_db_path)}?mode=ro"
        source_conn = sqlite3.connect(db_uri, uri=True)
        
        query = f"""
            SELECT id, strategy as strategy_name, open_date, close_date, close_profit_abs, close_profit as close_profit_pct 
            FROM trades 
            WHERE is_open = 0 AND close_date > '{last_close_date}'
        """
        new_trades_df = pd.read_sql_query(query, source_conn)
        source_conn.close()

        if not new_trades_df.empty:
            new_trades_df['bot_name'] = bot_name
            new_trades_df['strategy_id'] = bot_name + "_" + new_trades_df['strategy_name']
            
            # Additional raw fields
            new_trades_df['open_date'] = pd.to_datetime(new_trades_df['open_date'])
            new_trades_df['close_date'] = pd.to_datetime(new_trades_df['close_date'])
            
            # calculate trade duration
            new_trades_df['trade_duration_min'] = (new_trades_df['close_date'] - new_trades_df['open_date']).dt.total_seconds() / 60.0
            new_trades_df['is_win'] = (new_trades_df['close_profit_abs'] > 0).astype(int)

            cursor = conn.cursor()
            for _, row in new_trades_df.iterrows():
                try:
                    cursor.execute('''
                    INSERT OR IGNORE INTO trades 
                    (id, bot_name, strategy_name, strategy_id, open_date, close_date, close_profit_abs, close_profit_pct, trade_duration_min, is_win)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    ''', (row['id'], row['bot_name'], row['strategy_name'], row['strategy_id'], str(row['open_date']), str(row['close_date']), row['close_profit_abs'], row['close_profit_pct'], row['trade_duration_min'], row['is_win']))
                except Exception:
                    pass
            conn.commit()
            print(f"[{bot_name}] Appended {len(new_trades_df)} new trades.")
        else:
            print(f"[{bot_name}] No new trades since {last_close_date}.")

    except Exception as e:
        print(f"Error processing {source_db_path}: {e}")

def update_metrics(conn):
    try:
        df = pd.read_sql_query("SELECT * FROM trades ORDER BY close_date ASC", conn)
        if df.empty:
            return

        df['close_date'] = pd.to_datetime(df['close_date'])
        df['date'] = df['close_date'].dt.date

        strategies = df['strategy_id'].unique()
        cursor = conn.cursor()

        for strat_id in strategies:
            strat_df = df[df['strategy_id'] == strat_id].copy()
            strat_df = strat_df.sort_values('close_date')

            # Global Metrics
            bot_name = strat_df.iloc[0]['bot_name']
            strategy_name = strat_df.iloc[0]['strategy_name']
            total_trades = len(strat_df)
            wins = strat_df['is_win'].sum()
            win_rate = (wins / total_trades) * 100 if total_trades > 0 else 0
            
            total_profit_abs = strat_df['close_profit_abs'].sum()
            total_profit_pct = (strat_df['close_profit_pct'].sum()) * 100 if 'close_profit_pct' in strat_df.columns else 0.0
            
            avg_duration = strat_df['trade_duration_min'].mean()

            # Cumulative and Drawdown
            strat_df['cumulative_profit'] = strat_df['close_profit_abs'].cumsum()
            strat_df['peak_profit'] = strat_df['cumulative_profit'].cummax()
            strat_df['drawdown'] = strat_df['cumulative_profit'] - strat_df['peak_profit'] # negative value
            max_drawdown = strat_df['drawdown'].min()

            # Daily Performance (for Sharpe & Snapshots)
            daily_stats = strat_df.groupby('date').agg(
                daily_profit_abs=('close_profit_abs', 'sum'),
                trades_count=('id', 'count'),
                wins=('is_win', 'sum')
            ).reset_index()
            
            sharpe_ratio = calculate_sharpe(daily_stats['daily_profit_abs'])

            # 1. Update strategy_metrics
            cursor.execute('''
            INSERT OR REPLACE INTO strategy_metrics 
            (strategy_id, bot_name, strategy_name, total_profit_abs, total_profit_pct, 
             total_trades, win_rate, max_drawdown, sharpe_ratio, avg_duration_min, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ''', (strat_id, bot_name, strategy_name, float(total_profit_abs), float(total_profit_pct),
                  int(total_trades), float(win_rate), float(max_drawdown), float(sharpe_ratio), 
                  float(avg_duration), datetime.now()))

            # 2. Update daily_performance
            cumulative_daily = 0
            for _, row in daily_stats.iterrows():
                cumulative_daily += row['daily_profit_abs']
                cursor.execute('''
                INSERT OR REPLACE INTO daily_performance 
                (strategy_id, date, daily_profit_abs, cumulative_profit_abs, trades_count, wins)
                VALUES (?, ?, ?, ?, ?, ?)
                ''', (strat_id, row['date'].strftime('%Y-%m-%d'), float(row['daily_profit_abs']), 
                      float(cumulative_daily), int(row['trades_count']), int(row['wins'])))

            # 3. Create downsampled Equity Curve (Grouped by hour to prevent UI lag)
            strat_df['hour'] = strat_df['close_date'].dt.floor('h')
            hourly_curve = strat_df.groupby('hour').agg(
                profit_abs=('close_profit_abs', 'sum')
            ).reset_index().sort_values('hour')
            
            hourly_curve['cumulative_profit'] = hourly_curve['profit_abs'].cumsum()
            hourly_curve['peak'] = hourly_curve['cumulative_profit'].cummax()
            hourly_curve['drawdown'] = hourly_curve['cumulative_profit'] - hourly_curve['peak']

            for _, row in hourly_curve.iterrows():
                cursor.execute('''
                INSERT OR REPLACE INTO equity_curve
                (strategy_id, timestamp, profit_abs, cumulative_profit, drawdown)
                VALUES (?, ?, ?, ?, ?)
                ''', (strat_id, row['hour'].strftime('%Y-%m-%d %H:%M:%S'), float(row['profit_abs']), 
                      float(row['cumulative_profit']), float(row['drawdown'])))

        conn.commit()
    except Exception as e:
        print(f"Error calculating metrics: {e}")

if __name__ == "__main__":
    print("Starting Aggregator...")
    conn = init_db()
    
    # Process the main freqtrade DB
    process_bot_db("/freqtrade/user_data/tradesv3.sqlite", "main", conn)
    
    # Process the parallel bots' DBs
    bot_dbs = glob.glob("/freqtrade/user_data/bot*_trades.sqlite")
    for db_path in bot_dbs:
        bot_name = os.path.basename(db_path).replace("_trades.sqlite", "")
        process_bot_db(db_path, bot_name, conn)

    print("Updating metrics and pre-computing curves...")
    update_metrics(conn)

    conn.close()
    print("Aggregation complete.")
