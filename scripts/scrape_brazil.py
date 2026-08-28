"""
scrape_brazil.py – Scrape Brazilian reservoir water levels from:
  1. ONS Open Data (dados.ons.org.br / AWS S3 Open Data Bucket)
  2. Fallback static / cached telemetry

Returns a dict of {key: dam_dict} for merging into dams_brazil.json.
Storage units: hm³ (= MCM). Level reported as % of capacity.
1 hm³ = 0.035314666 TMC
"""

import urllib.request
import re
import json
import os
import csv
import io
import datetime

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
                  "(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
}

HM3_TO_TMC = 0.035314666  # 1 hm³ = 0.035314666 TMC

# Known major Brazilian reservoirs and metadata
ONS_META = {
    "itaipu":                       {"name": "Itaipu",                          "river": "Paraná",        "state": "Paraná",                "basin": "Paraná",         "cap_hm3": 29000},
    "tucurui":                      {"name": "Tucuruí",                         "river": "Tocantins",     "state": "Pará",                  "basin": "Amazon",         "cap_hm3": 45536},
    "serra_da_mesa":                {"name": "Serra da Mesa",                   "river": "Tocantins",     "state": "Goiás",                 "basin": "Amazon",         "cap_hm3": 54400},
    "sobradinho":                   {"name": "Sobradinho",                      "river": "São Francisco", "state": "Bahia",                 "basin": "São Francisco",  "cap_hm3": 34117},
    "tres_marias":                  {"name": "Três Marias",                     "river": "São Francisco", "state": "Minas Gerais",          "basin": "São Francisco",  "cap_hm3": 19528},
    "ilha_solteira":                {"name": "Ilha Solteira",                   "river": "Paraná",        "state": "São Paulo",             "basin": "Paraná",         "cap_hm3": 21060},
    "emborcacao":                   {"name": "Emborcação",                      "river": "Paranaíba",     "state": "Minas Gerais",          "basin": "Paraná",         "cap_hm3": 17500},
    "nova_ponte":                   {"name": "Nova Ponte",                      "river": "Araguari",      "state": "Minas Gerais",          "basin": "Paraná",         "cap_hm3": 12792},
    "furnas":                       {"name": "Furnas",                          "river": "Grande",        "state": "Minas Gerais",          "basin": "Paraná",         "cap_hm3": 22950},
    "porto_primavera":              {"name": "Porto Primavera",                 "river": "Paraná",        "state": "Mato Grosso do Sul",    "basin": "Paraná",         "cap_hm3": 20000},
    "itumbiara":                    {"name": "Itumbiara",                       "river": "Paranaíba",     "state": "Goiás",                 "basin": "Paraná",         "cap_hm3": 17027},
    "sao_simao":                    {"name": "São Simão",                       "river": "Paranaíba",     "state": "Goiás",                 "basin": "Paraná",         "cap_hm3": 12700},
    "marimbondo":                   {"name": "Marimbondo",                      "river": "Grande",        "state": "São Paulo",             "basin": "Paraná",         "cap_hm3": 5260},
    "agua_vermelha":                {"name": "Água Vermelha",                   "river": "Grande",        "state": "São Paulo",             "basin": "Paraná",         "cap_hm3": 11000},
    "xingo":                        {"name": "Xingó",                           "river": "São Francisco", "state": "Sergipe",               "basin": "São Francisco",  "cap_hm3": 3800},
    "luiz_gonzaga":                 {"name": "Luiz Gonzaga (Itaparica)",        "river": "São Francisco", "state": "Bahia",                 "basin": "São Francisco",  "cap_hm3": 10782},
    "salto_santiago":               {"name": "Salto Santiago",                  "river": "Iguaçu",        "state": "Paraná",                "basin": "Paraná",         "cap_hm3": 6750},
    "ita":                          {"name": "Itá",                             "river": "Uruguay",       "state": "Santa Catarina",        "basin": "Uruguay",        "cap_hm3": 5100},
    "belo_monte":                   {"name": "Belo Monte",                      "river": "Xingu",         "state": "Pará",                  "basin": "Amazon",         "cap_hm3": 1889},
    "santo_antonio":                {"name": "Santo Antônio",                   "river": "Madeira",       "state": "Rondônia",              "basin": "Amazon",         "cap_hm3": 2200},
    "jirau":                        {"name": "Jirau",                           "river": "Madeira",       "state": "Rondônia",              "basin": "Amazon",         "cap_hm3": 2000},
    "peixe_angical":                {"name": "Peixe Angical",                   "river": "Tocantins",     "state": "Tocantins",             "basin": "Amazon",         "cap_hm3": 2740},
    "lajeado":                      {"name": "Lajeado",                         "river": "Tocantins",     "state": "Tocantins",             "basin": "Amazon",         "cap_hm3": 5180},
    "cana_brava":                   {"name": "Cana Brava",                      "river": "Tocantins",     "state": "Goiás",                 "basin": "Amazon",         "cap_hm3": 4340},
    "sao_salvador":                 {"name": "São Salvador",                    "river": "Tocantins",     "state": "Goiás",                 "basin": "Amazon",         "cap_hm3": 953},
    "retiro_baixo":                 {"name": "Retiro Baixo",                    "river": "Paraopeba",     "state": "Minas Gerais",          "basin": "São Francisco",  "cap_hm3": 242},
    "corumba_iv":                   {"name": "Corumbá IV",                      "river": "Corumbá",       "state": "Goiás",                 "basin": "Paraná",         "cap_hm3": 3720},
    "capim_branco_i":               {"name": "Capim Branco I",                  "river": "Araguari",      "state": "Minas Gerais",          "basin": "Paraná",         "cap_hm3": 244},
    "capim_branco_ii":              {"name": "Capim Branco II",                 "river": "Araguari",      "state": "Minas Gerais",          "basin": "Paraná",         "cap_hm3": 75},
    "batalha":                      {"name": "Batalha",                         "river": "São Marcos",    "state": "Goiás",                 "basin": "Paraná",         "cap_hm3": 1783},
    "queimado":                     {"name": "Queimado",                        "river": "Preto",         "state": "Goiás",                 "basin": "São Francisco",  "cap_hm3": 477},
    "salto_caxias":                 {"name": "Salto Caxias",                    "river": "Iguaçu",        "state": "Paraná",                "basin": "Paraná",         "cap_hm3": 3558},
    "boa_esperanca":                {"name": "Boa Esperança",                   "river": "Parnaíba",      "state": "Maranhão",              "basin": "Northeast",      "cap_hm3": 5100},
    "itapebi":                      {"name": "Itapebi",                         "river": "Jequitinhonha", "state": "Bahia",                 "basin": "Northeast",      "cap_hm3": 1590},
    "balbina":                      {"name": "Balbina",                         "river": "Uatumã",        "state": "Amazonas",              "basin": "Amazon",         "cap_hm3": 17540},
}

def normalize_br_key(name):
    """Normalize a reservoir name to a lookup key."""
    name = name.lower().strip()
    for src, dst in [("ã","a"),("â","a"),("á","a"),("à","a"),("ä","a"),
                     ("ê","e"),("é","e"),("è","e"),("ë","e"),
                     ("î","i"),("í","i"),("ï","i"),
                     ("ô","o"),("ó","o"),("õ","o"),("ò","o"),("ö","o"),
                     ("ú","u"),("û","u"),("ü","u"),("ù","u"),
                     ("ç","c"),("ñ","n")]:
        name = name.replace(src, dst)
    name = re.sub(r"[^a-z0-9]+", "_", name).strip("_")
    return name

def fetch_ons_data():
    """Fetch latest ONS reservoir data directly from ONS Open Data S3 CSV bucket."""
    results = {}
    print("  Fetching ONS Hydro Telemetry (dados.ons.org.br)...")

    now = datetime.datetime.utcnow()
    # Try current month then previous month
    months_to_try = [
        (now.year, now.month),
        (now.year if now.month > 1 else now.year - 1, now.month - 1 if now.month > 1 else 12)
    ]

    csv_data = None
    for y, m in months_to_try:
        url = f"https://ons-aws-prod-opendata.s3.amazonaws.com/dataset/dados_hidrologicos_ho/DADOS_HIDROLOGICOS_HO_{y}_{m:02d}.csv"
        print(f"    Trying: {url}")
        try:
            req = urllib.request.Request(url, headers=HEADERS)
            with urllib.request.urlopen(req, timeout=25) as r:
                csv_data = r.read().decode("utf-8", errors="ignore")
                if csv_data:
                    print(f"    [OK] Downloaded ONS dataset for {y}-{m:02d} ({len(csv_data):,} bytes)")
                    break
        except Exception as e:
            print(f"    [WARN] Failed to fetch {url}: {e}")

    if not csv_data:
        print("  [WARN] ONS: could not download any monthly dataset.")
        return results

    try:
        reader = csv.reader(io.StringIO(csv_data), delimiter=';')
        header = next(reader)
        header_lower = [h.strip().lower() for h in header]

        name_idx = header_lower.index("nom_reservatorio") if "nom_reservatorio" in header_lower else 5
        vol_idx = header_lower.index("val_volumeutil") if "val_volumeutil" in header_lower else 10
        inflow_idx = header_lower.index("val_vazaoafluente") if "val_vazaoafluente" in header_lower else 11
        outflow_idx = header_lower.index("val_vazaodefluente") if "val_vazaodefluente" in header_lower else 12
        date_idx = header_lower.index("din_instante") if "din_instante" in header_lower else 7

        # Group rows by dam name, keeping latest timestamp
        latest_by_dam = {}
        for row in reader:
            if len(row) <= max(name_idx, vol_idx, inflow_idx, outflow_idx):
                continue
            raw_name = row[name_idx].strip()
            norm_key = normalize_br_key(raw_name)
            
            # Find best match in ONS_META
            matched_key = None
            if norm_key in ONS_META:
                matched_key = norm_key
            else:
                for k in ONS_META:
                    if k in norm_key or norm_key in k:
                        matched_key = k
                        break
            
            if not matched_key:
                continue

            dt_str = row[date_idx].strip() if date_idx < len(row) else ""
            try:
                vol_pct = float(row[vol_idx].replace(",", ".")) if row[vol_idx].strip() else None
            except:
                vol_pct = None

            try:
                inflow = float(row[inflow_idx].replace(",", ".")) if row[inflow_idx].strip() else None
            except:
                inflow = None

            try:
                outflow = float(row[outflow_idx].replace(",", ".")) if row[outflow_idx].strip() else None
            except:
                outflow = None

            # Keep newest reading
            if matched_key not in latest_by_dam or dt_str > latest_by_dam[matched_key].get("dt", ""):
                latest_by_dam[matched_key] = {
                    "dt": dt_str,
                    "vol_pct": vol_pct,
                    "inflow": inflow,
                    "outflow": outflow,
                    "raw_name": raw_name
                }

        for matched_key, item in latest_by_dam.items():
            meta = ONS_META[matched_key]
            cap_hm3 = meta.get("cap_hm3")
            cap_tmc = round(cap_hm3 * HM3_TO_TMC, 3) if cap_hm3 else None

            results[f"brazil_{matched_key}"] = {
                "name": meta["name"],
                "river": meta["river"],
                "state": meta["state"],
                "country": "Brazil",
                "basin": meta["basin"],
                "level": round(item["vol_pct"], 1) if item["vol_pct"] is not None else None,
                "capacity_hm3": cap_hm3,
                "capacity": cap_tmc,
                "inflow": round(item["inflow"]) if item["inflow"] is not None else None,
                "outflow": round(item["outflow"]) if item["outflow"] is not None else None,
                "unit": "m3s"
            }
            print(f"    ONS: {meta['name']} – {item['vol_pct']}% (in: {item['inflow']} m³/s, out: {item['outflow']} m³/s)")

        print(f"  ONS: {len(results)} Brazilian dams processed.")
    except Exception as e:
        print(f"  [ERROR] Parsing ONS CSV: {e}")

    return results

def scrape_brazil_dams():
    """Main entry point: fetch ONS telemetry."""
    print("\n--- Scraping Brazil Reservoirs (ONS) ---")
    results = fetch_ons_data()
    print(f"Total Brazil dams scraped: {len(results)}")
    return results

scrape_brazil = scrape_brazil_dams

if __name__ == "__main__":
    dams = scrape_brazil_dams()
    print(f"\nTotal Brazil dams: {len(dams)}")
    for k, d in list(dams.items())[:8]:
        print(f"  {d['name']} ({d['state']}) -> {d['level']}% | Inflow: {d['inflow']} m3/s | Outflow: {d['outflow']} m3/s")
