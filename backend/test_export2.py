import requests
import os
from dotenv import load_dotenv
import psycopg2

load_dotenv()
db_url = os.environ["DATABASE_URL"]
conn = psycopg2.connect(db_url)
cur = conn.cursor()
cur.execute("SELECT id FROM admin_boundaries LIMIT 1;")
geo_id = cur.fetchone()[0]
conn.close()

print(f"Using geo_id: {geo_id}")

payload = {
    "geography_id": geo_id,
    "density_preset": "balanced",
    "classification_preset": "standard",
    "typography": "gallery_poster",
    "title": "Test",
    "subtitle": "test",
    "design_asset_mode": False,
    "show_legend": True,
    "show_metadata": True,
    "export_format": "png",
    "export_size": "digital_poster",
    "style": {
        "schema_version": 2,
        "mode": "standard",
        "preset_id": "abyss"
    }
}

res = requests.post("https://hydro-backend-54n4ik523a-uc.a.run.app/export", json=payload)
print(res.status_code)
print(res.text[:500])
