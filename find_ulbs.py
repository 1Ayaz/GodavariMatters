# -*- coding: utf-8 -*-
import sys, io, json, requests
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')

r = requests.get('https://apcmms.ap.gov.in/apiv1/open/ulbs', verify=False, timeout=30)
resp = r.json()
data_str = resp.get("data", "")

if isinstance(data_str, str):
    data = json.loads(data_str)
else:
    data = data_str

# Find all ULBs in East Godavari district or with "rajam" in name
if isinstance(data, dict) and "data" in data:
    data = data["data"]

if isinstance(data, list):
    # Search for Rajamahendravaram entries
    matches = []
    for item in data:
        item_str = json.dumps(item, ensure_ascii=False).lower()
        if any(kw in item_str for kw in ['rajam', 'rajahmundry', 'rajamahendravaram', 'rjy', 'godavari']):
            matches.append(item)
    
    print(f"Total ULBs: {len(data)}")
    print(f"Matches for 'rajam/godavari': {len(matches)}")
    print()
    for m in matches:
        print(json.dumps(m, indent=2, ensure_ascii=False))
        print("---")
    
    if not matches:
        # Show first 3 items to understand structure
        print("First 3 items for structure reference:")
        for item in data[:3]:
            print(json.dumps(item, indent=2, ensure_ascii=False))
            print("---")
else:
    # dict - show keys and structure
    print("Data is dict with keys:", list(data.keys()) if isinstance(data, dict) else type(data))
    print(json.dumps(data, indent=2, ensure_ascii=False)[:3000])
