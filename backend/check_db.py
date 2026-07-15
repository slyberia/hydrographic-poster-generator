import asyncio
import asyncpg
import os
from dotenv import load_dotenv

async def main():
    load_dotenv()
    db_url = os.environ.get("DATABASE_URL")
    if not db_url:
        print("Error: DATABASE_URL not found in .env")
        return

    print("Connecting to Supabase...")
    try:
        conn = await asyncpg.connect(db_url)
    except Exception as e:
        print(f"Failed to connect: {e}")
        return

    print("\n--- Database Checks ---")
    
    # Check tables exist
    tables = await conn.fetch("""
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public'
    """)
    table_names = [t['table_name'] for t in tables]
    print(f"Tables in public schema: {', '.join(table_names)}")

    if 'hydro_rivers' in table_names:
        rivers_count = await conn.fetchval("SELECT COUNT(*) FROM hydro_rivers")
        print(f"hydro_rivers row count: {rivers_count}")
        
        # Breakdown by region
        regions = await conn.fetch("SELECT region_code, COUNT(*) FROM hydro_rivers GROUP BY region_code")
        print("Rivers by region:")
        for r in regions:
            print(f"  - {r['region_code']}: {r['count']}")
    else:
        print("table 'hydro_rivers' not found.")

    if 'admin_boundaries' in table_names:
        boundaries_count = await conn.fetchval("SELECT COUNT(*) FROM admin_boundaries")
        print(f"\nadmin_boundaries row count: {boundaries_count}")
        
        # Breakdown by admin level
        levels = await conn.fetch("SELECT admin_level, COUNT(*) FROM admin_boundaries GROUP BY admin_level")
        print("Boundaries by admin_level:")
        for l in levels:
            print(f"  - {l['admin_level']}: {l['count']}")
    else:
        print("table 'admin_boundaries' not found.")

    await conn.close()

if __name__ == "__main__":
    asyncio.run(main())
