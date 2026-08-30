"""
Scraper for Bihar Water Resources Department (WRD) & BeFIQR Real-Time Telemetry.
Fetches live river discharge and storage data for major Indo-Nepal connected barrages
and reservoirs including Kosi Barrage, Valmikinagar (Gandak) Barrage, Indrapuri (Sone),
and key flood-control reservoirs.
"""

import urllib.request
import re
import json
import os

URL = "https://irrigation.befiqr.in/dashboard"
HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36"
}

AF_TO_TMC = 0.00004356  # 1 AF = 43,560 cu ft, 1 TMC = 10^9 cu ft

# Metadata mapping for Bihar barrages and reservoirs
BIHAR_METADATA = {
    "kosi barrage": {
        "name": "Kosi Barrage (Birpur)",
        "river": "Kosi",
        "district": "Supaul",
        "state": "Bihar",
        "capacity": 25.0,  # Pondage / regulating storage in TMC
        "full_discharge_capacity": 950000
    },
    "valmikinagar barrage": {
        "name": "Gandak Barrage (Valmikinagar)",
        "river": "Gandak",
        "district": "West Champaran",
        "state": "Bihar",
        "capacity": 22.0,
        "full_discharge_capacity": 850000
    },
    "indrapuri barrage": {
        "name": "Indrapuri Barrage (Sone)",
        "river": "Sone",
        "district": "Rohtas",
        "state": "Bihar",
        "capacity": 18.5,
        "full_discharge_capacity": 1458000
    },
    "mohammad ganj barrage": {
        "name": "Mohammad Ganj Barrage",
        "river": "North Koel",
        "district": "Palamu",
        "state": "Jharkhand",
        "capacity": 12.0,
        "full_discharge_capacity": 450000
    },
    "durgawati reservoir scheme": {
        "name": "Durgawati Dam",
        "river": "Durgawati",
        "district": "Kaimur",
        "state": "Bihar"
    },
    "chandan reservoir scheme": {
        "name": "Chandan Dam",
        "river": "Chandan",
        "district": "Banka",
        "state": "Bihar"
    },
    "badua reservoir scheme": {
        "name": "Badua Dam",
        "river": "Badua",
        "district": "Banka",
        "state": "Bihar"
    },
    "garhi reservoir scheme": {
        "name": "Garhi Dam",
        "river": "Kiul",
        "district": "Jamui",
        "state": "Bihar"
    },
    "batane reservoir scheme": {
        "name": "Batane Dam",
        "river": "Batane",
        "district": "Aurangabad",
        "state": "Bihar"
    },
    "phulwaria reservoir scheme": {
        "name": "Phulwaria Dam",
        "river": "Tilaiya",
        "district": "Nawada",
        "state": "Bihar"
    },
    "orhni reservoir scheme": {
        "name": "Orhni Dam",
        "river": "Orhni",
        "district": "Banka",
        "state": "Bihar"
    },
    "bilasi reservoir scheme": {
        "name": "Bilasi Dam",
        "river": "Bilasi",
        "district": "Banka",
        "state": "Bihar"
    },
    "kohira reservoir scheme": {
        "name": "Kohira Dam",
        "river": "Kohira",
        "district": "Kaimur",
        "state": "Bihar"
    },
    "morwy reservoir scheme": {
        "name": "Morwe Dam",
        "river": "Morwe",
        "district": "Lakhisarai",
        "state": "Bihar"
    },
    "nagi reservoir scheme": {
        "name": "Nagi Dam",
        "river": "Nagi",
        "district": "Jamui",
        "state": "Bihar"
    },
    "nakti reservoir scheme": {
        "name": "Nakti Dam",
        "river": "Nakti",
        "district": "Jamui",
        "state": "Bihar"
    }
}


def clean_num(val):
    if val is None:
        return None
    if isinstance(val, (int, float)):
        return float(val)
    s = re.sub(r'[^\d.]', '', str(val))
    try:
        return float(s) if s else None
    except ValueError:
        return None


def scrape_bihar():
    """Scrapes Bihar WRD real-time telemetry for Indo-Nepal barrages and reservoirs."""
    results = {}
    print("  Fetching Bihar WRD (BeFIQR)...")
    try:
        req = urllib.request.Request(URL, headers=HEADERS)
        with urllib.request.urlopen(req, timeout=15) as resp:
            html = resp.read().decode('utf-8', errors='ignore')
    except Exception as e:
        print(f"  [ERROR] Bihar WRD fetch failed: {e}")
        return results

    # 1. Parse Barrages
    m_barrages = re.search(r'var barrages = (\[.*?\]);', html)
    if m_barrages:
        try:
            barrages_data = json.loads(m_barrages.group(1))
            for b in barrages_data:
                b_info = b.get("barrage", {})
                b_data = b.get("barradeData", {})
                raw_name = b_info.get("name", "").strip().lower()
                
                meta = BIHAR_METADATA.get(raw_name)
                if not meta:
                    for k, v in BIHAR_METADATA.items():
                        if k in raw_name or raw_name in k:
                            meta = v
                            break

                if not meta:
                    continue

                inflow = None
                outflow = None

                # Extract discharge / flows based on structure
                if "barrage" in b_data:
                    inflow = clean_num(b_data["barrage"].get("up_stream"))
                    outflow = clean_num(b_data["barrage"].get("down_stream"))
                elif "upstream" in b_data or "downstream" in b_data:
                    inflow = clean_num(b_data.get("upstream", {}).get("water_discharge_c"))
                    outflow = clean_num(b_data.get("downstream", {}).get("water_discharge_c"))

                if inflow is None and "valmiki" in b_data:
                    inflow = clean_num(b_data["valmiki"].get("water_discharge_c"))
                    outflow = inflow

                # Compute approximate level percentage based on discharge vs capacity or pond level
                level_pct = 75.0
                if meta.get("full_discharge_capacity") and outflow:
                    level_pct = min(100.0, round((outflow / meta["full_discharge_capacity"]) * 100, 1))

                key = re.sub(r'[^a-z0-9]+', '_', meta["name"].lower()).strip('_')
                results[key] = {
                    "name": meta["name"],
                    "river": meta["river"],
                    "district": meta["district"],
                    "state": meta["state"],
                    "level": max(20.0, level_pct),
                    "capacity": meta["capacity"],
                    "inflow": round(inflow) if inflow is not None else None,
                    "outflow": round(outflow) if outflow is not None else None
                }
                print(f"    Bihar Barrage: {meta['name']} -> Inflow: {inflow} cfs, Outflow: {outflow} cfs")
        except Exception as e:
            print(f"  [ERROR] Parsing Bihar barrages JSON: {e}")

    # 2. Parse Reservoirs
    m_res = re.search(r'var reservoir = (\[.*?\]);', html)
    if m_res:
        try:
            reservoirs_data = json.loads(m_res.group(1))
            for r in reservoirs_data:
                p = r.get("reservoir", {})
                raw_name = p.get("project_name", "").strip().lower()
                meta = BIHAR_METADATA.get(raw_name)
                if not meta:
                    for k, v in BIHAR_METADATA.items():
                        if k in raw_name or raw_name in k:
                            meta = v
                            break

                cap_af = clean_num(p.get("storage_capacity_f"))
                cur_af = clean_num(r.get("current_storage_capacity_f"))
                
                if cap_af and cap_af > 0:
                    cap_tmc = round(cap_af * AF_TO_TMC, 2)
                    cur_tmc = round((cur_af or 0) * AF_TO_TMC, 2)
                    level_pct = round(((cur_af or 0) / cap_af) * 100, 1)

                    disp_name = meta["name"] if meta else p.get("project_name", "").replace(" Scheme", "").replace(" Reservoir", "") + " Dam"
                    river = meta["river"] if meta else "Local"
                    dist = meta["district"] if meta else "Bihar"
                    state = meta["state"] if meta else "Bihar"

                    key = re.sub(r'[^a-z0-9]+', '_', disp_name.lower()).strip('_')
                    results[key] = {
                        "name": disp_name,
                        "river": river,
                        "district": dist,
                        "state": state,
                        "level": max(5.0, min(100.0, level_pct)),
                        "capacity": max(0.1, cap_tmc),
                        "inflow": None,
                        "outflow": None
                    }
                    print(f"    Bihar Reservoir: {disp_name} -> {level_pct}% ({cur_tmc}/{cap_tmc} TMC)")
        except Exception as e:
            print(f"  [ERROR] Parsing Bihar reservoirs JSON: {e}")

    print(f"  Bihar WRD: {len(results)} Indo-Nepal connected structures scraped.")
    return results


if __name__ == "__main__":
    data = scrape_bihar()
    print(f"\nTotal scraped: {len(data)}")
    for k, v in data.items():
        print(f"  - {v['name']} ({v['state']}): {v['level']}% | Inflow: {v['inflow']} | Outflow: {v['outflow']}")
