import urllib.request
import re
import json
import os

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.normpath(os.path.join(SCRIPT_DIR, "..", "src", "data"))

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
    bihar_ok = False
    bihar_count = 0
    thailand_ok = False
    thailand_count = 0

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

    # --- 3b. Scrape / Link CWC Weekly Bulletin for 150+ Indian Dams ---
    cwc_ok = False
    cwc_count = 0
    cwc_data = {}
    print("Linking CWC Weekly Bulletin (150+ Indian Reservoirs)...")
    try:
        from scrape_cwc import scrape_cwc_bulletin
        cwc_data = scrape_cwc_bulletin()
        if cwc_data:
            cwc_ok = True
            cwc_count = len(cwc_data)
            print(f"  CWC: {cwc_count} reservoirs mapped with official weekly Thursday schedule.")
    except Exception as e:
        print(f"  Error fetching CWC bulletin: {e}")

    # Current IST formatted timestamp
    import datetime
    ist_tz = datetime.timezone(datetime.timedelta(hours=5, minutes=30))
    now_ist = datetime.datetime.now(ist_tz)
    now_str = now_ist.strftime("%Y-%m-%d %I:%M %p")

    # --- 4. Merge with existing static defaults and save ---
    script_dir = os.path.dirname(os.path.abspath(__file__))
    json_path = os.path.join(script_dir, "..", "src", "data", "dams.json")
    
    # Read existing dams.json to calculate real changes
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
            
            # Check if this dam has fresh live scraped data (TB, TN Ag, BBMB)
            matched_scrape = scraped_lookup.get(name_lower) or scraped_lookup.get(clean_name)
            if matched_scrape:
                dam_copy["level"] = matched_scrape["level"]
                dam_copy["capacity"] = matched_scrape["capacity"]
                if matched_scrape.get("inflow") is not None:
                    dam_copy["inflow"] = matched_scrape["inflow"]
                if matched_scrape.get("outflow") is not None:
                    dam_copy["outflow"] = matched_scrape["outflow"]
                
                # Determine specific source
                if "tungabhadra" in name_lower:
                    dam_copy["data_source"] = "Tungabhadra Board"
                elif "bhakra" in name_lower or "pong" in name_lower:
                    dam_copy["data_source"] = "Bhakra Beas Management Board (BBMB)"
                else:
                    dam_copy["data_source"] = "TN Water Resources / Agriculture"
                
                dam_copy["data_frequency"] = "daily"
                dam_copy["last_updated"] = now_str
            else:
                # Check if mapped to CWC Weekly
                cwc_match = cwc_data.get(clean_name) or cwc_data.get(name_lower)
                if cwc_match:
                    dam_copy["data_source"] = "Central Water Commission (CWC)"
                    dam_copy["data_frequency"] = "weekly"
                    dam_copy["bulletin_date"] = cwc_match.get("bulletin_date")
                    dam_copy["last_updated"] = cwc_match.get("last_updated", now_str)
                else:
                    dam_copy["data_source"] = dam_copy.get("data_source", "State Water Resources (Baseline)")
                    dam_copy["data_frequency"] = dam_copy.get("data_frequency", "baseline")
                    dam_copy["last_updated"] = dam_copy.get("last_updated", now_str)

            # Derive real operational flow status
            outflow_val = dam_copy.get("outflow")
            inflow_val = dam_copy.get("inflow")
            if outflow_val is not None and outflow_val == 0:
                dam_copy["flow_status"] = "GATES_CLOSED"
            elif inflow_val is not None and inflow_val == 0:
                dam_copy["flow_status"] = "LOW_INFLOW"
            elif outflow_val is not None and outflow_val > 15000:
                dam_copy["flow_status"] = "ACTIVE_SPILLWAY"
            else:
                dam_copy["flow_status"] = "NORMAL_FLOW"

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
                    "state": meta.get("state", s["state"]),
                    "data_source": "State Water Resources",
                    "data_frequency": "daily",
                    "last_updated": now_str,
                    "flow_status": "GATES_CLOSED" if s.get("outflow") == 0 else "NORMAL_FLOW"
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
                    dam["data_source"] = "USGS / California CDEC"
                    dam["data_frequency"] = "daily"
                    dam["last_updated"] = now_str
                else:
                    dam["data_source"] = dam.get("data_source", "USGS Water Data")
                    dam["data_frequency"] = "daily"
                    dam["last_updated"] = dam.get("last_updated", now_str)
                
                # Derive flow status
                outf = dam.get("outflow")
                inf = dam.get("inflow")
                dam["flow_status"] = "GATES_CLOSED" if outf == 0 else "LOW_INFLOW" if inf == 0 else "NORMAL_FLOW"
            final_usa = old_usa
        else:
            final_usa = old_usa
            for dam in final_usa:
                dam["data_source"] = dam.get("data_source", "USGS Water Data")
                dam["data_frequency"] = "daily"
                dam["last_updated"] = dam.get("last_updated", now_str)
                outf = dam.get("outflow")
                inf = dam.get("inflow")
                dam["flow_status"] = "GATES_CLOSED" if outf == 0 else "LOW_INFLOW" if inf == 0 else "NORMAL_FLOW"

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
                    dam["data_source"] = "ONS Brazil (Open Data)"
                    dam["data_frequency"] = "daily"
                    dam["last_updated"] = now_str
                else:
                    dam["data_source"] = dam.get("data_source", "ONS Brazil (Open Data)")
                    dam["data_frequency"] = "daily"
                    dam["last_updated"] = dam.get("last_updated", now_str)
                outf = dam.get("outflow")
                inf = dam.get("inflow")
                dam["flow_status"] = "GATES_CLOSED" if outf == 0 else "LOW_INFLOW" if inf == 0 else "NORMAL_FLOW"
            final_brazil = old_brazil
        else:
            final_brazil = old_brazil
            for dam in final_brazil:
                dam["data_source"] = dam.get("data_source", "ONS Brazil (Open Data)")
                dam["data_frequency"] = "daily"
                dam["last_updated"] = dam.get("last_updated", now_str)
                outf = dam.get("outflow")
                inf = dam.get("inflow")
                dam["flow_status"] = "GATES_CLOSED" if outf == 0 else "LOW_INFLOW" if inf == 0 else "NORMAL_FLOW"

        with open(brazil_json_path, "w", encoding="utf-8") as f:
            json.dump(final_brazil, f, indent=2)
        brazil_count = len([v for v in brazil_data.values() if v.get("level") is not None])
        brazil_ok = brazil_count > 0
        print(f"  Brazil: {brazil_count} live readings merged into dams_brazil.json")
    except Exception as e:
        print(f"  [ERROR] Brazil scraper: {e}")

    # --- 7. Scrape Thailand (EGAT) ---
    thailand_ok = False
    thailand_count = 0
    print("Scraping Thailand dams (EGAT)...")
    try:
        from scrape_thailand import scrape_thailand
        thailand_data = scrape_thailand()
        thailand_json_path = os.path.join(script_dir, "..", "src", "data", "dams_thailand.json")
        old_thailand = []
        if os.path.exists(thailand_json_path):
            try:
                with open(thailand_json_path, "r", encoding="utf-8") as f:
                    old_thailand = json.load(f)
            except Exception:
                pass
        if old_thailand and thailand_data:
            scraped_th_by_name = {v["name"].lower(): v for v in thailand_data.values()}
            for dam in old_thailand:
                matched = scraped_th_by_name.get(dam["name"].lower())
                if matched:
                    if matched.get("level") is not None:
                        dam["level"] = matched["level"]
                    if matched.get("inflow") is not None:
                        dam["inflow"] = matched["inflow"]
                    if matched.get("outflow") is not None:
                        dam["outflow"] = matched["outflow"]
                    if matched.get("storage_mcm") is not None:
                        dam["storage_mcm"] = matched["storage_mcm"]
                    dam["data_source"] = "EGAT Thailand Water Intelligence"
                    dam["data_frequency"] = "daily"
                    dam["last_updated"] = now_str
                else:
                    dam["data_source"] = dam.get("data_source", "EGAT Thailand")
                    dam["data_frequency"] = "daily"
                    dam["last_updated"] = dam.get("last_updated", now_str)
                outf = dam.get("outflow")
                inf = dam.get("inflow")
                dam["flow_status"] = "GATES_CLOSED" if outf == 0 else "LOW_INFLOW" if inf == 0 else "NORMAL_FLOW"
            final_thailand = old_thailand
        elif thailand_data:
            final_thailand = list(thailand_data.values())
        else:
            final_thailand = old_thailand
            for dam in final_thailand:
                dam["data_source"] = dam.get("data_source", "EGAT Thailand")
                dam["data_frequency"] = "daily"
                dam["last_updated"] = dam.get("last_updated", now_str)
                outf = dam.get("outflow")
                inf = dam.get("inflow")
                dam["flow_status"] = "GATES_CLOSED" if outf == 0 else "LOW_INFLOW" if inf == 0 else "NORMAL_FLOW"

        with open(thailand_json_path, "w", encoding="utf-8") as f:
            json.dump(final_thailand, f, indent=2)
        thailand_count = len([v for v in thailand_data.values() if v.get("level") is not None])
        thailand_ok = thailand_count > 0
        print(f"  Thailand: {thailand_count} live readings merged into dams_thailand.json")
    except Exception as e:
        print(f"  [ERROR] Thailand scraper: {e}")

    # --- 8. Scrape Nepal (DHM & NEA) ---
    nepal_ok = False
    nepal_count = 0
    print("Scraping Nepal dams (DHM & NEA)...")
    try:
        from scrape_nepal import scrape_nepal
        nepal_data = scrape_nepal()
        nepal_json_path = os.path.join(script_dir, "..", "src", "data", "dams_nepal.json")
        old_nepal = []
        if os.path.exists(nepal_json_path):
            try:
                with open(nepal_json_path, "r", encoding="utf-8") as f:
                    old_nepal = json.load(f)
            except Exception:
                pass
        if old_nepal and nepal_data:
            scraped_np_by_name = {v["name"].lower(): v for v in nepal_data.values()}
            for dam in old_nepal:
                matched = scraped_np_by_name.get(dam["name"].lower())
                if matched:
                    if matched.get("level") is not None:
                        dam["level"] = matched["level"]
                    if matched.get("inflow") is not None:
                        dam["inflow"] = matched["inflow"]
                    if matched.get("outflow") is not None:
                        dam["outflow"] = matched["outflow"]
                    if matched.get("storage_mcm") is not None:
                        dam["storage_mcm"] = matched["storage_mcm"]
                    dam["data_source"] = "DHM Nepal / NEA Hydrology"
                    dam["data_frequency"] = "daily"
                    dam["last_updated"] = now_str
                else:
                    dam["data_source"] = dam.get("data_source", "DHM Nepal")
                    dam["data_frequency"] = "daily"
                    dam["last_updated"] = dam.get("last_updated", now_str)
                outf = dam.get("outflow")
                inf = dam.get("inflow")
                dam["flow_status"] = "GATES_CLOSED" if outf == 0 else "LOW_INFLOW" if inf == 0 else "NORMAL_FLOW"
            final_nepal = old_nepal
        elif nepal_data:
            final_nepal = list(nepal_data.values())
        else:
            final_nepal = old_nepal
            for dam in final_nepal:
                dam["data_source"] = dam.get("data_source", "DHM Nepal")
                dam["data_frequency"] = "daily"
                dam["last_updated"] = dam.get("last_updated", now_str)
                outf = dam.get("outflow")
                inf = dam.get("inflow")
                dam["flow_status"] = "GATES_CLOSED" if outf == 0 else "LOW_INFLOW" if inf == 0 else "NORMAL_FLOW"

        with open(nepal_json_path, "w", encoding="utf-8") as f:
            json.dump(final_nepal, f, indent=2)
        nepal_count = len([v for v in nepal_data.values() if v.get("level") is not None])
        nepal_ok = nepal_count > 0
        print(f"  Nepal: {nepal_count} live readings merged into dams_nepal.json")
    except Exception as e:
        print(f"  [ERROR] Nepal scraper: {e}")

    # --- 9. Scrape Laos (MRC & Mekong Cascade) ---
    laos_ok = False
    laos_count = 0
    print("Scraping Laos dams (MRC & Mekong Cascade)...")
    try:
        from scrape_laos import scrape_laos
        laos_data = scrape_laos()
        laos_json_path = os.path.join(script_dir, "..", "src", "data", "dams_laos.json")
        old_laos = []
        if os.path.exists(laos_json_path):
            try:
                with open(laos_json_path, "r", encoding="utf-8") as f:
                    old_laos = json.load(f)
            except Exception:
                pass
        if old_laos and laos_data:
            scraped_la_by_name = {v["name"].lower(): v for v in laos_data.values()}
            for dam in old_laos:
                matched = scraped_la_by_name.get(dam["name"].lower())
                if matched:
                    if matched.get("level") is not None:
                        dam["level"] = matched["level"]
                    if matched.get("inflow") is not None:
                        dam["inflow"] = matched["inflow"]
                    if matched.get("outflow") is not None:
                        dam["outflow"] = matched["outflow"]
                    if matched.get("storage_mcm") is not None:
                        dam["storage_mcm"] = matched["storage_mcm"]
                    dam["data_source"] = "Mekong River Commission (MRC)"
                    dam["data_frequency"] = "daily"
                    dam["last_updated"] = now_str
                else:
                    dam["data_source"] = dam.get("data_source", "MRC Mekong")
                    dam["data_frequency"] = "daily"
                    dam["last_updated"] = dam.get("last_updated", now_str)
                outf = dam.get("outflow")
                inf = dam.get("inflow")
                dam["flow_status"] = "GATES_CLOSED" if outf == 0 else "LOW_INFLOW" if inf == 0 else "NORMAL_FLOW"
            final_laos = old_laos
        elif laos_data:
            final_laos = list(laos_data.values())
        else:
            final_laos = old_laos
            for dam in final_laos:
                dam["data_source"] = dam.get("data_source", "MRC Mekong")
                dam["data_frequency"] = "daily"
                dam["last_updated"] = dam.get("last_updated", now_str)
                outf = dam.get("outflow")
                inf = dam.get("inflow")
                dam["flow_status"] = "GATES_CLOSED" if outf == 0 else "LOW_INFLOW" if inf == 0 else "NORMAL_FLOW"

        with open(laos_json_path, "w", encoding="utf-8") as f:
            json.dump(final_laos, f, indent=2)
        laos_count = len([v for v in laos_data.values() if v.get("level") is not None])
        laos_ok = laos_count > 0
        print(f"  Laos: {laos_count} live readings merged into dams_laos.json")
    except Exception as e:
        print(f"  [ERROR] Laos scraper: {e}")

    # --- 10. Scrape Vietnam (EVN & NCHMF) ---
    vietnam_ok = False
    vietnam_count = 0
    print("Scraping Vietnam dams (EVN & NCHMF)...")
    try:
        from scrape_vietnam import scrape_vietnam
        vietnam_data = scrape_vietnam()
        vietnam_json_path = os.path.join(script_dir, "..", "src", "data", "dams_vietnam.json")
        old_vietnam = []
        if os.path.exists(vietnam_json_path):
            try:
                with open(vietnam_json_path, "r", encoding="utf-8") as f:
                    old_vietnam = json.load(f)
            except Exception:
                pass
        if old_vietnam and vietnam_data:
            scraped_vn_by_name = {v["name"].lower(): v for v in vietnam_data.values()}
            for dam in old_vietnam:
                matched = scraped_vn_by_name.get(dam["name"].lower())
                if matched:
                    if matched.get("level") is not None:
                        dam["level"] = matched["level"]
                    if matched.get("inflow") is not None:
                        dam["inflow"] = matched["inflow"]
                    if matched.get("outflow") is not None:
                        dam["outflow"] = matched["outflow"]
                    if matched.get("storage_mcm") is not None:
                        dam["storage_mcm"] = matched["storage_mcm"]
                    dam["data_source"] = "EVN / NCHMF Vietnam"
                    dam["data_frequency"] = "daily"
                    dam["last_updated"] = now_str
                else:
                    dam["data_source"] = dam.get("data_source", "EVN Vietnam")
                    dam["data_frequency"] = "daily"
                    dam["last_updated"] = dam.get("last_updated", now_str)
                outf = dam.get("outflow")
                inf = dam.get("inflow")
                dam["flow_status"] = "GATES_CLOSED" if outf == 0 else "LOW_INFLOW" if inf == 0 else "NORMAL_FLOW"
            final_vietnam = old_vietnam
        elif vietnam_data:
            final_vietnam = list(vietnam_data.values())
        else:
            final_vietnam = old_vietnam
            for dam in final_vietnam:
                dam["data_source"] = dam.get("data_source", "EVN Vietnam")
                dam["data_frequency"] = "daily"
                dam["last_updated"] = dam.get("last_updated", now_str)
                outf = dam.get("outflow")
                inf = dam.get("inflow")
                dam["flow_status"] = "GATES_CLOSED" if outf == 0 else "LOW_INFLOW" if inf == 0 else "NORMAL_FLOW"
        with open(vietnam_json_path, "w", encoding="utf-8") as f:
            json.dump(final_vietnam, f, indent=2)
        vietnam_count = len([v for v in vietnam_data.values() if v.get("level") is not None])
        vietnam_ok = vietnam_count > 0
        print(f"  Vietnam: {vietnam_count} live readings merged into dams_vietnam.json")
    except Exception as e:
        print(f"  [ERROR] Vietnam scraper: {e}")

    # Post historical readings to MongoDB via serverless API
    try:
        import datetime
        api_url = os.environ.get("VERCEL_URL", "")
        if not api_url:
            api_url = "https://damtoday.com"
        if api_url:
            if not api_url.startswith("http"):
                api_url = f"https://{api_url}"
            all_readings = []
            now_iso = datetime.datetime.utcnow().isoformat() + "Z"
            
            for d in final_dams:
                all_readings.append({
                    "dam_id": d.get("id"),
                    "name": d.get("name"),
                    "level": d.get("level"),
                    "capacity": d.get("capacity"),
                    "inflow": d.get("inflow"),
                    "outflow": d.get("outflow"),
                    "timestamp": now_iso
                })
            
            # Also include all international dams in history
            for global_file in ["dams_usa.json", "dams_brazil.json", "dams_thailand.json", "dams_nepal.json", "dams_laos.json", "dams_vietnam.json"]:
                try:
                    p = os.path.join(DATA_DIR, global_file)
                    if os.path.exists(p):
                        with open(p, "r", encoding="utf-8") as f:
                            for d in json.load(f):
                                all_readings.append({
                                    "dam_id": d.get("id"),
                                    "name": d.get("name"),
                                    "level": d.get("level"),
                                    "capacity": d.get("capacity"),
                                    "inflow": d.get("inflow"),
                                    "outflow": d.get("outflow"),
                                    "timestamp": now_iso
                                })
                except Exception as ex:
                    print(f"  Warning adding {global_file} to history: {ex}")

            payload = json.dumps({"readings": all_readings}).encode("utf-8")
            req = urllib.request.Request(
                f"{api_url}/api/dam-history",
                data=payload,
                headers={"Content-Type": "application/json"},
                method="POST"
            )
            resp = urllib.request.urlopen(req, timeout=15)
            print(f"Posted {len(all_readings)} global dam readings to history API (status {resp.status})")
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
            "bihar_wrd": { "status": "Operational" if bihar_ok else "Down", "ok": bihar_ok, "count": bihar_count },
            "pan_india": { "status": "Operational", "ok": True, "count": len(final_dams) },
            "usa": { "status": "Operational" if usa_ok else "Down", "ok": usa_ok, "count": usa_count },
            "brazil": { "status": "Operational" if brazil_ok else "Down", "ok": brazil_ok, "count": brazil_count },
            "thailand": { "status": "Operational" if thailand_ok else "Down", "ok": thailand_ok, "count": thailand_count },
            "nepal": { "status": "Operational" if nepal_ok else "Down", "ok": nepal_ok, "count": nepal_count },
            "laos": { "status": "Operational" if laos_ok else "Down", "ok": laos_ok, "count": laos_count },
            "vietnam": { "status": "Operational" if vietnam_ok else "Down", "ok": vietnam_ok, "count": vietnam_count }
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
