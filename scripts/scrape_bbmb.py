import urllib.request
import ssl
import re
import os
import json

PDF_URL = "https://bbmb.gov.in/writereaddata/Portal/images/pdf/res_data.pdf"
HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
}

def clean_number(s):
    s = re.sub(r'[^\d.]', '', s)
    return float(s) if s else 0.0

def scrape_bbmb():
    pdf_filename = "bbmb_res_data_tmp.pdf"
    
    try:
        # Download daily PDF
        context = ssl._create_unverified_context()
        req = urllib.request.Request(PDF_URL, headers=HEADERS)
        with urllib.request.urlopen(req, context=context, timeout=30) as response:
            pdf_data = response.read()
            
        with open(pdf_filename, "wb") as f:
            f.write(pdf_data)
            
        # Parse PDF using pypdf (with dynamic fallback install if missing)
        try:
            import pypdf
        except ImportError:
            import subprocess
            import sys
            print("pypdf is missing. Attempting dynamic installation...")
            try:
                # Try targeting /tmp first (useful in serverless environments like AWS Lambda / Vercel)
                tmp_dir = "/tmp/python-packages"
                os.makedirs(tmp_dir, exist_ok=True)
                subprocess.check_call([sys.executable, "-m", "pip", "install", "--target", tmp_dir, "pypdf"])
                if tmp_dir not in sys.path:
                    sys.path.append(tmp_dir)
                import pypdf
            except Exception as e:
                # Try standard pip install as fallback
                try:
                    subprocess.check_call([sys.executable, "-m", "pip", "install", "pypdf"])
                    import pypdf
                except Exception as e2:
                    print(f"Failed to install pypdf: {e2}")
                    pypdf = None

        if pypdf is None:
            raise ImportError("The 'pypdf' package is required to parse the BBMB PDF, but it is not installed and could not be dynamically installed.")

        reader = pypdf.PdfReader(pdf_filename)
        text = reader.pages[0].extract_text()
        
        # Clean up temporary PDF file
        if os.path.exists(pdf_filename):
            os.remove(pdf_filename)
            
        # Match lines like:
        # Bhakra  1574.81  17523  26338
        # Pong  1324.82  2342  12004
        bhakra_match = re.search(r'Bhakra\s+([\d\.]+)\s+([\d\.]+)\s+([\d\.]+)', text)
        pong_match = re.search(r'Pong\s+([\d\.]+)\s+([\d\.]+)\s+([\d\.]+)', text)
        
        results = {}
        
        if bhakra_match:
            level = clean_number(bhakra_match.group(1))
            inflow = int(clean_number(bhakra_match.group(2)))
            outflow = int(clean_number(bhakra_match.group(3)))
            
            # Bhakra Gobind Sagar active storage capacity is ~197.8 TMC. DSL = 1462, FRL = 1680
            # Calculate volume in TMC using quadratic curve
            dsl, frl, capacity = 1462.0, 1680.0, 197.7
            if level >= dsl:
                storage_tmc = round(capacity * ((level - dsl) / (frl - dsl)) ** 2, 2)
                level_pct = round((storage_tmc / capacity) * 100, 2)
            else:
                storage_tmc = 0.0
                level_pct = 0.0
                
            results["bhakra"] = {
                "name": "Bhakra (Gobind Sagar)",
                "level": level_pct,
                "capacity": capacity,
                "inflow": inflow,
                "outflow": outflow,
                "state": "Himachal Pradesh",
                "river": "Sutlej",
                "district": "Bilaspur",
                "height_feet": level,
                "storage_tmc": storage_tmc
            }
            
        if pong_match:
            level = clean_number(pong_match.group(1))
            inflow = int(clean_number(pong_match.group(2)))
            outflow = int(clean_number(pong_match.group(3)))
            
            # Pong Dam active storage capacity is ~257 TMC. DSL = 1260, FRL = 1390 (reduced FRL)
            dsl, frl, capacity = 1260.0, 1390.0, 257.0
            if level >= dsl:
                storage_tmc = round(capacity * ((level - dsl) / (frl - dsl)) ** 2, 2)
                level_pct = round((storage_tmc / capacity) * 100, 2)
            else:
                storage_tmc = 0.0
                level_pct = 0.0
                
            results["pong"] = {
                "name": "Pong (Maharana Pratap Sagar)",
                "level": level_pct,
                "capacity": capacity,
                "inflow": inflow,
                "outflow": outflow,
                "state": "Himachal Pradesh",
                "river": "Beas",
                "district": "Kangra",
                "height_feet": level,
                "storage_tmc": storage_tmc
            }
            
        return results
    except Exception as e:
        print(f"Error scraping BBMB PDF: {e}")
        if os.path.exists(pdf_filename):
            os.remove(pdf_filename)
        return None

if __name__ == "__main__":
    res = scrape_bbmb()
    print(json.dumps(res, indent=2))
