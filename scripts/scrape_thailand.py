"""
Scraper for Electricity Generating Authority of Thailand (EGAT) Water Intelligence Portal.
Fetches daily real-time reservoir storage, water level, inflow, and discharge
for major reservoirs across Thailand and the Mekong River basin.
"""

import urllib.request
import re
import json
import os

URL = "http://water.egat.co.th/water_crisis.php"
HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36"
}

MCM_TO_TMC = 0.03531467  # 1 Million Cubic Meters (MCM) = 0.03531467 TMC
MCM_PER_DAY_TO_CFS = 408.73  # 1 MCM/day = 408.73 cfs

# Mapping from Thai names to English metadata
THAI_DAMS_META = {
    "ภูมิพล": {
        "name": "Bhumibol Dam",
        "river": "Ping",
        "province": "Tak",
        "basin": "Northern Basin",
        "capacity_mcm": 13462,
        "image": "https://upload.wikimedia.org/wikipedia/commons/thumb/d/d4/Bhumibol_Dam.jpg/1280px-Bhumibol_Dam.jpg"
    },
    "สิริกิติ์": {
        "name": "Sirikit Dam",
        "river": "Nan",
        "province": "Uttaradit",
        "basin": "Northern Basin",
        "capacity_mcm": 9510,
        "image": "https://upload.wikimedia.org/wikipedia/commons/thumb/b/b5/Sirikit_Dam.jpg/1280px-Sirikit_Dam.jpg"
    },
    "ศรีนครินทร์": {
        "name": "Srinagarind Dam",
        "river": "Khwae Yai",
        "province": "Kanchanaburi",
        "basin": "Western Basin",
        "capacity_mcm": 17745,
        "image": "https://upload.wikimedia.org/wikipedia/commons/thumb/6/67/Srinagarind_Dam_Kanchanaburi.jpg/1280px-Srinagarind_Dam_Kanchanaburi.jpg"
    },
    "วชิราลงกรณ": {
        "name": "Vajiralongkorn Dam",
        "river": "Khwae Noi",
        "province": "Kanchanaburi",
        "basin": "Western Basin",
        "capacity_mcm": 8860,
        "image": "https://upload.wikimedia.org/wikipedia/commons/thumb/e/e4/Vajiralongkorn_Dam.jpg/1280px-Vajiralongkorn_Dam.jpg"
    },
    "สิรินธร": {
        "name": "Sirindhorn Dam",
        "river": "Dom Noi (Mekong)",
        "province": "Ubon Ratchathani",
        "basin": "Mekong Basin",
        "capacity_mcm": 1966,
        "image": "https://upload.wikimedia.org/wikipedia/commons/thumb/8/87/Sirindhorn_Dam.jpg/1280px-Sirindhorn_Dam.jpg"
    },
    "อุบลรัตน์": {
        "name": "Ubol Ratana Dam",
        "river": "Nam Phong (Mekong)",
        "province": "Khon Kaen",
        "basin": "Mekong Basin",
        "capacity_mcm": 2431,
        "image": "https://upload.wikimedia.org/wikipedia/commons/thumb/5/52/Ubol_Ratana_Dam.jpg/1280px-Ubol_Ratana_Dam.jpg"
    },
    "จุฬาภรณ์": {
        "name": "Chulabhorn Dam",
        "river": "Phrom (Mekong)",
        "province": "Chaiyaphum",
        "basin": "Mekong Basin",
        "capacity_mcm": 164,
        "image": "https://upload.wikimedia.org/wikipedia/commons/thumb/5/5f/Chulabhorn_Dam.jpg/1280px-Chulabhorn_Dam.jpg"
    },
    "รัชชประภา": {
        "name": "Ratchaprapha Dam",
        "river": "Klong Saeng",
        "province": "Surat Thani",
        "basin": "Southern Basin",
        "capacity_mcm": 5639,
        "image": "https://upload.wikimedia.org/wikipedia/commons/thumb/9/91/Cheow_Lan_Lake_Khao_Sok.jpg/1280px-Cheow_Lan_Lake_Khao_Sok.jpg"
    },
    "บางลาง": {
        "name": "Bang Lang Dam",
        "river": "Pattani",
        "province": "Yala",
        "basin": "Southern Basin",
        "capacity_mcm": 1454,
        "image": "https://upload.wikimedia.org/wikipedia/commons/thumb/1/15/Bang_Lang_Dam_Yala.jpg/1280px-Bang_Lang_Dam_Yala.jpg"
    },
    "ท่าทุ่งนา": {
        "name": "Tha Thung Na Dam",
        "river": "Khwae Yai",
        "province": "Kanchanaburi",
        "basin": "Western Basin",
        "capacity_mcm": 55,
        "image": "https://upload.wikimedia.org/wikipedia/commons/thumb/6/67/Srinagarind_Dam_Kanchanaburi.jpg/1280px-Srinagarind_Dam_Kanchanaburi.jpg"
    },
    "น้ำพุง": {
        "name": "Nam Pung Dam",
        "river": "Nam Pung (Mekong)",
        "province": "Sakon Nakhon",
        "basin": "Mekong Basin",
        "capacity_mcm": 165,
        "image": "https://upload.wikimedia.org/wikipedia/commons/thumb/5/52/Ubol_Ratana_Dam.jpg/1280px-Ubol_Ratana_Dam.jpg"
    },
    "ห้วยกุ่ม": {
        "name": "Huai Kum Dam",
        "river": "Nam Phrom (Mekong)",
        "province": "Chaiyaphum",
        "basin": "Mekong Basin",
        "capacity_mcm": 20,
        "image": "https://upload.wikimedia.org/wikipedia/commons/thumb/5/5f/Chulabhorn_Dam.jpg/1280px-Chulabhorn_Dam.jpg"
    }
}


def clean_num(val):
    if val is None:
        return None
    if isinstance(val, (int, float)):
        return float(val)
    s = re.sub(r'[^\d.]', '', str(val).replace(',', ''))
    try:
        return float(s) if s else None
    except ValueError:
        return None


def scrape_thailand():
    """Scrapes EGAT daily water crisis table."""
    results = {}
    print("  Fetching EGAT Thailand...")
    try:
        req = urllib.request.Request(URL, headers=HEADERS)
        with urllib.request.urlopen(req, timeout=15) as resp:
            html = resp.read().decode('utf-8', errors='ignore')
    except Exception as e:
        print(f"  [ERROR] EGAT Thailand fetch failed: {e}")
        return results

    row_pattern = re.compile(r'<tr[^>]*>([\s\S]*?)</tr>', re.IGNORECASE)
    cell_pattern = re.compile(r'<td[^>]*>([\s\S]*?)</td>', re.IGNORECASE)

    for row_match in row_pattern.finditer(html):
        row_html = row_match.group(1)
        cells = [re.sub(r'<[^>]+>', '', c).strip() for c in cell_pattern.findall(row_html)]
        if len(cells) < 12:
            continue

        thai_name = cells[0]
        matched_meta = None
        for k, v in THAI_DAMS_META.items():
            if k in thai_name:
                matched_meta = v
                break

        if not matched_meta:
            continue

        elev_m = clean_num(cells[1])
        storage_mcm = clean_num(cells[2])
        level_pct = clean_num(cells[3])
        inflow_mcm = clean_num(cells[10])
        outflow_mcm = clean_num(cells[11])

        cap_mcm = matched_meta["capacity_mcm"]
        cap_tmc = round(cap_mcm * MCM_TO_TMC, 1)

        inflow_cfs = round(inflow_mcm * MCM_PER_DAY_TO_CFS) if inflow_mcm is not None else None
        outflow_cfs = round(outflow_mcm * MCM_PER_DAY_TO_CFS) if outflow_mcm is not None else None

        key = f"thailand_{re.sub(r'[^a-z0-9]+', '_', matched_meta['name'].lower()).strip('_')}"
        results[key] = {
            "name": matched_meta["name"],
            "river": matched_meta["river"],
            "state": matched_meta["province"],
            "country": "Thailand",
            "basin": matched_meta["basin"],
            "level": round(level_pct, 1) if level_pct is not None else None,
            "capacity": cap_tmc,
            "capacity_mcm": cap_mcm,
            "storage_mcm": round(storage_mcm, 1) if storage_mcm is not None else None,
            "inflow": inflow_cfs,
            "outflow": outflow_cfs,
            "unit": "cfs",
            "image": matched_meta["image"]
        }
        print(f"    EGAT: {matched_meta['name']} -> {level_pct}% ({storage_mcm}/{cap_mcm} MCM | {cap_tmc} TMC)")

    print(f"  EGAT Thailand: {len(results)} dams scraped.")
    return results


if __name__ == "__main__":
    res = scrape_thailand()
    print(f"\nTotal Thailand dams scraped: {len(res)}")
    for k, v in res.items():
        print(f"  - {v['name']} ({v['basin']}): {v['level']}% | {v['capacity']} TMC ({v['capacity_mcm']} MCM)")
