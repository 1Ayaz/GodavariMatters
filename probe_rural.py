# -*- coding: utf-8 -*-
"""
Probe Gram Manchitra and Bharatmaps GeoServer/WFS endpoints 
to extract rural village boundary polygon data for Rajamahendravaram Rural.
"""
import sys, io, json, requests
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')

requests.packages.urllib3.disable_warnings()

# Known codes from Gram Manchitra
STATE_CODE = 28      # Andhra Pradesh
DISTRICT_CODE = 745  # East Godavari
BLOCK_CODE_1 = 4903  # Rajahmundry Rural (older code)
BLOCK_CODE_2 = 5255  # Rajahmundry Rural (newer code)

# ─── Gram Manchitra APIs ─────────────────────────────────────────
GM_ENDPOINTS = [
    # Property cards API (seen in console logs)
    f"https://punjabmaps.nic.in/WebApiDFStest/api/property_cards?stcode={STATE_CODE}&dtcode={DISTRICT_CODE}&blkcode={BLOCK_CODE_1}",
    f"https://punjabmaps.nic.in/WebApiDFStest/api/property_cards?stcode={STATE_CODE}&dtcode={DISTRICT_CODE}&blkcode={BLOCK_CODE_2}",
    
    # Common Gram Manchitra API patterns
    f"https://grammanchitra.gov.in/gm4MVC/GramManchitra/getBlockGPList?stateCode={STATE_CODE}&distCode={DISTRICT_CODE}&blockCode={BLOCK_CODE_2}",
    f"https://grammanchitra.gov.in/gm4MVC/GramManchitra/getGPVillageList?stateCode={STATE_CODE}&distCode={DISTRICT_CODE}&blockCode={BLOCK_CODE_2}",
    f"https://grammanchitra.gov.in/gm4MVC/api/getBlockGPList?stateCode={STATE_CODE}&distCode={DISTRICT_CODE}&blockCode={BLOCK_CODE_2}",
    
    # Bharatmaps GeoServer WFS for village boundaries
    "https://bharatmaps.gov.in/geoserver/wfs?service=WFS&version=1.0.0&request=GetCapabilities",
    "https://mapservice.gov.in/geoserver/wfs?service=WFS&version=1.0.0&request=GetCapabilities",
]

# ─── ERDAS MapServer (from the discovered endpoint) ──────────────
ERDAS_ENDPOINTS = [
    # The actual MapServer found
    "https://northzonedrone.nic.in/erdas-iws/esri/rest/services/Andhra_Pradesh_DPwise_EAST_GODAVARI/MapServer?f=json",
    "https://northzonedrone.nic.in/erdas-iws/esri/rest/services/Andhra_Pradesh_DPwise_EAST_GODAVARI/MapServer/layers?f=json",
    "https://northzonedrone.nic.in/erdas-iws/esri/rest/services?f=json",
]

# ─── Bhuvan Panchayat ────────────────────────────────────────────
BHUVAN_ENDPOINTS = [
    # Common Bhuvan WMS/WFS patterns
    "https://bhuvanpanchayat.nrsc.gov.in/geoserver/wfs?service=WFS&version=1.0.0&request=GetCapabilities",
    "https://bhuvanpanchayat.nrsc.gov.in/geoserver/wms?service=WMS&request=GetCapabilities",
    f"https://bhuvanpanchayat.nrsc.gov.in/api/village/boundary?state={STATE_CODE}&district={DISTRICT_CODE}&block={BLOCK_CODE_2}",
]

# ─── APSAC GeoServer ─────────────────────────────────────────────
APSAC_ENDPOINTS = [
    "https://apsac.ap.gov.in/geoserver/wfs?service=WFS&version=1.0.0&request=GetCapabilities",
    "https://apsac.ap.gov.in/geoserver/wms?service=WMS&request=GetCapabilities",
    "https://apsac.ap.gov.in/dashboard-staging/ap-geoportal/",
]

all_groups = [
    ("Gram Manchitra", GM_ENDPOINTS),
    ("ERDAS MapServer", ERDAS_ENDPOINTS),
    ("Bhuvan Panchayat", BHUVAN_ENDPOINTS),
    ("APSAC", APSAC_ENDPOINTS),
]

for group_name, endpoints in all_groups:
    print(f"\n{'='*60}")
    print(f"  {group_name}")
    print(f"{'='*60}")
    
    for url in endpoints:
        try:
            r = requests.get(url, verify=False, timeout=15, 
                           headers={"User-Agent": "Mozilla/5.0", "Accept": "application/json, */*"})
            body = r.text[:500]
            content_type = r.headers.get("Content-Type", "unknown")
            print(f"\n  [{r.status_code}] {url[:100]}...")
            print(f"       Content-Type: {content_type}")
            print(f"       Body preview: {body[:300]}")
        except requests.exceptions.Timeout:
            print(f"\n  [TIMEOUT] {url[:100]}...")
        except Exception as e:
            print(f"\n  [ERROR] {url[:80]}... -> {str(e)[:100]}")
