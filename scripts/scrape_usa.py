"""
scrape_usa.py – Scrape US reservoir water levels from:
  1. California CDEC (cdec.water.ca.gov/cgi-progs/reservoirs/RES) – HTML table
  2. USACE CWMS Data API (cwms-data.usace.army.mil/cwms-data) – JSON REST API

Returns a dict of {key: dam_dict} for merging into dams_usa.json.
Storage units: acre-feet (AF). Level reported as % of capacity.
1 AF = 0.001233482 TMC
"""

import urllib.request
import re
import json
import os
import ssl
import datetime

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
                  "(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
}

# 1 acre-foot in TMC
AF_TO_TMC = 0.001233482

# ────────────────────────────────────────────────────────────
# SECTION 1 — CDEC California Reservoirs
# URL: https://cdec.water.ca.gov/cgi-progs/reservoirs/RES
# Cols: Name | StaID | Capacity(AF) | Elevation(FT) | Storage(AF) | DeltaStorage |
#       %ofCapacity | AvgStorage(AF) | %ofAvg | Outflow(CFS) | Inflow(CFS) | StorageYrAgo
# ────────────────────────────────────────────────────────────

CDEC_URL = "https://cdec.water.ca.gov/cgi-progs/reservoirs/RES"

# Static metadata to enrich CDEC data (upper-case to match CDEC names)
CA_META = {
    "TRINITY LAKE":         {"name": "Trinity Lake",             "river": "Trinity",      "state": "California"},
    "SHASTA":               {"name": "Shasta Lake",              "river": "Sacramento",   "state": "California"},
    "OROVILLE":             {"name": "Lake Oroville",            "river": "Feather",      "state": "California"},
    "FOLSOM":               {"name": "Folsom Lake",              "river": "American",     "state": "California"},
    "NEW MELONES":          {"name": "New Melones Lake",         "river": "Stanislaus",   "state": "California"},
    "SAN LUIS":             {"name": "San Luis Reservoir",       "river": "San Luis Creek","state": "California"},
    "MILLERTON":            {"name": "Millerton Lake",           "river": "San Joaquin",  "state": "California"},
    "CACHUMA":              {"name": "Lake Cachuma",             "river": "Santa Ynez",   "state": "California"},
    "CASTAIC":              {"name": "Castaic Lake",             "river": "Castaic Creek","state": "California"},
    "PERRIS":               {"name": "Lake Perris",              "river": "Colorado Aqueduct","state": "California"},
    "PINE FLAT":            {"name": "Pine Flat Lake",           "river": "Kings",        "state": "California"},
    "LAKE BERRYESSA":       {"name": "Lake Berryessa",           "river": "Putah Creek",  "state": "California"},
    "DON PEDRO":            {"name": "Don Pedro Reservoir",      "river": "Tuolumne",     "state": "California"},
    "EXCHEQUER":            {"name": "Lake McClure (Exchequer)", "river": "Merced",       "state": "California"},
}

def clean_num(s):
    if not s:
        return None
    s = re.sub(r"[^\d.\-]", "", str(s).strip())
    try:
        return float(s) if s and s not in ["-", "."] else None
    except ValueError:
        return None

def fetch_html(url):
    try:
        req = urllib.request.Request(url, headers=HEADERS)
        with urllib.request.urlopen(req, timeout=25) as r:
            return r.read().decode("utf-8", errors="ignore")
    except Exception as e:
        print(f"  [WARN] fetch_html({url}): {e}")
        return None

def scrape_cdec():
    """
    Scrape CDEC reservoir summary. Actual HTML row format (no JS required):
    <tr class="white">
      <td class="...">SHASTA</td>
      <td class="..."><A href="...">SHF</A></td>
      <td class="...">4,552,000</td>   ← Capacity AF
      <td class="...">3,282.50</td>    ← Elevation ft
      <td class="..."><A href="...">3,540,219</A></td>  ← Storage AF
      <td class="...">-10,823</td>     ← Delta
      <td class="...">78</td>          ← % of Capacity
      <td class="...">3,219,614</td>   ← Avg Storage
      <td class="...">110</td>         ← % of Avg
      <td class="...">11,697</td>      ← Outflow CFS
      <td class="...">7,009</td>       ← Inflow CFS
      <td class="...">3,434,678</td>   ← Storage Yr Ago
    </tr>
    """
    results = {}
    print("  Fetching CDEC California...")
    html = fetch_html(CDEC_URL)
    if not html:
        print("  [WARN] CDEC: failed to fetch page.")
        return results

    for tr in re.findall(r'<tr[^>]*>(.*?)</tr>', html, re.DOTALL | re.IGNORECASE):
        cells = [re.sub(r'<[^>]+>', '', td).strip() for td in re.findall(r'<td[^>]*>(.*?)</td>', tr, re.DOTALL | re.IGNORECASE)]
        if len(cells) < 11:
            continue
        
        name_raw = cells[0]
        cap_str = cells[2].replace(",", "")
        storage_str = cells[4].replace(",", "")
        pct_str = cells[6]
        outflow_str = cells[9].replace(",", "") if len(cells) > 9 else ""
        inflow_str = cells[10].replace(",", "") if len(cells) > 10 else ""

        name_upper = name_raw.upper()

        # Match against known CA dams
        matched_key = None
        for k in CA_META:
            if k in name_upper or name_upper.startswith(k.split()[0]):
                matched_key = k
                break

        if matched_key is None:
            continue

        meta = CA_META[matched_key]
        cap_af = clean_num(cap_str)
        storage_af = clean_num(storage_str)
        pct = clean_num(pct_str)
        outflow_cfs = clean_num(outflow_str)
        inflow_cfs = clean_num(inflow_str)

        if pct is None and cap_af and storage_af and cap_af > 0:
            pct = round((storage_af / cap_af) * 100, 2)

        cap_tmc = round(cap_af * AF_TO_TMC, 3) if cap_af else None

        key = f"usa_{matched_key.lower().replace(' ', '_')}"
        results[key] = {
            "name": meta["name"],
            "river": meta["river"],
            "state": meta["state"],
            "country": "USA",
            "basin": "California",
            "level": round(pct, 2) if pct is not None else None,
            "capacity_af": int(cap_af) if cap_af else None,
            "capacity": cap_tmc,
            "storage_af": int(storage_af) if storage_af else None,
            "inflow": round(inflow_cfs) if inflow_cfs is not None else None,
            "outflow": round(outflow_cfs) if outflow_cfs is not None else None,
            "unit": "cfs"
        }
        stor_str = f"{storage_af:,.0f} AF" if storage_af is not None else "N/A"
        print(f"    CA: {meta['name']} – {pct}% ({stor_str})")

    print(f"  CDEC: {len(results)} California dams scraped.")
    return results


# ────────────────────────────────────────────────────────────
# SECTION 2 — USACE CWMS Data API
# Base URL: https://cwms-data.usace.army.mil/cwms-data
# Pool elevation → % storage via (elev - DSL) / (FRL - DSL)
# ────────────────────────────────────────────────────────────

USACE_BASE = "https://cwms-data.usace.army.mil/cwms-data"

USACE_TARGETS = [
    # (display_name, river, state, basin, ts_id_name, office, capacity_af, frl_ft, dsl_ft)
    ("Hoover Dam (Lake Mead)",              "Colorado",    "Nevada",        "Colorado River",     "MEAD.Stage.Inst.1Hour.0.Ccp-Rev",    "LCR",  26120000, 1229.0,  895.0),
    ("Glen Canyon Dam (Lake Powell)",       "Colorado",    "Utah",          "Colorado River",     "GLEN.Stage.Inst.1Hour.0.Ccp-Rev",    "LCR",  24322000, 3700.0, 3374.0),
    ("Grand Coulee Dam",                    "Columbia",    "Washington",    "Columbia River",     "GCL.Stage.Inst.1Hour.0.Ccp-Rev",     "NWW",   9562000, 1290.0, 1208.0),
    ("Garrison Dam (Lake Sakakawea)",       "Missouri",    "North Dakota",  "Missouri River",     "SAKP.Stage.Inst.1Hour.0.Ccp-Rev",    "NWO",  23821000, 1854.0, 1797.0),
    ("Oahe Dam (Lake Oahe)",               "Missouri",    "South Dakota",  "Missouri River",     "OAHE.Stage.Inst.1Hour.0.Ccp-Rev",    "NWO",  23137000, 1620.0, 1422.0),
    ("Fort Peck Dam",                       "Missouri",    "Montana",       "Missouri River",     "FPCK.Stage.Inst.1Hour.0.Ccp-Rev",    "NWO",  18527000, 2250.0, 2140.0),
    ("Norris Dam",                          "Clinch",      "Tennessee",     "Tennessee River",    "NOR.Stage.Inst.1Hour.0.Ccp-Rev",     "NAB",   2567000, 1020.0,  893.0),
    ("Kentucky Dam",                        "Tennessee",   "Kentucky",      "Tennessee River",    "KYD.Stage.Inst.1Hour.0.Ccp-Rev",     "NAB",   6129000,  359.0,  302.0),
    ("Barkley Dam",                         "Cumberland",  "Kentucky",      "Tennessee River",    "BAR.Stage.Inst.1Hour.0.Ccp-Rev",     "NAB",   4009000,  359.0,  302.0),
    ("Wolf Creek Dam (Lake Cumberland)",    "Cumberland",  "Kentucky",      "Tennessee River",    "CUMB.Stage.Inst.1Hour.0.Ccp-Rev",    "NAB",   6089000,  760.0,  680.0),
]

def fetch_usace(ts_name, office):
    """Fetch latest pool elevation from USACE CDA REST API."""
    now = datetime.datetime.now(datetime.UTC)
    start = (now - datetime.timedelta(days=2)).strftime("%Y-%m-%dT00:00:00Z")
    end = now.strftime("%Y-%m-%dT23:59:59Z")
    url = (
        f"{USACE_BASE}/timeseries"
        f"?name={ts_name}&office={office}"
        f"&begin={start}&end={end}&unit=ft"
    )
    try:
        req = urllib.request.Request(url, headers={**HEADERS, "Accept": "application/json;version=2"})
        with urllib.request.urlopen(req, timeout=15) as r:
            data = json.loads(r.read().decode("utf-8"))
            values = data.get("values", [])
            valid = [v for v in values if v[1] is not None]
            if valid:
                return float(valid[-1][1])
    except Exception as e:
        print(f"    [USACE] {ts_name}: {e}")
    return None

def scrape_usace():
    """Scrape USACE CWMS API for major US reservoirs."""
    results = {}
    print("  Fetching USACE CWMS API...")
    for (name, river, state, basin, ts_name, office, cap_af, frl, dsl) in USACE_TARGETS:
        elev = fetch_usace(ts_name, office)
        if elev is not None:
            usable = frl - dsl
            level_pct = max(0.0, min(100.0, round(((elev - dsl) / usable) * 100, 2))) if usable > 0 else 0.0
        else:
            level_pct = None

        cap_tmc = round(cap_af * AF_TO_TMC, 3)
        key = (
            "usa_" + re.sub(r"[^a-z0-9]+", "_", name.lower()).strip("_")
        )
        results[key] = {
            "name": name,
            "river": river,
            "state": state,
            "country": "USA",
            "basin": basin,
            "level": level_pct,
            "capacity_af": cap_af,
            "capacity": cap_tmc,
            "inflow": None,
            "outflow": None,
            "unit": "cfs",
            "elevation_ft": elev,
            "frl_ft": frl,
        }
        status = f"{level_pct}%" if level_pct is not None else "no data"
        print(f"    USACE: {name} ({state}) – {status}")

    print(f"  USACE: {len(results)} dams scraped.")
    return results


def scrape_usa():
    """Main entry point. Returns merged dict of all USA dams."""
    all_usa = {}
    try:
        all_usa.update(scrape_cdec())
    except Exception as e:
        print(f"  [ERROR] CDEC: {e}")
    try:
        all_usa.update(scrape_usace())
    except Exception as e:
        print(f"  [ERROR] USACE: {e}")
    return all_usa


if __name__ == "__main__":
    result = scrape_usa()
    print(f"\nTotal USA dams: {len(result)}")
    for k, v in result.items():
        print(f"  {v['name']} ({v['state']}) – {v['level']}%  cap={v['capacity']} TMC")
