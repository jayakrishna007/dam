import urllib.request
import re
import json
import os

URLS = {
    "tb": "http://tbboard.gov.in/daily_000/daily_level_list.php",
    "tn": "https://tnagriculture.in/ARS/home/reservoir"
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
    "osmansagar": {"river": "Musi", "district": "Hyderabad", "state": "Telangana"},

    # Himachal Pradesh (BBMB)
    "bhakra": {"river": "Sutlej", "district": "Bilaspur", "state": "Himachal Pradesh"},
    "pong": {"river": "Beas", "district": "Kangra", "state": "Himachal Pradesh"},

    # Maharashtra
    "koyna": {"river": "Koyna", "district": "Satara", "state": "Maharashtra"},
    "jayakwadi": {"river": "Godavari", "district": "Chhatrapati Sambhajinagar", "state": "Maharashtra"},
    "ujani": {"river": "Bhima", "district": "Solapur", "state": "Maharashtra"},
    "khadakwasla": {"river": "Mutha", "district": "Pune", "state": "Maharashtra"},
    "bhatsa": {"river": "Bhatsa", "district": "Thane", "state": "Maharashtra"},

    # Andhra Pradesh & Telangana
    "srisailam": {"river": "Krishna", "district": "Kurnool", "state": "Andhra Pradesh"},
    "sriram sagar": {"river": "Godavari", "district": "Nizamabad", "state": "Telangana"},
    "srsp": {"river": "Godavari", "district": "Nizamabad", "state": "Telangana"},
    "somasila": {"river": "Penna", "district": "Nellore", "state": "Andhra Pradesh"},
    "kandaleru": {"river": "Kandaleru", "district": "Nellore", "state": "Andhra Pradesh"},
    "singur": {"river": "Manjira", "district": "Sangareddy", "state": "Telangana"},

    # Gujarat
    "ukai": {"river": "Tapti", "district": "Tapi", "state": "Gujarat"},
    "kadana": {"river": "Mahi", "district": "Mahisagar", "state": "Gujarat"},
    "dharoi": {"river": "Sabarmati", "district": "Mehsana", "state": "Gujarat"},

    # Madhya Pradesh
    "gandhi sagar": {"river": "Chambal", "district": "Mandsaur", "state": "Madhya Pradesh"},
    "bansagar": {"river": "Sone", "district": "Shahdol", "state": "Madhya Pradesh"},
    "tawa": {"river": "Tawa", "district": "Narmadapuram", "state": "Madhya Pradesh"},
    "omkareshwar": {"river": "Narmada", "district": "Khandwa", "state": "Madhya Pradesh"},

    # Rajasthan
    "bisalpur": {"river": "Banas", "district": "Tonk", "state": "Rajasthan"},
    "rana pratap sagar": {"river": "Chambal", "district": "Chittorgarh", "state": "Rajasthan"},
    "mahi bajaj sagar": {"river": "Mahi", "district": "Banswara", "state": "Rajasthan"},

    # Uttarakhand & Punjab
    "tehri": {"river": "Bhagirathi", "district": "Tehri Garhwal", "state": "Uttarakhand"},
    "tehri dam": {"river": "Bhagirathi", "district": "Tehri Garhwal", "state": "Uttarakhand"},
    "ranjit sagar": {"river": "Ravi", "district": "Pathankot", "state": "Punjab"},
    "mullaperiyar": {"river": "Periyar", "district": "Idukki", "state": "Kerala"}
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
    bbmb_ok = False
    tb_count = 0
    tn_count = 0
    bbmb_count = 0

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

    # --- 3. Scrape BBMB (Bhakra/Pong) ---
    print("Scraping BBMB (Bhakra/Pong)...")
    try:
        import sys
        sys.path.append(os.path.dirname(os.path.abspath(__file__)))
        from scrape_bbmb import scrape_bbmb
        bbmb_res = scrape_bbmb()
        if bbmb_res:
            for k, val in bbmb_res.items():
                scraped_dams[k] = val
            bbmb_ok = True
            bbmb_count = len(bbmb_res)
            print(f"  Scraped {len(bbmb_res)} dams from BBMB.")
    except Exception as e:
        print(f"  Error running BBMB scraper: {e}")

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

    # Merge with pre-existing dams.json so all dams are preserved
    if old_dams and len(old_dams) > 0:
        # Create lookup of scraped dams
        scraped_lookup = {}
        for s in scraped_dams.values():
            scraped_lookup[s["name"].lower()] = s
            clean_name = re.sub(r"\s*\(.*\)", "", s["name"]).strip().lower()
            scraped_lookup[clean_name] = s
        for meta_key, meta in DAM_METADATA.items():
            if meta_key in scraped_dams:
                s = scraped_dams[meta_key]
                scraped_lookup[meta_key.lower()] = s
                scraped_lookup[s["name"].lower()] = s

        final_dams = []
        for dam in old_dams:
            dam_copy = dict(dam)
            name_lower = dam_copy["name"].lower()
            clean_name = re.sub(r"\s*\(.*\)", "", dam_copy["name"]).strip().lower()
            
            # Check if this dam has fresh scraped data
            matched_scrape = scraped_lookup.get(name_lower) or scraped_lookup.get(clean_name)
            if matched_scrape:
                dam_copy["level"] = matched_scrape["level"]
                dam_copy["capacity"] = matched_scrape["capacity"]
                if matched_scrape.get("inflow") is not None:
                    dam_copy["inflow"] = matched_scrape["inflow"]
                if matched_scrape.get("outflow") is not None:
                    dam_copy["outflow"] = matched_scrape["outflow"]
            
            final_dams.append(dam_copy)

        # Add any new scraped dams not in old_dams
        existing_names = {d["name"].lower() for d in final_dams}
        for s in scraped_dams.values():
            if s["name"].lower() not in existing_names:
                meta = DAM_METADATA.get(s["name"].lower(), {"river": "Unknown", "district": "Unknown", "state": s["state"]})
                new_entry = {
                    "id": len(final_dams) + 1,
                    "name": s["name"],
                    "river": meta.get("river", "Unknown"),
                    "district": meta.get("district", "Unknown"),
                    "level": s["level"],
                    "capacity": s["capacity"],
                    "inflow": s["inflow"],
                    "outflow": s["outflow"],
                    "state": meta.get("state", s["state"])
                }
                final_dams.append(new_entry)
                existing_names.add(s["name"].lower())
    else:
        final_dams = list(scraped_dams.values())

    # Write to dams.json
    with open(json_path, "w", encoding="utf-8") as f:
        json.dump(final_dams, f, indent=2)
        
    print(f"Successfully wrote {len(final_dams)} dams to dams.json!")

    # --- 5. Scrape USA (CDEC + USACE) ---
    usa_ok = False
    usa_count = 0
    print("Scraping USA dams (CDEC + USACE)...")
    try:
        from scrape_usa import scrape_usa
        usa_data = scrape_usa()
        usa_json_path = os.path.join(script_dir, "..", "src", "data", "dams_usa.json")
        # Load existing USA JSON to preserve static entries
        old_usa = []
        if os.path.exists(usa_json_path):
            try:
                with open(usa_json_path, "r", encoding="utf-8") as f:
                    old_usa = json.load(f)
            except Exception:
                pass
        # Merge live data into existing entries
        if old_usa and usa_data:
            scraped_usa_by_name = {v["name"].lower(): v for v in usa_data.values()}
            for dam in old_usa:
                matched = scraped_usa_by_name.get(dam["name"].lower())
                if matched:
                    if matched.get("level") is not None:
                        dam["level"] = matched["level"]
                    if matched.get("inflow") is not None:
                        dam["inflow"] = matched["inflow"]
                    if matched.get("outflow") is not None:
                        dam["outflow"] = matched["outflow"]
                    if matched.get("storage_af") is not None:
                        dam["storage_af"] = matched["storage_af"]
            final_usa = old_usa
        else:
            final_usa = old_usa
        with open(usa_json_path, "w", encoding="utf-8") as f:
            json.dump(final_usa, f, indent=2)
        usa_count = len([v for v in usa_data.values() if v.get("level") is not None])
        usa_ok = usa_count > 0
        print(f"  USA: {usa_count} live readings merged into dams_usa.json")
    except Exception as e:
        print(f"  [ERROR] USA scraper: {e}")

    # --- 6. Scrape Brazil (ONS CKAN) ---
    brazil_ok = False
    brazil_count = 0
    print("Scraping Brazil dams (ONS CKAN)...")
    try:
        from scrape_brazil import scrape_brazil
        brazil_data = scrape_brazil()
        brazil_json_path = os.path.join(script_dir, "..", "src", "data", "dams_brazil.json")
        old_brazil = []
        if os.path.exists(brazil_json_path):
            try:
                with open(brazil_json_path, "r", encoding="utf-8") as f:
                    old_brazil = json.load(f)
            except Exception:
                pass
        if old_brazil and brazil_data:
            scraped_br_by_name = {v["name"].lower(): v for v in brazil_data.values()}
            for dam in old_brazil:
                matched = scraped_br_by_name.get(dam["name"].lower())
                if matched:
                    if matched.get("level") is not None:
                        dam["level"] = matched["level"]
                    if matched.get("inflow") is not None:
                        dam["inflow"] = matched["inflow"]
                    if matched.get("outflow") is not None:
                        dam["outflow"] = matched["outflow"]
                    if matched.get("storage_hm3") is not None:
                        dam["storage_hm3"] = matched["storage_hm3"]
            final_brazil = old_brazil
        else:
            final_brazil = old_brazil
        with open(brazil_json_path, "w", encoding="utf-8") as f:
            json.dump(final_brazil, f, indent=2)
        brazil_count = len([v for v in brazil_data.values() if v.get("level") is not None])
        brazil_ok = brazil_count > 0
        print(f"  Brazil: {brazil_count} live readings merged into dams_brazil.json")
    except Exception as e:
        print(f"  [ERROR] Brazil scraper: {e}")

    # Post historical readings to MongoDB via serverless API
    try:
        import datetime
        api_url = os.environ.get("VERCEL_URL", "")
        if not api_url:
            api_url = "https://damtoday.com"
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
            print("api_url not set, skipping history API post.")
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
    ist_tz = datetime.timezone(datetime.timedelta(hours=5, minutes=30))
    now_str = datetime.datetime.now(ist_tz).strftime("%Y-%m-%d %I:%M %p")
    duration = round(time.time() - start_time, 2)

    new_run = {
        "timestamp": now_str,
        "success": True,
        "duration_seconds": duration,
        "sources": {
            "tungabhadra": { "status": "Operational" if tb_ok else "Down", "ok": tb_ok, "count": tb_count },
            "tamil_nadu": { "status": "Operational" if tn_ok else "Down", "ok": tn_ok, "count": tn_count },
            "bbmb": { "status": "Operational" if bbmb_ok else "Down", "ok": bbmb_ok, "count": bbmb_count },
            "pan_india": { "status": "Operational", "ok": True, "count": len(final_dams) },
            "usa": { "status": "Operational" if usa_ok else "Down", "ok": usa_ok, "count": usa_count },
            "brazil": { "status": "Operational" if brazil_ok else "Down", "ok": brazil_ok, "count": brazil_count }
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
