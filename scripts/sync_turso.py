import sqlite3
import os
import sys

# Try to import libsql_client
try:
    import libsql_client
except ImportError:
    print("Error: 'libsql-client' not found. Please install it using: pip install libsql-client")
    sys.exit(1)

# Configuration
LOCAL_DB = "user_data/dashboard.sqlite"
TURSO_URL = os.getenv("TURSO_URL")
TURSO_TOKEN = os.getenv("TURSO_AUTH_TOKEN")

def sync():
    if not TURSO_URL or not TURSO_TOKEN:
        print("Error: TURSO_URL and TURSO_AUTH_TOKEN environment variables must be set.")
        return

    if not os.path.exists(LOCAL_DB):
        print(f"Error: Local database not found at {LOCAL_DB}")
        return

    print(f"Connecting to Turso: {TURSO_URL}...")
    remote_client = libsql_client.create_client_sync(url=TURSO_URL, auth_token=TURSO_TOKEN)
    
    local_conn = sqlite3.connect(LOCAL_DB)
    local_cursor = local_conn.cursor()

    tables = ["strategy_metrics", "daily_performance", "equity_curve"]

    for table in tables:
        print(f"Syncing table: {table}...")
        
        # 1. Fetch local data
        local_cursor.execute(f"SELECT * FROM {table}")
        columns = [description[0] for description in local_cursor.description]
        rows = local_cursor.fetchall()

        if not rows:
            print(f"  No data in {table}, skipping.")
            continue

        # 2. Clear remote table
        print(f"  Clearing remote {table}...")
        remote_client.execute(f"DELETE FROM {table}")

        # 3. Batch Insert to Remote
        # We batch in groups of 50 to avoid payload size limits
        batch_size = 50
        placeholders = ", ".join(["?"] * len(columns))
        insert_query = f"INSERT INTO {table} ({', '.join(columns)}) VALUES ({placeholders})"
        
        print(f"  Uploading {len(rows)} rows...")
        for i in range(0, len(rows), batch_size):
            batch = rows[i:i + batch_size]
            # Convert sqlite rows to list of values
            batch_values = [list(row) for row in batch]
            
            # Turso sync client execute batch
            # We use a transaction if possible, but for simplicity here we just execute
            for row_vals in batch_values:
                remote_client.execute(insert_query, row_vals)
            
            if (i + batch_size) % 500 == 0 or (i + batch_size) >= len(rows):
                print(f"    Progress: {min(i + batch_size, len(rows))}/{len(rows)}")

    local_conn.close()
    print("\n✅ Sync complete! Your Turso Cloud DB is now up to date.")

if __name__ == "__main__":
    sync()
