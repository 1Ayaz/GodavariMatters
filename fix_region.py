# -*- coding: utf-8 -*-
import sys, io, json
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')

DATA = r"C:\Users\mdaya\Desktop\CivicSnap\data"
raw = json.load(open(f"{DATA}\\rajahmundry_rural_villages.geojson", "r", encoding="utf-8"))

# Only keep Rajahmundry mandals, remove River
clean = []
for f in raw["features"]:
    p = f["properties"]
    if "Rajahmundry" not in p.get("mandal", ""):
        continue
    if p.get("village", "") == "River":
        continue
    clean.append({
        "type": "Feature",
        "geometry": f["geometry"],
        "properties": {
            "name": p.get("village", "?"),
            "mandal": p["mandal"],
            "district": p.get("district", ""),
            "village_code": p.get("villcodeap", ""),
            "shape_area": p.get("shape_area", 0),
            "type": "urban_boundary" if "Urban" in p["mandal"] else "rural_village",
        }
    })

geo = {"type": "FeatureCollection", "features": clean}
with open(f"{DATA}\\rajahmundry_region_villages.geojson", "w", encoding="utf-8") as fh:
    json.dump(geo, fh, indent=2, ensure_ascii=False)

print(f"Region fixed: {len(clean)} features")
for f in clean:
    p = f["properties"]
    print(f"  {p['name']:25s} {p['mandal']}")
