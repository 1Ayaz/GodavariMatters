# -*- coding: utf-8 -*-
"""
Filter and produce clean GeoJSON files:
1. rajahmundry_rural_only.geojson — Just villages in Rajahmundry (Rural) mandal
2. rajahmundry_combined.geojson — Urban sachivalayams + Rural villages combined
"""
import sys, io, json
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')

DATA_DIR = r"C:\Users\mdaya\Desktop\CivicSnap\data"

# ─── Load the raw data ──────────────────────────────────────────
with open(f"{DATA_DIR}\\rajahmundry_rural_villages.geojson", "r", encoding="utf-8") as f:
    rural_all = json.load(f)

with open(f"{DATA_DIR}\\rajahmundry_sachivalayams.geojson", "r", encoding="utf-8") as f:
    urban = json.load(f)

# ─── 1. Filter for Rajahmundry Rural mandal ────────────────────
rural_features = [
    f for f in rural_all["features"]
    if f["properties"].get("mandal") == "Rajahmundry (Rural)"
]

# Clean up properties for consistency
for f in rural_features:
    p = f["properties"]
    f["properties"] = {
        "name": p.get("village", "Unknown"),
        "type": "rural_village",
        "mandal": p.get("mandal", ""),
        "district": p.get("district", ""),
        "state_code": p.get("stcodeind", ""),
        "district_code_ap": p.get("dstcodeap", ""),
        "district_code_ind": p.get("dstcodeind", ""),
        "mandal_code": p.get("mndcodeap", ""),
        "village_code": p.get("villcodeap", ""),
        "shape_area": p.get("shape_area", 0),
    }

rural_geojson = {
    "type": "FeatureCollection",
    "name": "Rajahmundry_Rural_Villages",
    "features": rural_features
}

rural_path = f"{DATA_DIR}\\rajahmundry_rural_only.geojson"
with open(rural_path, "w", encoding="utf-8") as f:
    json.dump(rural_geojson, f, indent=2, ensure_ascii=False)

print(f"Rural GeoJSON: {len(rural_features)} villages")
for feat in rural_features:
    p = feat["properties"]
    area_sq_km = p["shape_area"] / 1_000_000
    print(f"  - {p['name']:25s} (code: {p['village_code']}, area: {area_sq_km:.2f} sq km)")
print(f"Saved to: {rural_path}")

# ─── 2. Combined GeoJSON: Urban + Rural ────────────────────────
# Tag urban features
for f in urban["features"]:
    f["properties"]["type"] = "urban_sachivalayam"

combined = {
    "type": "FeatureCollection",
    "name": "Rajamahendravaram_Combined",
    "features": urban["features"] + rural_features
}

combined_path = f"{DATA_DIR}\\rajahmundry_combined.geojson"
with open(combined_path, "w", encoding="utf-8") as f:
    json.dump(combined, f, indent=2, ensure_ascii=False)

print(f"\nCombined GeoJSON: {len(combined['features'])} features")
print(f"  - {len(urban['features'])} urban sachivalayams")
print(f"  - {len(rural_features)} rural villages")
print(f"Saved to: {combined_path}")

# ─── 3. Also save the broader East Godavari region data ────────
# Filter to only nearby mandals (not mandals 50km away)
nearby_mandals = [
    "Rajahmundry (Rural)", "Rajahmundry (Fully Urban)", 
    "Kadiam", "Korukonda", "Rajanagaram", "Rangampeta",
    "Seethanagaram"
]

nearby_features = [
    f for f in rural_all["features"]
    if f["properties"].get("mandal") in nearby_mandals
]

for f in nearby_features:
    p = f["properties"]
    f["properties"] = {
        "name": p.get("village", "Unknown"),
        "type": "rural_village",
        "mandal": p.get("mandal", ""),
        "district": p.get("district", ""),
        "mandal_code": p.get("mndcodeap", ""),
        "village_code": p.get("villcodeap", ""),
        "shape_area": p.get("shape_area", 0),
    }

nearby_geojson = {
    "type": "FeatureCollection",
    "name": "Rajamahendravaram_Region_Villages",
    "features": nearby_features
}

nearby_path = f"{DATA_DIR}\\rajahmundry_region_villages.geojson"
with open(nearby_path, "w", encoding="utf-8") as f:
    json.dump(nearby_geojson, f, indent=2, ensure_ascii=False)

print(f"\nRegion GeoJSON: {len(nearby_features)} villages from {len(nearby_mandals)} mandals")
for m in nearby_mandals:
    count = len([f for f in nearby_features if f["properties"]["mandal"] == m])
    if count > 0:
        print(f"  - {m}: {count} villages")
print(f"Saved to: {nearby_path}")
