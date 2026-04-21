# -*- coding: utf-8 -*-
"""Audit all GeoJSON data to identify unknowns and non-Rajahmundry features."""
import sys, io, json
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')

DATA = r"C:\Users\mdaya\Desktop\CivicSnap\data"

# ── Urban ──
print("=" * 60)
print("  URBAN SACHIVALAYAMS")
print("=" * 60)
urban = json.load(open(f"{DATA}\\rajahmundry_sachivalayams.geojson", "r", encoding="utf-8"))
no_sno = [f for f in urban["features"] if not f["properties"].get("sno")]
print(f"Total: {len(urban['features'])}")
print(f"Matched with master list (have sno): {len(urban['features']) - len(no_sno)}")
print(f"NOT matched (no sno): {len(no_sno)}")
for f in no_sno:
    p = f["properties"]
    print(f"  ? {p['name']:30s} code={p['code']}")
print()

# ── Rural ──
print("=" * 60)
print("  RURAL VILLAGES (Rajahmundry Rural mandal)")
print("=" * 60)
rural = json.load(open(f"{DATA}\\rajahmundry_rural_only.geojson", "r", encoding="utf-8"))
print(f"Total: {len(rural['features'])}")
for f in rural["features"]:
    p = f["properties"]
    area_km2 = p.get("shape_area", 0) / 1_000_000
    status = ""
    if p["name"] == "River":
        status = " ← WATER BODY (Godavari River, not a village)"
    elif p["name"] == "Rajahmundry Part":
        status = " ← PERI-URBAN ZONE (gap between urban & rural boundaries)"
    print(f"  {p['name']:30s} code={p.get('village_code','?'):5s} area={area_km2:.2f} km2{status}")

print()
print("ANALYSIS:")
print("  - 'River' is the Godavari River water body polygon, NOT a habitable village")
print("  - 'Rajahmundry Part' is the peri-urban transition zone")
print("  - Both can be kept for completeness but should be tagged/excluded from sachivalayam routing")
print()

# ── Region ──
print("=" * 60)
print("  REGION DATA (broader area)")
print("=" * 60)
region = json.load(open(f"{DATA}\\rajahmundry_region_villages.geojson", "r", encoding="utf-8"))
mandals = {}
for f in region["features"]:
    mandals.setdefault(f["properties"]["mandal"], []).append(f["properties"]["name"])

for m, villages in sorted(mandals.items()):
    belongs = "Rajahmundry" in m
    marker = "✅ BELONGS" if belongs else "❌ OUTSIDE Rajahmundry"
    print(f"  {m} ({len(villages)} villages) — {marker}")
    for v in sorted(villages):
        print(f"      {v}")

# Count what should be removed from region 
outside = [f for f in region["features"] if "Rajahmundry" not in f["properties"]["mandal"]]
inside = [f for f in region["features"] if "Rajahmundry" in f["properties"]["mandal"]]
print(f"\n  INSIDE Rajahmundry: {len(inside)} features")
print(f"  OUTSIDE Rajahmundry (should be removed): {len(outside)} features")
