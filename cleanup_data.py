# -*- coding: utf-8 -*-
"""
Clean up all GeoJSON files:
1. Rural: Remove 'River' water body, tag 'Rajahmundry Part' as peri-urban
2. Combined: Urban (95) + Clean Rural (8 actual villages) = 103
3. Region: Remove non-Rajahmundry mandals
"""
import sys, io, json
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')

DATA = r"C:\Users\mdaya\Desktop\CivicSnap\data"

# ── Load urban ──
urban = json.load(open(f"{DATA}\\rajahmundry_sachivalayams.geojson", "r", encoding="utf-8"))
for f in urban["features"]:
    f["properties"]["type"] = "urban_sachivalayam"

# ── Load raw rural (from fetch_rural output, not the cleaned version) ──
raw_rural = json.load(open(f"{DATA}\\rajahmundry_rural_villages.geojson", "r", encoding="utf-8"))

# Filter to Rajahmundry Rural mandal only
rjy_rural = [f for f in raw_rural["features"] 
             if f["properties"].get("mandal") == "Rajahmundry (Rural)"]

# Classify each feature
clean_rural = []
removed = []
for f in rjy_rural:
    p = f["properties"]
    name = p.get("village", "Unknown")
    code = p.get("villcodeap", "NA")
    area = p.get("shape_area", 0)
    
    # Build clean properties
    clean_props = {
        "name": p.get("village", "Unknown"),
        "mandal": "Rajahmundry (Rural)",
        "district": p.get("district", "East Godavari"),
        "village_code": code,
        "mandal_code": p.get("mndcodeap", "08"),
        "shape_area": area,
    }
    
    if name == "River" and code == "NA":
        clean_props["type"] = "water_body"
        removed.append(f"REMOVED: '{name}' — Godavari River water body polygon (54.67 km2)")
        continue  # Skip water body
    elif name == "Rajahmundry Part":
        clean_props["type"] = "rural_peri_urban"
        # Keep but tag — useful for understanding the full boundary
    else:
        clean_props["type"] = "rural_village"
    
    f["properties"] = clean_props
    clean_rural.append(f)

# ── Save clean rural ──
rural_geojson = {
    "type": "FeatureCollection",
    "name": "Rajahmundry_Rural_Villages",
    "features": clean_rural
}
with open(f"{DATA}\\rajahmundry_rural_only.geojson", "w", encoding="utf-8") as fh:
    json.dump(rural_geojson, fh, indent=2, ensure_ascii=False)

print("=" * 60)
print("  CLEANED RURAL DATA")
print("=" * 60)
for r in removed:
    print(f"  {r}")
print()
print(f"  Kept {len(clean_rural)} features:")
for f in clean_rural:
    p = f["properties"]
    area_km2 = p.get("shape_area", 0) / 1e6
    tag = f" [{p['type']}]" if p['type'] != 'rural_village' else ""
    print(f"    ✅ {p['name']:25s} code={p['village_code']:5s} area={area_km2:.2f} km2{tag}")

# ── Save combined ──
combined = {
    "type": "FeatureCollection",
    "name": "Rajamahendravaram_Combined",
    "features": urban["features"] + clean_rural
}
with open(f"{DATA}\\rajahmundry_combined.geojson", "w", encoding="utf-8") as fh:
    json.dump(combined, fh, indent=2, ensure_ascii=False)

print(f"\n  Combined GeoJSON: {len(combined['features'])} features")
print(f"    Urban sachivalayams: {len(urban['features'])}")
print(f"    Rural villages:     {len(clean_rural)}")

# ── Clean region (only Rajahmundry mandals) ──
rjy_region = [f for f in raw_rural["features"]
              if "Rajahmundry" in f["properties"].get("mandal", "")]

# Also add the urban boundary polygon from the 'Fully Urban' entry
urban_entry = [f for f in raw_rural["features"]
               if f["properties"].get("mandal") == "Rajahmundry (Fully Urban)"]

all_region = rjy_rural + urban_entry
clean_region = []
for f in all_region:
    p = f["properties"]
    name = p.get("village", p.get("name", "Unknown"))
    code = p.get("villcodeap", p.get("village_code", "NA"))
    
    if name == "River" and code == "NA":
        continue  # Skip river
    
    clean_props = {
        "name": p.get("village", name),
        "mandal": p.get("mandal", ""),
        "district": p.get("district", ""),
        "village_code": code,
        "shape_area": p.get("shape_area", 0),
        "type": "urban_boundary" if "Urban" in p.get("mandal", "") else "rural_village"
    }
    f_copy = {"type": "Feature", "geometry": f["geometry"], "properties": clean_props}
    clean_region.append(f_copy)

region_geojson = {
    "type": "FeatureCollection",
    "name": "Rajamahendravaram_Region",
    "features": clean_region
}
with open(f"{DATA}\\rajahmundry_region_villages.geojson", "w", encoding="utf-8") as fh:
    json.dump(region_geojson, fh, indent=2, ensure_ascii=False)

print(f"\n  Region GeoJSON (Rajahmundry only): {len(clean_region)} features")
for f in clean_region:
    p = f["properties"]
    print(f"    {p['name']:25s} mandal={p['mandal']}")

# ── Final summary ──
print(f"\n{'=' * 60}")
print(f"  FINAL CLEAN DATA SUMMARY")
print(f"{'=' * 60}")
print(f"  rajahmundry_sachivalayams.geojson : {len(urban['features'])} urban sachivalayams (unchanged)")
print(f"  rajahmundry_rural_only.geojson    : {len(clean_rural)} rural villages (removed River)")
print(f"  rajahmundry_combined.geojson      : {len(combined['features'])} total features")
print(f"  rajahmundry_region_villages.geojson: {len(clean_region)} Rajahmundry-only features")
