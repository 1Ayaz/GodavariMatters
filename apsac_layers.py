# -*- coding: utf-8 -*-
"""
Extract village boundary data from APSAC GeoServer WFS for Rajamahendravaram Rural mandal.
"""
import sys, io, json, requests, xml.etree.ElementTree as ET
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
requests.packages.urllib3.disable_warnings()

APSAC_WMS = "https://apsac.ap.gov.in/geoserver/wms"
APSAC_WFS = "https://apsac.ap.gov.in/geoserver/wfs"

# Step 1: Get WMS Capabilities and find village boundary layer names
print("="*60)
print("  Step 1: Listing all APSAC WMS layers")
print("="*60)

r = requests.get(APSAC_WMS, params={
    "service": "WMS",
    "request": "GetCapabilities",
}, verify=False, timeout=30)

# Save full capabilities for reference
with open("data/apsac_wms_capabilities.xml", "w", encoding="utf-8") as f:
    f.write(r.text)

# Parse and find village/boundary/sachivalayam layers
root = ET.fromstring(r.text)
ns = {"wms": "http://www.opengis.net/wms"}

layers = []
for layer in root.iter("{http://www.opengis.net/wms}Layer"):
    name_el = layer.find("{http://www.opengis.net/wms}Name")
    title_el = layer.find("{http://www.opengis.net/wms}Title")
    if name_el is not None:
        name = name_el.text or ""
        title = title_el.text if title_el is not None else ""
        layers.append((name, title))

# Filter for relevant layers
keywords = ['village', 'mandal', 'boundary', 'sachivalayam', 'panchayat', 
            'admin', 'bnd', 'gp_', 'gram', 'rural', 'ward', 'district',
            'godavari', 'rajam']

print(f"\nTotal layers found: {len(layers)}")
print(f"\nRelevant layers (matching keywords):")
relevant = []
for name, title in layers:
    combined = (name + " " + title).lower()
    if any(kw in combined for kw in keywords):
        print(f"  Layer: {name}")
        print(f"  Title: {title}")
        print()
        relevant.append(name)

# Also print all layers for reference
print(f"\n{'='*60}")
print(f"  ALL layer names ({len(layers)} total)")
print(f"{'='*60}")
for name, title in layers:
    print(f"  {name} -- {title}")

# Step 2: Try WFS GetCapabilities
print(f"\n{'='*60}")
print(f"  Step 2: WFS GetCapabilities")
print(f"{'='*60}")

r2 = requests.get(APSAC_WFS, params={
    "service": "WFS",
    "version": "2.0.0",
    "request": "GetCapabilities",
}, verify=False, timeout=30)

print(f"WFS Status: {r2.status_code}")
print(f"WFS Content-Type: {r2.headers.get('Content-Type')}")
print(f"WFS Body[:500]: {r2.text[:500]}")

with open("data/apsac_wfs_capabilities.xml", "w", encoding="utf-8") as f:
    f.write(r2.text)
