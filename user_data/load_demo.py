import os
import glob
import json
import zipfile
import pandas as pd
import sqlite3
import sys

# Import aggregator logic
from aggregator import init_db, update_metrics, DASHBOARD_DB

def load_demo_data():
    conn = init_db()
    
    # 1. Clear existing data to make it a fresh demo
    cursor = conn.cursor()
    cursor.execute("DELETE FROM trades")
    cursor.execute("DELETE FROM strategy_metrics")
    cursor.execute("DELETE FROM daily_performance")
    cursor.execute("DELETE FROM equity_curve")
    conn.commit()
    print("Database cleared for demo mode.")

    # 2. Find all zip files
    zip_files = glob.glob("/freqtrade/user_data/backtest_results/*.zip")
    
    all_trades = []
    fake_id = 1
    for zip_path in zip_files:
        try:
            with zipfile.ZipFile(zip_path, 'r') as z:
                # Get the main json file (starts with backtest-result...json)
                json_files = [f for f in z.namelist() if f.endswith('.json') and not f.endswith('meta.json')]
                if not json_files:
                    continue
                
                data = json.loads(z.read(json_files[0]))
                
                if 'strategy' not in data:
                    continue
                
                for strategy_name, strategy_data in data['strategy'].items():
                    trades = strategy_data.get('trades', [])
                    for t in trades:
                        if t.get('is_open', False):
                            continue
                        
                        trade_dict = {
                            'id': fake_id,
                            'bot_name': 'demo_bt',
                            'strategy_name': strategy_name,
                            'strategy_id': 'demo_' + strategy_name,
                            'open_date': str(t['open_date']),
                            'close_date': str(t.get('close_date', t['open_date'])),
                            'close_profit_abs': t.get('profit_abs', 0.0),
                            'close_profit_pct': t.get('profit_ratio', 0.0),
                            'trade_duration_min': t.get('trade_duration', 0.0),
                            'is_win': 1 if t.get('profit_abs', 0.0) > 0 else 0
                        }
                        all_trades.append(trade_dict)
                        fake_id += 1
                        
        except Exception as e:
            print(f"Error reading {zip_path}: {e}")

    if not all_trades:
        print("No demo trades found in backtest results!")
        return

    # Bulk insert
    df = pd.DataFrame(all_trades)
    # Remove duplicates if multiple backtests overlap
    df = df.drop_duplicates(subset=['strategy_name', 'close_date'])

    df.to_sql('trades', conn, if_exists='append', index=False)
    print(f"Loaded {len(df)} simulated demo trades into database.")

    # Call aggregator's metric updater
    print("Calculating deep analytics for demo data...")
    update_metrics(conn)
    conn.close()
    print("Demo mode ready! Refresh your dashboard.")

if __name__ == "__main__":
    load_demo_data()
