import subprocess
import os
import sys

# Define the regions and their corresponding ISO-3166-1 alpha-3 country codes
REGIONS = {
    "south_america": [
        "ARG", "BOL", "BRA", "CHL", "COL", "ECU", "GUF", "GUY", 
        "PRY", "PER", "SUR", "URY", "VEN"
    ],
    "north_central_america": [
        # North America
        "CAN", "USA", "MEX",
        # Central America
        "BLZ", "CRI", "SLV", "GTM", "HND", "NIC", "PAN",
        # Caribbean
        "CUB", "DOM", "HTI", "JAM", "PRI", "TTO", "BHS", 
        "BRB", "ATG", "KNA", "LCA", "VCT", "GRD", "DMA"
    ]
}

def run_command(command, cwd=None):
    print(f"Running: {' '.join(command)}")
    result = subprocess.run(command, cwd=cwd, text=True)
    if result.returncode != 0:
        print(f"Error executing command: {' '.join(command)}")
    return result.returncode == 0

def main():
    script_dir = os.path.dirname(os.path.abspath(__file__))
    project_root = os.path.dirname(script_dir)
    
    print("Starting bulk ingestion of ADM0 boundaries...")
    
    success_count = 0
    fail_count = 0
    
    for region_code, countries in REGIONS.items():
        print(f"\n--- Processing Region: {region_code} ---")
        for country_code in set(countries): # set() to remove any duplicates
            print(f"\nProcessing {country_code} ({region_code})...")
            
            geojson_path = f"data/boundaries/geoBoundaries-{country_code}-ADM0.geojson"
            
            if not os.path.exists(os.path.join(project_root, geojson_path)):
                print(f"Expected file {geojson_path} not found. Skipping import.")
                fail_count += 1
                continue
                
            # Step 2: Import via Docker
            import_cmd = [
                "docker", "compose", "-f", "scripts/docker-compose-ingest.yml",
                "run", "--rm", "ingest",
                "python", "scripts/import_boundaries.py",
                geojson_path,
                "0",
                region_code
            ]
            
            if run_command(import_cmd, cwd=project_root):
                success_count += 1
            else:
                fail_count += 1
                
    print(f"\nBulk ingestion complete! Success: {success_count}, Failed: {fail_count}")

if __name__ == "__main__":
    main()
