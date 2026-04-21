# -*- coding: utf-8 -*-
import sys
import io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
"""
Fetch Sachivalayam boundary polygon data from the CDMA GIS API,
decrypt it, and produce a GeoJSON FeatureCollection.
"""
import json
import hashlib
import requests
from Crypto.Cipher import AES
from Crypto.Util.Padding import unpad
import base64

# ─── Configuration ───────────────────────────────────────────────
ULB_ID = 74  # Rajahmundry (Rajamahendravaram)
API_URL = f"https://apcmms.ap.gov.in/apiv1/external/ulb/{ULB_ID}/fetch/sachivalayam/data"

# JWT key string from the CDMA site's JavaScript
JWT_KEY_STRING = (
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9."
    "eyJ0a25faWQiOjEsInVzcl9ubSI6IkRTQURNSU4iLCJybGUiOiJBRE1JTiIsImNsbnRfaXAiOiIxLjEuMS4xIiwiaWF0IjoxNzQ0MTA3ODgwLCJleHAiOjE3NTE4ODM4ODB9."
    "cGevwy602qkDJRyT0qXDDkT69xYZ4EAXiVYcdZJmXcs"
)

SACHIVALAYAMS_JSON = r"C:\Users\mdaya\Desktop\CivicSnap\data\sachivalayams.json"
OUTPUT_GEOJSON   = r"C:\Users\mdaya\Desktop\CivicSnap\data\rajahmundry_sachivalayams.geojson"
OUTPUT_RAW       = r"C:\Users\mdaya\Desktop\CivicSnap\data\raw_decrypted.json"


def derive_key(jwt_str: str) -> bytes:
    """Derive AES-256-CBC key by SHA-256 hashing the JWT string."""
    return hashlib.sha256(jwt_str.encode("utf-8")).digest()


def decrypt_aes_cbc(encrypted_data_b64: str, iv_b64: str, key: bytes) -> str:
    """Decrypt AES-256-CBC encrypted data. IV is base64 encoded."""
    iv = base64.b64decode(iv_b64)
    encrypted_data = base64.b64decode(encrypted_data_b64)
    cipher = AES.new(key, AES.MODE_CBC, iv)
    decrypted = unpad(cipher.decrypt(encrypted_data), AES.block_size)
    return decrypted.decode("utf-8")


def fetch_encrypted_data() -> dict:
    """Fetch the encrypted sachivalayam data from the API."""
    print(f"Fetching data from {API_URL} ...")
    resp = requests.get(API_URL, timeout=30, verify=False)
    resp.raise_for_status()
    return resp.json()


def load_sachivalayam_master() -> dict:
    """Load the sachivalayams.json master list and index by code."""
    with open(SACHIVALAYAMS_JSON, "r", encoding="utf-8") as f:
        items = json.load(f)
    # Index by code — API uses codes like "21064039", our file has "1064039"
    by_code = {}
    for item in items:
        by_code[item["code"]] = item
        by_code["2" + item["code"]] = item  # API prefixes with "2"
    return by_code


def parse_boundary_json(bndry_jsn_str: str) -> list:
    """
    Parse the bndry_jsn field which is a JSON string of [[lat,lng], ...]
    Convert to GeoJSON format: [[lng,lat], ...] and close the ring.
    """
    coords = json.loads(bndry_jsn_str)
    # Convert [lat, lng] → [lng, lat] for GeoJSON
    ring = [[pt[1], pt[0]] for pt in coords]
    # Close the ring if not already closed
    if ring and ring[0] != ring[-1]:
        ring.append(ring[0])
    return [ring]  # GeoJSON Polygon is an array of rings


def build_geojson(sachivalayam_data: list, master: dict) -> dict:
    """Convert decrypted sachivalayam data into a GeoJSON FeatureCollection."""
    features = []

    for item in sachivalayam_data:
        name = item.get("svm_nm", "")
        code = str(item.get("svm_apfs_cd", ""))
        lat = item.get("lat")
        lng = item.get("lng")

        # Enrich with master data
        master_item = master.get(code, {})

        properties = {
            "name": name,
            "code": code,
            "sno": master_item.get("sno"),
            "address": master_item.get("address", ""),
            "ulb": item.get("ulb_nm", ""),
            "lat": lat,
            "lng": lng,
        }

        # Parse boundary polygon
        bndry = item.get("bndry_jsn", "")
        coords = None
        if bndry and bndry.strip():
            try:
                coords = parse_boundary_json(bndry)
            except Exception as e:
                print(f"  [WARN] Failed to parse bndry_jsn for {name}: {e}")

        if coords:
            feature = {
                "type": "Feature",
                "properties": properties,
                "geometry": {
                    "type": "Polygon",
                    "coordinates": coords,
                },
            }
        else:
            # Fall back to point geometry from lat/lng
            print(f"  [WARN] No polygon for {name}, using point ({lat}, {lng})")
            feature = {
                "type": "Feature",
                "properties": properties,
                "geometry": {
                    "type": "Point",
                    "coordinates": [lng, lat],
                } if lat and lng else None,
            }

        features.append(feature)

    return {
        "type": "FeatureCollection",
        "features": features,
    }


def main():
    # 1. Fetch encrypted data
    encrypted = fetch_encrypted_data()
    print(f"Response keys: {list(encrypted.keys())}")

    # The API returns: {"status":200, "data": "<json-string>", ...}
    # where <json-string> is: {"data":{"iv":"...","encryptedData":"..."}}
    raw_data = encrypted.get("data", "")

    if isinstance(raw_data, str):
        print(f"Data is a string of length {len(raw_data)}, parsing inner JSON...")
        inner = json.loads(raw_data)
    else:
        inner = raw_data

    data_obj = inner
    if isinstance(inner, dict) and "data" in inner:
        data_obj = inner["data"]

    iv = data_obj.get("iv")
    encrypted_data = data_obj.get("encryptedData")

    if not iv or not encrypted_data:
        print("No iv/encryptedData found. Saving raw response...")
        with open(OUTPUT_RAW, "w", encoding="utf-8") as f:
            json.dump(encrypted, f, indent=2, ensure_ascii=False)
        return

    # 2. Derive key and decrypt
    key = derive_key(JWT_KEY_STRING)
    print(f"Decrypting with AES-256-CBC ...")
    decrypted_str = decrypt_aes_cbc(encrypted_data, iv, key)

    # 3. Parse decrypted JSON
    decrypted_data = json.loads(decrypted_str)

    with open(OUTPUT_RAW, "w", encoding="utf-8") as f:
        json.dump(decrypted_data, f, indent=2, ensure_ascii=False)
    print(f"Raw decrypted data saved to {OUTPUT_RAW}")

    # Determine sachivalayam list
    if isinstance(decrypted_data, list):
        sachivalayam_list = decrypted_data
    elif isinstance(decrypted_data, dict):
        sachivalayam_list = (
            decrypted_data.get("data") or
            decrypted_data.get("sachivalayams") or
            [decrypted_data]
        )
    else:
        print(f"Unexpected data type: {type(decrypted_data)}")
        return

    print(f"Found {len(sachivalayam_list)} sachivalayam entries")
    if sachivalayam_list:
        print(f"First entry keys: {list(sachivalayam_list[0].keys())}")

    # 4. Load master list
    master = load_sachivalayam_master()
    print(f"Master list loaded: {len(master)//2} sachivalayams")

    # 5. Build GeoJSON
    geojson = build_geojson(sachivalayam_list, master)
    poly_count = sum(1 for f in geojson["features"] if f["geometry"] and f["geometry"]["type"] == "Polygon")
    print(f"\nGeoJSON: {len(geojson['features'])} features ({poly_count} polygons)")

    # 6. Save
    with open(OUTPUT_GEOJSON, "w", encoding="utf-8") as f:
        json.dump(geojson, f, indent=2, ensure_ascii=False)
    print(f"GeoJSON saved to {OUTPUT_GEOJSON}")


if __name__ == "__main__":
    main()
