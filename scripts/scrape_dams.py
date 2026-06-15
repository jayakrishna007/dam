import urllib.request
import re
import json
import os

URLS = {
    "tb": "http://tbboard.gov.in/daily_000/daily_level_list.php",
    "tn": "https://tnagriculture.in/ARS/home/reservoir",
    "oi": "https://www.oneindia.com/dam-water-level-today-in-india/"
}

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36"
}

# Static metadata mapping (River and District) for the dams
DAM_METADATA = {
    # Karnataka
    "krishnaraja sagara": {"river": "Cauvery", "district": "Mysuru", "state": "Karnataka"},
    "krs": {"river": "Cauvery", "district": "Mysuru", "state": "Karnataka"},
    "kabini": {"river": "Kabini", "district": "Mysuru", "state": "Karnataka"},
    "harangi": {"river": "Harangi", "district": "Kodagu", "state": "Karnataka"},
    "hemavathy": {"river": "Hemavathy", "district": "Hassan", "state": "Karnataka"},
    "tungabhadra": {"river": "Tungabhadra", "district": "Vijayanagara", "state": "Karnataka"},
    "bhadra": {"river": "Bhadra", "district": "Chikkamagaluru", "state": "Karnataka"},
    "almatti": {"river": "Krishna", "district": "Vijayapura", "state": "Karnataka"},
    "linganamakki": {"river": "Sharavathi", "district": "Shivamogga", "state": "Karnataka"},
    "supa": {"river": "Kali", "district": "Uttara Kannada", "state": "Karnataka"},
    "malaprabha": {"river": "Malaprabha", "district": "Belagavi", "state": "Karnataka"},
    "ghataprabha": {"river": "Ghataprabha", "district": "Belagavi", "state": "Karnataka"},
    "varahi": {"river": "Varahi", "district": "Udupi", "state": "Karnataka"},
    
    # Tamil Nadu
    "mettur": {"river": "Cauvery", "district": "Salem", "state": "Tamil Nadu"},
    "bhavanisagar": {"river": "Bhavani", "district": "Erode", "state": "Tamil Nadu"},
    "amaravathi": {"river": "Amaravathy", "district": "Tiruppur", "state": "Tamil Nadu"},
    "amaravathi*": {"river": "Amaravathy", "district": "Tiruppur", "state": "Tamil Nadu"},
    "periyar": {"river": "Periyar", "district": "Theni", "state": "Tamil Nadu"},
    "periyar**": {"river": "Periyar", "district": "Theni", "state": "Tamil Nadu"},
    "vaigai": {"river": "Vaigai", "district": "Theni", "state": "Tamil Nadu"},
    "papanasam": {"river": "Thamirabarani", "district": "Tirunelveli", "state": "Tamil Nadu"},
    "papanasam          (tn eb dam)": {"river": "Thamirabarani", "district": "Tirunelveli", "state": "Tamil Nadu"},
    "manimuthar": {"river": "Manimuthar", "district": "Tirunelveli", "state": "Tamil Nadu"},
    "pechiparai": {"river": "Kodayar", "district": "Kanyakumari", "state": "Tamil Nadu"},
    "perunchani": {"river": "Paralayar", "district": "Kanyakumari", "state": "Tamil Nadu"},
    "krishnagiri": {"river": "Thenpennai", "district": "Krishnagiri", "state": "Tamil Nadu"},
    "sathanur": {"river": "Thenpennai", "district": "Tiruvannamalai", "state": "Tamil Nadu"},
    "sholayar": {"river": "Sholayar", "district": "Coimbatore", "state": "Tamil Nadu"},
    "parambikulam": {"river": "Parambikulam", "district": "Palakkad", "state": "Tamil Nadu"},
    "aliyar": {"river": "Aliyar", "district": "Coimbatore", "state": "Tamil Nadu"},
    "thirumurthy": {"river": "Thirumurthy", "district": "Tiruppur", "state": "Tamil Nadu"},
    
    # Kerala
    "anayirankal": {"river": "Panniyar", "district": "Idukki", "state": "Kerala"},
    "banasurasagar": {"river": "Karamanathodu", "district": "Wayanad", "state": "Kerala"},
    "idamalayar": {"river": "Idamalayar", "district": "Ernakulam", "state": "Kerala"},
    "idukki": {"river": "Periyar", "district": "Idukki", "state": "Kerala"},
    "kakki": {"river": "Kakkad", "district": "Pathanamthitta", "state": "Kerala"},
    
    # Andhra Pradesh
    "alaganuru balancing": {"river": "Alaganuru", "district": "Kurnool", "state": "Andhra Pradesh"},
    "brahmamsagar": {"river": "Kunduleru", "district": "Kadapa", "state": "Andhra Pradesh"},
    "chitravati balancing": {"river": "Chitravathi", "district": "Anantapur", "state": "Andhra Pradesh"},
    "donkarayi": {"river": "Sileru", "district": "East Godavari", "state": "Andhra Pradesh"},
    "gandikota": {"river": "Penna", "district": "Kadapa", "state": "Andhra Pradesh"},
    
    # Telangana
    "akkampally": {"river": "Krishna", "district": "Nalgonda", "state": "Telangana"},
    "himayathsagar": {"river": "Esi", "district": "Hyderabad", "state": "Telangana"},
    "manjira": {"river": "Manjira", "district": "Medak", "state": "Telangana"},
    "nagarjunsagar": {"river": "Krishna", "district": "Nalgonda", "state": "Telangana"},
    "osmansagar": {"river": "Musi", "district": "Hyderabad", "state": "Telangana"}
}

def clean_number(s):
    if not s:
        return 0.0
    s = re.sub(r'[^\d.]', '', s)
    return float(s) if s else 0.0

def fetch_html(url):
    try:
        req = urllib.request.Request(url, headers=HEADERS)
        with urllib.request.urlopen(req, timeout=20) as response:
            return response.read().decode('utf-8', errors='ignore')
    except Exception as e:
        print(f"Error fetching {url}: {e}")
        return None

def main():
    import time
    start_time = time.time()

    tb_ok = False
    tn_ok = False
    oi_ok = False
    tb_count = 0
    tn_count = 0
    oi_count = 0

    scraped_dams = {}
    
    # --- 1. Scrape Tungabhadra (TB Board) ---
    print("Scraping Tungabhadra Board...")
    tb_html = fetch_html(URLS["tb"])
    if tb_html:
        # Extract metrics
        def extract_tb_metric(html, label):
            pattern = rf"{label}\s*<\/h4>\s*<\/th>\s*<td>\s*<h4 class='text-center'>([^<]+)<\/h4>"
            match = re.search(pattern, html, re.IGNORECASE)
            return match.group(1).strip() if match else None

        storage_str = extract_tb_metric(tb_html, "Reservoir Capacity")
        inflow_str = extract_tb_metric(tb_html, "Inflow Details")
        outflow_str = extract_tb_metric(tb_html, "Outflow Details")
        
        if storage_str:
            storage_val = clean_number(storage_str)
            inflow_val = int(clean_number(inflow_str))
            outflow_val = int(clean_number(outflow_str))
            max_capacity = 105.788
            level_percent = round((storage_val / max_capacity) * 100, 2)
            
            scraped_dams["tungabhadra"] = {
                "name": "Tungabhadra",
                "state": "Karnataka",
                "level": level_percent,
                "capacity": max_capacity,
                "inflow": inflow_val,
                "outflow": outflow_val
            }
            tb_ok = True
            tb_count = 1
            print("  Tungabhadra updated successfully.")

    # --- 2. Scrape TN Agriculture ---
    print("Scraping TN Agriculture...")
    tn_html = fetch_html(URLS["tn"])
    if tn_html:
        # Parse table rows
        tn_pattern = re.compile(
            r'<tr class="(?:bg-info|bg-primary)"\s*>\s*'
            r'<td>([^<]+)</td>\s*'
            r'<td>([^<]*)</td>\s*' # depth
            r'<td>([^<]*)</td>\s*' # capacity M.Cft
            r'<td>([^<]*)</td>\s*' # current level feet
            r'<td>([^<]*)</td>\s*' # current storage M.Cft
            r'<td>([^<]*)</td>\s*' # inflow cusecs
            r'<td>([^<]*)</td>',   # outflow cusecs
            re.DOTALL | re.IGNORECASE
        )
        
        tn_matches = tn_pattern.findall(tn_html)
        for m in tn_matches:
            name_raw = m[0].strip()
            name_key = name_raw.lower().replace("  ", " ").replace(" (tn eb dam)", "").replace("*", "").replace(" dam", "").strip()
            if name_key == "krishna raja sagar":
                name_key = "krs"
                
            capacity_mcft = clean_number(m[2])
            storage_mcft = clean_number(m[4])
            inflow = int(clean_number(m[5])) if m[5].strip() else None
            outflow = int(clean_number(m[6])) if m[6].strip() else None
            
            capacity_tmc = round(capacity_mcft / 1000.0, 3)
            storage_tmc = round(storage_mcft / 1000.0, 3)
            
            if capacity_tmc > 0:
                level_percent = round((storage_tmc / capacity_tmc) * 100, 2)
            else:
                level_percent = 0.0
                
            # Set display name
            disp_name = "Krishna Raja Sagara (KRS)" if name_key == "krs" else name_raw.title()
            # Clean up suffixes
            disp_name = disp_name.replace(" (Tn Eb Dam)", "").replace("*", "").strip()
            
            # Fetch state from mapping
            meta = DAM_METADATA.get(name_key, {"state": "Tamil Nadu"})
            
            scraped_dams[name_key] = {
                "name": disp_name,
                "state": meta["state"],
                "level": level_percent,
                "capacity": capacity_tmc,
                "inflow": inflow,
                "outflow": outflow
            }
        if len(tn_matches) > 0:
            tn_ok = True
            tn_count = len(tn_matches)
        print(f"  Scraped {len(tn_matches)} dams from TN Ag.")

    # --- 3. Scrape OneIndia ---
    print("Scraping OneIndia...")
    oi_html = fetch_html(URLS["oi"])
    if oi_html:
        oi_ok = True
        # Split by states
        sections = re.split(r'<h2 class="oi-damwaterlevel-heading">Dam Water Level Today in ([^<]+)</?h2\s*>', oi_html)
        
        for i in range(1, len(sections), 2):
            state = sections[i].strip()
            # We want Kerala, AP, Telangana
            if state.lower() not in ["kerala", "andhra pradesh", "telangana"]:
                continue
                
            section_content = sections[i+1]
            row_pattern = re.compile(
                r'<td><a[^>]+>\s*<div class="oi-damname">([^<]+)</div>\s*</a>\s*</td>\s*'
                r'<td>\s*<span class="oi-currentstorage">([^<]+)</span>\s*</td>\s*'
                r'<td>\s*<span class="oi-currentlevel">([^<]+)</span>\s*</td>\s*'
                r'<td>\s*([^<\s]+)\s*</td>\s*'
                r'<td>\s*([^<\s]+)\s*</td>',
                re.DOTALL | re.IGNORECASE
            )
            
            rows = row_pattern.findall(section_content)
            for r in rows:
                name_raw = r[0].strip()
                name_key = name_raw.lower().strip()
                
                storage_val = clean_number(r[1])
                capacity_val = clean_number(r[3])
                
                # Kerala is in MCM. Convert MCM to TMC (1 TMC = 28.317 MCM)
                if state.lower() == "kerala":
                    storage_tmc = round(storage_val / 28.317, 3)
                    capacity_tmc = round(capacity_val / 28.317, 3)
                else:
                    storage_tmc = storage_val
                    capacity_tmc = capacity_val
                    
                if capacity_tmc > 0:
                    level_percent = round((storage_tmc / capacity_tmc) * 100, 2)
                else:
                    level_percent = 0.0
                    
                # Skip if we already have it from a more detailed source (like TN Ag)
                if name_key in scraped_dams:
                    continue
                    
                scraped_dams[name_key] = {
                    "name": name_raw,
                    "state": state,
                    "level": level_percent,
                    "capacity": capacity_tmc,
                    "inflow": None,
                    "outflow": None
                }
            oi_count += len(rows)
            print(f"  Scraped {len(rows)} dams for State {state}.")

    # --- 4. Merge with existing static defaults and save ---
    # We want to keep all 12 Karnataka dams, even if some Almatti/Varahi are not scraped
    script_dir = os.path.dirname(os.path.abspath(__file__))
    json_path = os.path.join(script_dir, "..", "src", "data", "dams.json")
    
    # Read existing dams.json to calculate changes
    old_dams = []
    if os.path.exists(json_path):
        try:
            with open(json_path, "r", encoding="utf-8") as f:
                old_dams = json.load(f)
        except Exception as e:
            print(f"Error reading pre-existing dams.json: {e}")

    # We will build a unified list of 37 dams
    # Let's define the final output list
    final_dams = []
    
    # Standard static defaults for dams not scraped
    static_defaults = [
        {"id": 3,  "name": "Bhadra", "river": "Bhadra", "district": "Chikkamagaluru", "level": 88.3, "capacity": 71.5, "inflow": 15200, "outflow": 10400, "state": "Karnataka"},
        {"id": 5,  "name": "Almatti", "river": "Krishna", "district": "Vijayapura", "level": 45.8, "capacity": 129.56, "inflow": 22000, "outflow": 9800, "state": "Karnataka"},
        {"id": 6,  "name": "Linganamakki", "river": "Sharavathi", "district": "Shivamogga", "level": 55.4, "capacity": 151.75, "inflow": 6800, "outflow": 3200, "state": "Karnataka"},
        {"id": 9,  "name": "Supa", "river": "Kali", "district": "Uttara Kannada", "level": 91.2, "capacity": 155.0, "inflow": 11800, "outflow": 14200, "state": "Karnataka"},
        {"id": 10, "name": "Malaprabha", "river": "Malaprabha", "district": "Belagavi", "level": 38.4, "capacity": 37.65, "inflow": 3100, "outflow": 800, "state": "Karnataka"},
        {"id": 11, "name": "Ghataprabha", "river": "Ghataprabha", "district": "Belagavi", "level": 52.1, "capacity": 42.07, "inflow": 4800, "outflow": 1200, "state": "Karnataka"},
        {"id": 12, "name": "Varahi", "river": "Varahi", "district": "Udupi", "level": 67.8, "capacity": 21.66, "inflow": 3900, "outflow": 2100, "state": "Karnataka"}
    ]
    
    # We will iterate through all metadata items and map scraped data
    dam_id_counter = 1
    
    for key, meta in DAM_METADATA.items():
        # Clean the key name for mapping
        scraped_key = key
        if scraped_key == "krishnaraja sagara":
            scraped_key = "krs"
        elif scraped_key == "amaravathi*":
            scraped_key = "amaravathi"
        elif scraped_key == "periyar**":
            scraped_key = "periyar"
        elif scraped_key == "papanasam          (tn eb dam)":
            scraped_key = "papanasam"
            
        # Check if we have scraped data for this dam
        scraped = scraped_dams.get(scraped_key)
        
        if scraped:
            dam_entry = {
                "id": dam_id_counter,
                "name": scraped["name"],
                "river": meta["river"],
                "district": meta["district"],
                "level": scraped["level"],
                "capacity": scraped["capacity"],
                "inflow": scraped["inflow"],
                "outflow": scraped["outflow"],
                "state": meta["state"]
            }
            final_dams.append(dam_entry)
            dam_id_counter += 1
            # Remove from scraped_dams to prevent duplicates
            if scraped_key in scraped_dams:
                del scraped_dams[scraped_key]
                
    # Add any remaining scraped dams that weren't in DAM_METADATA
    for key, scraped in scraped_dams.items():
        # Skip if it is one of the main key variations
        if key in ["krs", "krishnaraja sagara", "amaravathi*", "periyar**"]:
            continue
        meta = DAM_METADATA.get(key, {"river": "Unknown", "district": "Unknown", "state": scraped["state"]})
        dam_entry = {
            "id": dam_id_counter,
            "name": scraped["name"],
            "river": meta["river"],
            "district": meta["district"],
            "level": scraped["level"],
            "capacity": scraped["capacity"],
            "inflow": scraped["inflow"],
            "outflow": scraped["outflow"],
            "state": scraped["state"]
        }
        final_dams.append(dam_entry)
        dam_id_counter += 1

    # Add the static defaults for dams not scraped
    for item in static_defaults:
        # Check if already added
        already_added = any(d["name"].lower() == item["name"].lower() for d in final_dams)
        if not already_added:
            item["id"] = dam_id_counter
            final_dams.append(item)
            dam_id_counter += 1
            
    # Write to dams.json
    with open(json_path, "w", encoding="utf-8") as f:
        json.dump(final_dams, f, indent=2)
        
    print(f"Successfully wrote {len(final_dams)} dams to dams.json!")

    # Post historical readings to MongoDB via serverless API
    try:
        import datetime
        api_url = os.environ.get("VERCEL_URL", "")
        if api_url:
            if not api_url.startswith("http"):
                api_url = f"https://{api_url}"
            readings = []
            for d in final_dams:
                readings.append({
                    "dam_id": d["id"],
                    "name": d["name"],
                    "level": d["level"],
                    "capacity": d["capacity"],
                    "inflow": d["inflow"],
                    "outflow": d["outflow"],
                    "timestamp": datetime.datetime.utcnow().isoformat() + "Z"
                })
            payload = json.dumps({"readings": readings}).encode("utf-8")
            req = urllib.request.Request(
                f"{api_url}/api/dam-history",
                data=payload,
                headers={"Content-Type": "application/json"},
                method="POST"
            )
            resp = urllib.request.urlopen(req, timeout=15)
            print(f"Posted {len(readings)} dam readings to history API (status {resp.status})")
        else:
            print("VERCEL_URL not set, skipping history API post.")
    except Exception as e:
        print(f"Warning: Failed to post dam history: {e}")

    # Calculate delta changes
    old_map = {d["name"].lower(): d for d in old_dams}
    dams_changed = 0
    storage_delta_tmc = 0.0
    inflow_delta_cusecs = 0
    outflow_delta_cusecs = 0

    for d in final_dams:
        old_d = old_map.get(d["name"].lower())
        if old_d:
            # Check if any value changed significantly
            changed = False
            if (abs(d["level"] - old_d["level"]) > 0.01 or 
                d["inflow"] != old_d["inflow"] or 
                d["outflow"] != old_d["outflow"]):
                changed = True
                dams_changed += 1
            
            # Calculate storage change
            old_storage = (old_d["level"] / 100.0) * old_d["capacity"]
            new_storage = (d["level"] / 100.0) * d["capacity"]
            storage_delta_tmc += (new_storage - old_storage)

            if d["inflow"] is not None and old_d["inflow"] is not None:
                inflow_delta_cusecs += (d["inflow"] - old_d["inflow"])
            if d["outflow"] is not None and old_d["outflow"] is not None:
                outflow_delta_cusecs += (d["outflow"] - old_d["outflow"])
        else:
            # New dam
            dams_changed += 1
            new_storage = (d["level"] / 100.0) * d["capacity"]
            storage_delta_tmc += new_storage
            if d["inflow"] is not None:
                inflow_delta_cusecs += d["inflow"]
            if d["outflow"] is not None:
                outflow_delta_cusecs += d["outflow"]

    storage_delta_tmc = round(storage_delta_tmc, 3)

    # Write scraper logs
    status_path = os.path.join(script_dir, "..", "src", "data", "scrape_status.json")
    status_data = {}
    history = []
    if os.path.exists(status_path):
        try:
            with open(status_path, "r", encoding="utf-8") as f:
                status_data = json.load(f)
                history = status_data.get("history", [])
        except Exception as e:
            print(f"Error reading scrape_status.json: {e}")

    import datetime
    now_str = datetime.datetime.now().strftime("%Y-%m-%d %I:%M %p")
    duration = round(time.time() - start_time, 2)

    new_run = {
        "timestamp": now_str,
        "success": True,
        "duration_seconds": duration,
        "sources": {
            "tungabhadra": { "status": "Operational" if tb_ok else "Down", "ok": tb_ok, "count": tb_count },
            "tamil_nadu": { "status": "Operational" if tn_ok else "Down", "ok": tn_ok, "count": tn_count },
            "oneindia": { "status": "Operational" if oi_ok else "Down", "ok": oi_ok, "count": oi_count }
        },
        "metrics": {
            "dams_changed": dams_changed,
            "storage_delta_tmc": storage_delta_tmc,
            "inflow_delta_cusecs": inflow_delta_cusecs,
            "outflow_delta_cusecs": outflow_delta_cusecs
        }
    }

    history.insert(0, new_run)
    history = history[:14]

    status_data = {
        "last_run_timestamp": now_str,
        "success": True,
        "duration_seconds": duration,
        "sources": new_run["sources"],
        "metrics": new_run["metrics"],
        "history": history
    }

    with open(status_path, "w", encoding="utf-8") as f:
        json.dump(status_data, f, indent=2)

    print("Successfully updated scrape_status.json!")

if __name__ == "__main__":
    main()
