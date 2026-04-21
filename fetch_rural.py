# -*- coding: utf-8 -*-
"""
Extract ALL village boundaries for Rajamahendravaram Rural mandal
from APSAC GeoServer using workspace-specific WFS or tiled WMS GetFeatureInfo.
"""
import sys, io, json, requests
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
requests.packages.urllib3.disable_warnings()

BASE = "https://apsac.ap.gov.in/geoserver"
LAYER = "gatishakti1:AP_VillageBoundary"
LAYER_SHORT = "AP_VillageBoundary"
WORKSPACE = "gatishakti1"

# Rajamahendravaram area bounding box (generous)
BBOX = "81.65,16.90,81.95,17.10"

OUTPUT_FILE = r"C:\Users\mdaya\Desktop\CivicSnap\data\rajahmundry_rural_villages.geojson"

# ─── Approach 1: Try workspace-specific WFS ───────────────────────
print("="*60)
print("  Approach 1: Workspace-specific WFS")
print("="*60)

wfs_urls = [
    f"{BASE}/{WORKSPACE}/wfs",
    f"{BASE}/{WORKSPACE}/ows",
    f"{BASE}/ows",
]

for wfs_url in wfs_urls:
    try:
        r = requests.get(wfs_url, params={
            "service": "WFS",
            "version": "1.0.0",
            "request": "GetFeature",
            "typeName": LAYER,
            "outputFormat": "application/json",
            "bbox": BBOX,
            "maxFeatures": 200,
            "srsName": "EPSG:4326",
        }, verify=False, timeout=30)
        
        print(f"\n  [{r.status_code}] {wfs_url.split('.in/')[-1]}")
        ct = r.headers.get('Content-Type', '')
        print(f"  Content-Type: {ct}")
        
        if r.status_code == 200 and 'json' in ct:
            data = r.json()
            if data.get("features"):
                print(f"  SUCCESS! Got {len(data['features'])} features")
                # Save it
                with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
                    json.dump(data, f, indent=2, ensure_ascii=False)
                print(f"  Saved to {OUTPUT_FILE}")
                
                # Show feature properties
                for feat in data["features"][:5]:
                    props = feat.get("properties", {})
                    print(f"    Feature: {props}")
                break
            else:
                print(f"  Empty features: {r.text[:300]}")
        elif r.status_code == 200:
            print(f"  Body: {r.text[:300]}")
        else:
            print(f"  Error: {r.text[:200]}")
    except Exception as e:
        print(f"  Error: {str(e)[:100]}")
else:
    # If WFS didn't work, try Approach 2
    print("\n  WFS approaches exhausted. Trying WMS GetFeatureInfo grid...")

    # ─── Approach 2: WMS GetFeatureInfo with CQL_FILTER ──────────
    print(f"\n{'='*60}")
    print(f"  Approach 2: WMS GetFeatureInfo with CQL_FILTER")
    print(f"{'='*60}")

    # First, try with mandal name filter
    cql_filters = [
        "mandal_name LIKE '%Rajamahendravaram%'",
        "mandal_name LIKE '%RAJAMAHENDRAVARAM%'",
        "MANDAL LIKE '%Rajam%'",
        "mandal LIKE '%Rajam%'",
        "MANDAL_NAM LIKE '%Rajam%'",
        "mndl_nm LIKE '%Rajam%'",
    ]

    for cql in cql_filters:
        try:
            r = requests.get(f"{BASE}/wms", params={
                "service": "WMS",
                "version": "1.1.1",
                "request": "GetFeatureInfo",
                "layers": LAYER,
                "query_layers": LAYER,
                "info_format": "application/json",
                "width": 512,
                "height": 512,
                "srs": "EPSG:4326",
                "bbox": BBOX,
                "x": 256,
                "y": 256,
                "feature_count": 200,
                "CQL_FILTER": cql,
            }, verify=False, timeout=15)
            
            if r.status_code == 200 and 'json' in r.headers.get('Content-Type', ''):
                data = r.json()
                feats = data.get("features", [])
                if feats:
                    print(f"\n  CQL '{cql}' -> {len(feats)} features!")
                    for f in feats[:3]:
                        print(f"    {f.get('properties', {})}")
                    
                    # If we got good results, collect all
                    with open(OUTPUT_FILE, "w", encoding="utf-8") as fh:
                        json.dump(data, fh, indent=2, ensure_ascii=False)
                    print(f"  Saved to {OUTPUT_FILE}")
                    break
                else:
                    print(f"  CQL '{cql[:40]}' -> 0 features")
            else:
                print(f"  CQL '{cql[:40]}' -> {r.status_code}: {r.text[:150]}")
        except Exception as e:
            print(f"  CQL error: {str(e)[:100]}")
    else:
        # ─── Approach 3: Grid-based GetFeatureInfo ────────────────
        print(f"\n{'='*60}")
        print(f"  Approach 3: Grid sampling via GetFeatureInfo")
        print(f"{'='*60}")
        
        # Sample the Rajamahendravaram Rural area with a grid of points
        # and collect all unique village features
        all_features = {}
        min_lng, min_lat, max_lng, max_lat = 81.65, 16.90, 81.95, 17.10
        
        # Use a grid of 20x20 points
        grid_size = 20
        lng_step = (max_lng - min_lng) / grid_size
        lat_step = (max_lat - min_lat) / grid_size
        
        for i in range(grid_size):
            for j in range(grid_size):
                center_lng = min_lng + (i + 0.5) * lng_step
                center_lat = min_lat + (j + 0.5) * lat_step
                
                # Small bbox around the point
                half = 0.001
                bbox = f"{center_lng-half},{center_lat-half},{center_lng+half},{center_lat+half}"
                
                try:
                    r = requests.get(f"{BASE}/wms", params={
                        "service": "WMS",
                        "version": "1.1.1",
                        "request": "GetFeatureInfo",
                        "layers": LAYER,
                        "query_layers": LAYER,
                        "info_format": "application/json",
                        "width": 2,
                        "height": 2,
                        "srs": "EPSG:4326",
                        "bbox": bbox,
                        "x": 1,
                        "y": 1,
                        "feature_count": 5,
                    }, verify=False, timeout=10)
                    
                    if r.status_code == 200:
                        data = r.json()
                        for feat in data.get("features", []):
                            fid = feat.get("id", "")
                            if fid not in all_features:
                                all_features[fid] = feat
                                props = feat.get("properties", {})
                                print(f"  NEW [{len(all_features)}] {fid}: {props}")
                except:
                    pass
        
        print(f"\n  Total unique villages found: {len(all_features)}")
        
        if all_features:
            geojson = {
                "type": "FeatureCollection",
                "features": list(all_features.values())
            }
            with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
                json.dump(geojson, f, indent=2, ensure_ascii=False)
            print(f"  Saved to {OUTPUT_FILE}")
