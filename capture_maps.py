# -*- coding: utf-8 -*-
import sys
import io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
"""
Auto-screenshot all 95 sachivalayams from the CDMA GIS map.
Runs headlessly and saves all screenshots to sachivalayam_maps/
"""
import asyncio
import os
from pathlib import Path

OUTPUT_DIR = Path(r"C:\Users\mdaya\Desktop\CivicSnap\sachivalayam_maps")
OUTPUT_DIR.mkdir(exist_ok=True)

SACHIVALAYAMS = [
    "VEERABHADRANAGAR","ALLBANKCOLONY","INDIRASATYANAGAR","GANDHIPURAM-02","MUNICIPALCOLONY",
    "RAMADASPETA","VIDYUTHCOLONY","P&TCOLONY","ANNAPURNAMMAPETA","INNISPETA-02",
    "JANDAPANJAROAD","HARIPURAM","ALCOTGARDENS-01","SUBHASHNAGAR","GORAKSHANAPETA",
    "ALCOTGARDENS-02","INNISPETA-03","VEERABADRAPURAM","JAYAKRISHNAPURAM","NEWVLPURAM",
    "GOPALNAGARPUNTHA","SESHAYYAMETTA","DANAVAIPETA","PRAKASAMNAGAR-02","JAMPETA-02",
    "BESTHAVEDHI","KVRSWAMYROAD","ADEMMADIBBA","MALLINANAGAR","SYAMALANAGAR",
    "LAKSHMIVARAPUPETA","SIDDARTHANAGAR","SAMBASIVARAOPETA","KOKABASKARAMMANAGAR","SWARAJNAGAR",
    "BATTINANAGAR","THOTARAMULUNAGAR","MROOFFICEROAD","SIGIDEELAPETA","NARAYANAPURAM",
    "CHANDACHOULTRYSTREET","SEETHAMPETA","GANDHIPURAM-01","VENKATARAMAYYANAGAR","VANKAYALAVARISTREET",
    "MEDARAPETA","JAMPETA-01","BHASKARNAGAR","SARANGADHARAMETTA","TADITHOTA",
    "SIMHACHALNAGAR","TUMMALAVA","BURMACOLONY","SUVISESHAPURAM","AMBEDKARNAGAR-02",
    "SUBBARAONAGAR-02","GADALAMMANAGAR","BRODIPETA","VLPURAM-02","KOTILINGALAPETA",
    "AMBEDKARNAGAR-01","RVNAGAR","LALITHANAGAR-02","PRAKASAMNAGAR-01","KAMBALAPETA",
    "INDIRANAGAR","VENKATESWARANAGAR","MALLIKARJUNANAGAR","RAJENDRANAGAR","BOGGULADIBBA",
    "INNISPETA-01","NEHRUNAGAR","KOTHAPETA","SESHAYYAMETTA-02","KRISHNANAGAR",
    "SAMBHUNAGAR","KONDAVARIVEDHI","SANJEEVAYYANAGAR","MANGALAVARIPETA","GADIREDDYNAGAR",
    "TNAGAR","MULAGOYYA","SUBBARAONAGAR-01","LALITHANAGAR-01","AVAVAMBAYCOLONY",
    "ARYAPURAM","VLPURAM-01","BRUHUNNALAPETA","ADARSHNAGAR","LINGAMPETA",
    "SRIRAMNAGAR","KESARICLUBAREA","KNRPETA","ADDEPALLICOLONY","ANANDANAGAR","SUBBARAOPETA"
]

URL = "https://rajahmundry.cdma.ap.gov.in/ulbprofile/rajahmundry/gis-map"

async def capture_all():
    from playwright.async_api import async_playwright

    async with async_playwright() as p:
        browser = await p.chromium.launch(
            headless=False,  # visible so you can see progress
            args=["--ignore-certificate-errors", "--disable-web-security"]
        )
        context = await browser.new_context(
            ignore_https_errors=True,
            viewport={"width": 1400, "height": 800}
        )
        page = await context.new_page()

        print(f"Loading GIS map...")
        await page.goto(URL, wait_until="networkidle", timeout=30000)
        await page.wait_for_timeout(4000)

        # Make sure Satellite is selected
        try:
            sat_radio = page.locator('input[type="radio"][value="satellite"], label:has-text("Satellite")')
            if await sat_radio.count() > 0:
                await sat_radio.first.click()
                await page.wait_for_timeout(1000)
        except:
            pass

        search_box = page.locator('input[placeholder*="Search"], input[type="search"], .search-input, input.form-control').first

        done = 0
        skipped = []

        for name in SACHIVALAYAMS:
            out_path = OUTPUT_DIR / f"{name}.png"
            if out_path.exists():
                print(f"  [SKIP] {name} already exists")
                done += 1
                continue

            try:
                print(f"  [{done+1}/{len(SACHIVALAYAMS)}] {name}...")

                # Clear and type in search box
                await search_box.click()
                await search_box.fill("")
                await page.wait_for_timeout(300)
                await search_box.type(name, delay=30)
                await page.wait_for_timeout(800)

                # Click the first result in the list
                result = page.locator(f'text="{name}"').first
                if await result.count() == 0:
                    # Try partial match
                    result = page.locator(f'.sachivalayam-item, li, .list-item').filter(has_text=name).first
                
                if await result.count() > 0:
                    await result.click()
                    await page.wait_for_timeout(2500)  # wait for map to zoom
                    await page.screenshot(path=str(out_path), full_page=False)
                    print(f"       [OK] saved {name}.png")
                    done += 1
                else:
                    print(f"       [MISS] not found in list: {name}")
                    skipped.append(name)

            except Exception as e:
                print(f"       [ERR] error on {name}: {e}")
                skipped.append(name)

        await browser.close()

        print(f"\n{'='*50}")
        print(f"Done: {done} screenshots saved to {OUTPUT_DIR}")
        if skipped:
            print(f"Skipped ({len(skipped)}): {', '.join(skipped)}")

if __name__ == "__main__":
    asyncio.run(capture_all())
