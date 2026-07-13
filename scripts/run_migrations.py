import os
import sys
import psycopg2
from dotenv import load_dotenv

load_dotenv('frontend/.env.local')

def get_db_connection():
    db_url = os.environ.get("DATABASE_URL")
    if not db_url:
        print("Error: DATABASE_URL environment variable is not set.")
        sys.exit(1)
    try:
        # Increase timeout if database is waking up
        return psycopg2.connect(db_url, connect_timeout=10)
    except Exception as e:
        print(f"Database connection failed: {e}")
        sys.exit(1)

def run_migration(conn, file_path):
    print(f"Applying {file_path}...")
    with open(file_path, "r", encoding="utf-8") as f:
        sql = f.read()
    
    with conn.cursor() as cur:
        try:
            cur.execute(sql)
            conn.commit()
            print("Successfully applied.")
        except Exception as e:
            print(f"Error applying {file_path}: {e}")
            conn.rollback()

if __name__ == "__main__":
    migrations = [
        "../db/migrations/001_create_tables.sql",
        "../db/migrations/002_add_data_quality_columns.sql",
        "../db/migrations/003_create_platform_rules.sql",
        "../db/migrations/004_create_export_log.sql"
    ]
    
    conn = get_db_connection()
    for migration in migrations:
        run_migration(conn, os.path.join(os.path.dirname(__file__), migration))
    conn.close()
