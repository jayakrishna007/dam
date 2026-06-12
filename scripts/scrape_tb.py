import urllib.request
import re
import json
import os

url = "http://tbboard.gov.in/daily_000/daily_level_list.php"
headers = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36"
}

def clean_number(s):
    # Remove commas, spaces, units, etc.
    s = re.sub(r'[^\d.]', '', s)
    return float(s) if s else 0.0

try:
    req = urllib.request.Request(url, headers=headers)
    with urllib.request.urlopen(req, timeout=15) as response:
        html = response.read().decode('utf-8', errors='ignore')
    
    print("Scraped page successfully, length:", len(html))
    
    # 1. Date extraction
    # Example: "Detailed Updated Information as on: 12-06-2026"
    date_match = re.search(r'Detailed Updated Information as on:\s*([\d-]+)', html)
    scraped_date = date_match.group(1) if date_match else "Unknown Date"
    print("Scraped Date:", scraped_date)
    
    # Let's find the table values using regex
    # The table row structure:
    # <tr class='light'><th><h4 class='text-center'>Reservoir Level </h4></th><td><h4 class='text-center'>1,588.59 ft</h4></td>...
    # We want the first <td> after the <th> for each metric (this is "On This Day")
    
    def extract_metric(html, label):
        pattern = rf"{label}\s*<\/h4>\s*<\/th>\s*<td>\s*<h4 class='text-center'>([^<]+)<\/h4>"
        match = re.search(pattern, html, re.IGNORECASE)
        if not match:
            # Try a looser pattern in case of whitespace/quote variations
            pattern_loose = rf"{label}.*?<\/th>\s*<td>.*?text-center'>(.*?)<\/h4>"
            match = re.search(pattern_loose, html, re.IGNORECASE | re.DOTALL)
        return match.group(1).strip() if match else None

    level_str = extract_metric(html, "Reservoir Level")
    storage_str = extract_metric(html, "Reservoir Capacity")
    inflow_str = extract_metric(html, "Inflow Details")
    outflow_str = extract_metric(html, "Outflow Details")
    
    print("Extracted strings:")
    print("  Level:", level_str)
    print("  Storage:", storage_str)
    print("  Inflow:", inflow_str)
    print("  Outflow:", outflow_str)
    
    if not storage_str:
        raise ValueError("Failed to extract storage capacity from HTML.")
        
    storage_val = clean_number(storage_str.replace("TMC", ""))
    inflow_val = int(clean_number(inflow_str.replace("Cusecs", "")))
    outflow_val = int(clean_number(outflow_str.replace("Cusecs", "")))
    
    # Tungabhadra Capacity (Max Capacity from table is 105.788 TMC)
    max_capacity = 105.788
    level_percent = round((storage_val / max_capacity) * 100, 2)
    
    print(f"Calculated level percent: {level_percent}% of {max_capacity} TMC")
    
    # 2. Read and update dams.json
    script_dir = os.path.dirname(os.path.abspath(__file__))
    json_path = os.path.join(script_dir, "..", "src", "data", "dams.json")
    
    if os.path.exists(json_path):
        with open(json_path, "r", encoding="utf-8") as f:
            dams = json.load(f)
    else:
        print("dams.json not found, cannot update.")
        exit(1)
        
    updated = False
    for dam in dams:
        if dam["name"].lower() == "tungabhadra":
            dam["level"] = level_percent
            dam["capacity"] = max_capacity
            dam["inflow"] = inflow_val
            dam["outflow"] = outflow_val
            updated = True
            break
            
    if updated:
        with open(json_path, "w", encoding="utf-8") as f:
            json.dump(dams, f, indent=2)
        print("dams.json updated successfully!")
    else:
        print("Tungabhadra dam not found in dams.json")
        
except Exception as e:
    print("Error during scraping:", e)
    exit(1)
