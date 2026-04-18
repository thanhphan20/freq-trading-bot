import sqlite3
import json
import os
from datetime import datetime

# Paths
DB_PATH = "user_data/dashboard.sqlite"
OUTPUT_PATH = "dashboard/src/data/demo_data.json"

def export_to_json():
    if not os.path.exists(DB_PATH):
        print(f"Error: Database not found at {DB_PATH}")
        return

    print(f"Exporting data from {DB_PATH}...")
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row  # This allows us to access columns by name
    cursor = conn.cursor()

    data = {
        "generated_at": datetime.now().isoformat(),
        "strategies": [],
        "equityCurve": [],
        "dailyPerformance": []
    }

    try:
        # 1. Export Strategy Metrics
        print("Fetching strategy_metrics...")
        cursor.execute("SELECT * FROM strategy_metrics ORDER BY total_profit_abs DESC")
        data["strategies"] = [dict(row) for row in cursor.fetchall()]

        # 2. Export Equity Curve
        print("Fetching equity_curve...")
        cursor.execute("SELECT * FROM equity_curve ORDER BY timestamp ASC")
        data["equityCurve"] = [dict(row) for row in cursor.fetchall()]

        # 3. Export Daily Performance
        print("Fetching daily_performance...")
        cursor.execute("SELECT * FROM daily_performance ORDER BY date ASC")
        data["dailyPerformance"] = [dict(row) for row in cursor.fetchall()]

        # 4. Save to JSON
        print(f"Saving to {OUTPUT_PATH}...")
        with open(OUTPUT_PATH, 'w') as f:
            json.dump(data, f, indent=2)

        print("Export successful!")
        print(f"Total Strategies: {len(data['strategies'])}")
        print(f"Total Equity Points: {len(data['equityCurve'])}")
        print(f"Total Daily Snapshots: {len(data['dailyPerformance'])}")

    except Exception as e:
        print(f"Error during export: {e}")
    finally:
        conn.close()

if __name__ == "__main__":
    export_to_json()
