import asyncio
from playwright.async_api import async_playwright
import csv
import re
import pandas as pd

INPUT_FILE = "hco_urls_clean.csv"          
OUTPUT_FILE = "hco_details_urls.csv" 
async def wait_for_element(page, selector, retries=5, delay=1):
    """Wait for an element to appear with retries."""
    for _ in range(retries):
        elem = await page.query_selector(selector)
        if elem:
            return elem
        await asyncio.sleep(delay)
    return None

async def scrape_hco_details():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=False)
        page = await browser.new_page()
        results = []

        # ---- Read URLs ----
        urls = []
        with open(INPUT_FILE, newline="", encoding="utf-8") as f:
            reader = csv.DictReader(f)
            for row in reader:
                if "URL" in row and row["URL"].strip():
                    urls.append(row["URL"].strip())

        print(f"➡ Total URLs to scrape: {len(urls)}")

        for idx, url in enumerate(urls, start=1):
            print(f"\n🌐 [{idx}] Loading {url}")

            try:
                await page.goto(url, timeout=120000, wait_until="networkidle")
                await page.evaluate("window.scrollTo(0, document.body.scrollHeight)")
                await asyncio.sleep(1.5)
            except Exception as e:
                print(f"⚠ Failed to load {url}: {e}")
                continue

            # --- Company Name ---
            try:
                company_name_elem = await wait_for_element(page, "h3[class*='font-bold']", retries=5)
                company_name = (await company_name_elem.inner_text()).strip() if company_name_elem else ""
            except:
                company_name = ""

            # --- Main Address ---
            try:
                street = city = state = zip_code = ""
                addr_elem = await wait_for_element(page, "div.w-full.text-fontNeutralThree header address", retries=5)
                if not addr_elem:
                    addr_elem = await wait_for_element(page, "address.mt-1.5.text-sm.not-italic", retries=3)

                if addr_elem:
                    addr_html = await addr_elem.inner_html()
                    addr_text = re.sub(r"<br\s*/?>", "\n", addr_html)
                    addr_text = re.sub(r"<.*?>", "", addr_text).strip()
                    parts = [p.strip() for p in addr_text.split("\n") if p.strip()]

                    if len(parts) == 2:
                        street = parts[0]
                        city_state_zip = parts[1]
                        match = re.match(r"^([^,]+),\s*([A-Za-z\s]+)\s+([\d\-]+)$", city_state_zip)
                        if match:
                            city = match.group(1).strip()
                            state = match.group(2).strip()
                            zip_code = match.group(3).strip()
                    elif len(parts) == 3:
                        street = parts[0]
                        city = parts[1]
                        match = re.match(r"^([A-Za-z\s]+)\s+([\d\-]+)$", parts[2])
                        if match:
                            state = match.group(1).strip()
                            zip_code = match.group(2).strip()
                    elif len(parts) == 1:
                        match = re.match(r"^(.+?),\s*([^,]+),\s*([A-Za-z\s]+)\s+([\d\-]+)$", parts[0])
                        if match:
                            street = match.group(1).strip()
                            city = match.group(2).strip()
                            state = match.group(3).strip()
                            zip_code = match.group(4).strip()
            except Exception as e:
                print(f"⚠ Error extracting address: {e}")
                street = city = state = zip_code = ""

            # --- Effective Date ---
            try:
                acc_date = ""
                effective_block = await wait_for_element(
                    page,
                    '//span[normalize-space(text())="Effective Date"]/ancestor::div[contains(@class, "md:col-span-1")]',
                    retries=5
                )
                if effective_block:
                    date_divs = await effective_block.query_selector_all('div.py-1\\.5')
                    dates = [(await d.inner_text()).strip() for d in date_divs]
                    acc_date = "; ".join(dates)
            except Exception as e:
                print(f"⚠ Error extracting Effective Date: {e}")
                acc_date = ""

            # --- Accredited Programs ---
            try:
                programs = ""
                programs_block = await wait_for_element(
                    page,
                    '//span[normalize-space(text())="Accredited Programs"]/ancestor::div[contains(@class, "md:col-span-2")]',
                    retries=5
                )
                if programs_block:
                    program_divs = await programs_block.query_selector_all('div.py-1\\.5')
                    program_texts = [(await p.inner_text()).strip() for p in program_divs]
                    programs = "; ".join(program_texts)
            except Exception as e:
                print(f"⚠ Error extracting Accredited Programs: {e}")
                programs = ""

            # --- Sites & Services ---
            sites = []
            services_set = set()
            try:
                await page.wait_for_selector("div.gap-30.border-b-2 address", timeout=5000)
                rows = await page.query_selector_all("div.gap-30.border-b-2")

                for row in rows:
                    addr_elem = await row.query_selector("address")
                    addr_text = (await addr_elem.inner_text()).strip() if addr_elem else ""
                    site_text = " | ".join([line.strip() for line in addr_text.split("\n") if line.strip()])
                    sites.append(site_text)

                    service_lis = await row.query_selector_all("p:has-text('Available Services') + ul li")
                    for li in service_lis:
                        service = (await li.inner_text()).strip()
                        if service:
                            services_set.add(service)
            except Exception as e:
                print(f"⚠ Error extracting Sites: {e}")

            site_columns = {f"Site_{i+1}": site for i, site in enumerate(sites)}
            services_text = "; ".join(sorted(services_set))

            results.append({
                "Company Name": company_name,
                "Street Address": street,
                "City": city,
                "State": state,
                "Zip": zip_code,
                "Accreditation Date": acc_date,
                "Program": programs,
                "Available Services": services_text,
                **site_columns,
                "Detail URL": url
            })

            print(f"✅ [{idx}/{len(urls)}] Collected: {company_name}")

        df = pd.DataFrame(results)
        df.to_csv(OUTPUT_FILE, index=False, encoding="utf-8")
        print(f"\n🎯 Completed scraping {len(results)} URLs. Saved to {OUTPUT_FILE}")

        await browser.close()

if __name__ == "__main__":
    asyncio.run(scrape_hco_details())
