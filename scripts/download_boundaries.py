import argparse
import json
import os
import urllib.request

def download_geojson(iso, admin_level, output_dir):
    # Construct geoBoundaries API URL
    url = f"https://www.geoboundaries.org/api/current/gbOpen/{iso.upper()}/ADM{admin_level}/"
    print(f"Querying geoBoundaries API for {iso} ADM{admin_level}...")
    
    try:
        req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
        with urllib.request.urlopen(req) as response:
            data = json.loads(response.read().decode())
            
        geojson_url = data.get('gjDownloadURL')
        if not geojson_url:
            print("Error: Could not find GeoJSON download URL in API response.")
            return

        print(f"Downloading GeoJSON from: {geojson_url}")
        os.makedirs(output_dir, exist_ok=True)
        out_path = os.path.join(output_dir, f"geoBoundaries-{iso}-ADM{admin_level}.geojson")
        
        req_gj = urllib.request.Request(geojson_url, headers={'User-Agent': 'Mozilla/5.0'})
        with urllib.request.urlopen(req_gj) as response_gj:
            with open(out_path, 'wb') as f:
                f.write(response_gj.read())
        
        print(f"Successfully downloaded to: {out_path}")
        
    except Exception as e:
        print(f"Error fetching boundaries: {e}")

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("iso", help="3-letter ISO country code (e.g., GUY)")
    parser.add_argument("admin_level", type=int, choices=[0,1,2], help="Admin level")
    parser.add_argument("--output", default="../data/boundaries", help="Output directory")
    args = parser.parse_args()
    
    download_geojson(args.iso, args.admin_level, args.output)
