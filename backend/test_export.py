import requests

payload = {
    "geography_id": "colombia",
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

if __name__ == "__main__":
    res = requests.post(
        "https://hydro-backend-54n4ik523a-uc.a.run.app/export",
        json=payload,
        timeout=300,
    )
    print(res.status_code)
    print(res.text[:500])
