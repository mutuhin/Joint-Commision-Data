import asyncio
from playwright.async_api import async_playwright
import csv

START_URL = "https://www.jointcommission.org/en-us/about-us/recognizing-excellence/find-accredited-organizations?rfkid_7:content_limit=100&rfkid_7:content_filters=acc_org_services_filter:eq:Hospice+Care;acc_org_services_filter:eq:Home+Health,+Non-Hospice+Services;acc_org_services_filter:eq:Home+Health+Aides"
OUTPUT_FILE = "hco_ids_clean.csv"

async def scrape():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=False)
        page = await browser.new_page()

        await page.goto(START_URL, timeout=120000, wait_until="domcontentloaded")

        results = []
        all_hco_ids = set()
        page_number = 1

        while True:
            # Wait for HCO ID elements
            await page.wait_for_selector("span:has-text('HCO ID')", timeout=60000)

            ids = await page.query_selector_all("span:has-text('HCO ID')")
            new_ids = 0

            for item in ids:
                text = await item.inner_text()
                hco_id = "".join([c for c in text if c.isdigit()])
                if not hco_id or hco_id in all_hco_ids:
                    continue

                final_url = f"https://www.jointcommission.org/en-us/about-us/recognizing-excellence/find-accredited-organizations/{hco_id}"
                results.append([hco_id, final_url])
                all_hco_ids.add(hco_id)
                new_ids += 1

            print(f"✅ Page {page_number}: Collected {new_ids} new HCO IDs (Total so far: {len(all_hco_ids)})")

            # If no new IDs, we are at last page or repeating — stop
            if new_ids == 0:
                print("⚠ No new HCO IDs found. Reached last page. Stopping.")
                break

            # PAGINATION: click next if available
            next_li = await page.query_selector("a[aria-label='Go to next page']")
            if next_li:
                # JS click to bypass any overlay
                try:
                    await page.evaluate("(el) => el.click()", next_li)
                except:
                    await next_li.click(force=True)
            else:
                print("✅ No Next button found. Ending.")
                break

            page_number += 1
            await page.wait_for_load_state("domcontentloaded")
            await page.wait_for_timeout(1500)

        # Save CSV
        with open(OUTPUT_FILE, "w", newline="", encoding="utf-8") as f:
            writer = csv.writer(f)
            writer.writerow(["HCO_ID", "Detail_URL"])
            writer.writerows(results)

        print(f"\n🎯 TOTAL IDs COLLECTED: {len(all_hco_ids)}")
        print(f"✅ Saved to: {OUTPUT_FILE}")

        await browser.close()


if __name__ == "__main__":
    asyncio.run(scrape())
