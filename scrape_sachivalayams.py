"""
Scrape all 96 Rajahmundry Urban Sachivalayam staff details from sachivalayams.com
v4: Uses proven regex pattern: Name : PERSON</span> to extract staff names in order.
The 4 Name: matches (excluding Secretariat Name) map to WDS, WDP, WAS, WHS.
"""

import re
import json
import time
import urllib.request
import ssl

SACHIVALAYAM_SLUGS = [
    "battina-nagar", "narayana-puram-2", "venkata-ramayya-nagar",
    "addepalli-colony", "gopal-nagar-puntha", "subbarao-peta-2",
    "nehru-nagar-4", "rajendra-nagar-4", "kambala-peta",
    "gandhi-puram-01", "jampeta-01", "danavai-peta",
    "gorakshana-peta", "prakasam-nagar-01", "prakasam-nagar-02",
    "koka-baskaramma-nagar", "vidyuth-colony", "venkateswara-nagar",
    "burma-colony-2", "new-vl-puram", "gadalamma-nagar",
    "vl-puram-01", "all-bank-colony", "thota-ramulu-nagar",
    "vl-puram-02", "mallina-nagar", "gandhi-puram-02",
    "syamala-nagar", "tadithota", "brodipeta",
    "ambedkar-nagar-01", "knr-peta", "ambedkar-nagar-02",
    "kothapeta-12", "sigideela-peta", "innispeta-01",
    "innispeta-02", "innispeta-03", "veerabhadra-nagar",
    "adarsh-nagar-4", "ava-vambay-colony", "boggula-dibba",
    "sambhunagar", "swaraj-nagar", "alcot-gardens-01",
    "kondavari-vedhi", "alcot-gardens-02", "kesari-club-area",
    "mro-office-road-2", "t-nagar", "mangalavari-peta",
    "vankayalavari-street", "bestha-vedhi", "kvr-swamy-road",
    "janda-panja-road", "medara-peta", "annapurnamma-peta",
    "chanda-choultry-street", "seshayya-metta", "arya-puram",
    "lakshmi-varapupeta", "jampeta-02", "samba-siva-rao-peta",
    "ademma-dibba", "tummalava", "lingam-peta",
    "krishna-nagar-3", "mulagoyya", "bruhunnala-peta",
    "seethampeta-3", "lalitha-nagar-01", "hari-puram",
    "veerabadra-puram", "jaya-krishna-puram", "rv-nagar",
    "mallikarjuna-nagar", "pt-colony", "municipal-colony",
    "subhash-nagar", "lalitha-nagar-02", "kotilingala-peta",
    "sri-ram-nagar-4", "indira-nagar-17", "gadi-reddy-nagar",
    "ananda-nagar", "ramadas-peta", "siddartha-nagar",
    "indira-satya-nagar", "sarangadhara-metta", "sanjeevayya-nagar",
    "simhachal-nagar", "subba-rao-nagar-01", "subba-rao-nagar-02",
    "suvisesha-puram", "bhaskar-nagar", "seshayyametta",
]

BASE_URL = "https://sachivalayams.com/"
ROLE_KEYS = [
    "ward_welfare_secretary",    # WDS
    "ward_education_secretary",  # WDP
    "ward_admin_secretary",      # WAS
    "ward_health_secretary",     # WHS
]
ROLE_LABELS = [
    "Ward Welfare Development Secretary",
    "Ward Education Data Processing Secretary",
    "Ward Administrative Secretary",
    "Ward Health Secretary",
]


def fetch_page(slug):
    url = f"{BASE_URL}{slug}/"
    ctx = ssl.create_default_context()
    ctx.check_hostname = False
    ctx.verify_mode = ssl.CERT_NONE
    req = urllib.request.Request(url, headers={
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
    })
    try:
        with urllib.request.urlopen(req, context=ctx, timeout=15) as resp:
            return resp.read().decode('utf-8', errors='replace')
    except Exception as e:
        print(f"ERROR: {e}")
        return None


def strip_tags(s):
    return re.sub(r'<[^>]+>', '', s).strip()


def parse_html(html, slug):
    record = {
        "slug": slug,
        "source_url": f"{BASE_URL}{slug}/",
        "code": None,
        "name": None,
        "ward": None,
        "officials": {}
    }
    
    # Extract code from title
    code_match = re.search(r'Code\s*:\s*(\d+)', html)
    if code_match:
        record["code"] = code_match.group(1)
    
    # Extract secretariat name from the "Secretariat Name : XXX" heading
    sname = re.search(r'Secretariat\s+Name\s*:.*?>\s*([A-Z][A-Z0-9\s\-&;\.]+?)\s*<', html)
    if sname:
        name = sname.group(1).strip()
        name = name.replace('&amp;', '&')
        record["name"] = re.sub(r'\s+', ' ', name).strip()
    
    # Extract ward
    ward_match = re.search(r'(\d+\w*\s+WARD)', html)
    if ward_match:
        record["ward"] = ward_match.group(1).strip()
    
    # KEY PATTERN: Extract all "Name : PERSON_NAME" followed by </span>
    # This captures staff names in the exact order: WDS, WDP, WAS, WHS
    # Pattern handles mixed case names (some pages have mixed case)
    name_pattern = r'>\s*Name\s*:\s*([^<]+?)\s*<'
    all_names = re.findall(name_pattern, html)
    
    # Also extract "User : CODE" values
    user_pattern = r'>\s*User\s*:\s*([^<]+?)\s*<'
    all_users = re.findall(user_pattern, html)
    
    # Extract "Mobile : ******XXXX" values
    mobile_pattern = r'>\s*Mobile\s*:\s*([^<]+?)\s*<'
    all_mobiles = re.findall(mobile_pattern, html)
    
    # Map names to roles (4 names = 4 roles in order)
    for i, role_key in enumerate(ROLE_KEYS):
        official = {"role_label": ROLE_LABELS[i]}
        
        if i < len(all_names):
            official["name"] = re.sub(r'\s+', ' ', all_names[i]).strip()
        if i < len(all_users):
            official["user_code"] = all_users[i].strip()
        if i < len(all_mobiles):
            official["mobile"] = all_mobiles[i].strip()
        
        if official.get("name"):
            record["officials"][role_key] = official
    
    return record


def main():
    print(f"Scraping {len(SACHIVALAYAM_SLUGS)} Rajahmundry Urban Sachivalayams from sachivalayams.com")
    print("=" * 70)
    
    results = []
    failed = []
    
    for i, slug in enumerate(SACHIVALAYAM_SLUGS, 1):
        print(f"[{i:3d}/{len(SACHIVALAYAM_SLUGS)}] {slug}...", end=" ", flush=True)
        
        html = fetch_page(slug)
        if html is None:
            failed.append(slug)
            print("FAILED")
            continue
        
        record = parse_html(html, slug)
        
        whs = record["officials"].get("ward_health_secretary", {})
        wds = record["officials"].get("ward_welfare_secretary", {})
        whs_name = whs.get("name", "N/A")
        wds_name = wds.get("name", "N/A")
        
        # Quick sanity: WHS should differ from WDS
        marker = "OK" if whs_name != wds_name else "SAME!"
        print(f"Code:{record['code']} WDS:{wds_name[:20]} | WHS:{whs_name[:20]} {marker}")
        
        results.append(record)
        
        if i < len(SACHIVALAYAM_SLUGS):
            time.sleep(0.5)
    
    print("\n" + "=" * 70)
    print(f"SUCCESS: {len(results)}/{len(SACHIVALAYAM_SLUGS)}")
    if failed:
        print(f"FAILED: {len(failed)} - {failed}")
    
    whs_count = sum(1 for r in results if r["officials"].get("ward_health_secretary"))
    print(f"WHS names found: {whs_count}/{len(results)}")
    
    # Check uniqueness per record
    unique = sum(1 for r in results 
                 if len(set(v.get("name","") for v in r["officials"].values())) > 1)
    print(f"Records with distinct role names: {unique}/{len(results)}")
    
    output = {
        "metadata": {
            "district": "EAST GODAVARI",
            "mandal": "RAJAHMUNDRY (URBAN)",
            "total_sachivalayams": len(results),
            "scraped_from": "sachivalayams.com",
            "scraped_at": time.strftime("%Y-%m-%dT%H:%M:%S"),
            "note": "Ward Health Secretary (WHS) = primary sanitation/environment contact for GodavariMatters accountability tree"
        },
        "sachivalayams": results
    }
    
    with open("data/sachivalayam_officials.json", 'w', encoding='utf-8') as f:
        json.dump(output, f, indent=2, ensure_ascii=False)
    
    print(f"\nSaved to data/sachivalayam_officials.json")
    
    # Summary table
    print("\n" + "=" * 100)
    print(f"{'CODE':<10} {'SACHIVALAYAM':<24} {'WDS (Welfare)':<24} {'WHS (Health/Sanitation)':<28}")
    print("-" * 100)
    for r in results:
        code = r.get("code", "?")
        name = (r.get("name") or r["slug"])[:22]
        wds = r["officials"].get("ward_welfare_secretary", {}).get("name", "—")[:22]
        whs = r["officials"].get("ward_health_secretary", {}).get("name", "—")[:26]
        print(f"{code:<10} {name:<24} {wds:<24} {whs:<28}")


if __name__ == "__main__":
    main()
