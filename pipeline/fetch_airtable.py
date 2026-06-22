"""
Stage 1 (authoritative) — Ingest Activate's own companies directory.

Activate's public companies directory (activate.org/activate-companies) is a
Softr app backed by an Airtable base. Softr exposes a same-origin proxy that
returns the records as JSON. This is the AUTHORITATIVE source: all ~200
companies back to cohort 2015, with Activate's own fields — Verticals,
Community (hub), Cohort Year, Fellow(s), and crucially the human-written
Critical Need / Technology Vision / Potential Impact narrative fields.

This supersedes the per-page scraper (scrape.py), which only saw the recent
portfolio. We keep scrape.py for the company website/LinkedIn links it
recovers, but the Airtable pull is the spine.

Output: data/processed/00_airtable_raw.json  (raw records, verbatim)
"""
from __future__ import annotations

import json
import time
from pathlib import Path

import requests

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "data" / "processed" / "00_airtable_raw.json"

# Softr data proxy for the activate-companies app (discovered via the app's
# own network traffic). Path segments: app / page / block / datasource ids.
BASE = ("https://activate-companies.softr.app/v1/datasource/airtable/"
        "9d6fd2d1-1adf-446d-9975-f898c901a265/"
        "25043607-9327-438f-b39b-a49f6429caef/"
        "c2c31f2a-fb47-42f0-81e6-0cd350f19752/"
        "cf64989f-4ffe-4d3c-bb76-9603a0309245")
HEADERS = {
    "Referer": "https://activate-companies.softr.app/",
    "Origin": "https://activate-companies.softr.app",
    "Content-Type": "application/json",
    "User-Agent": "Mozilla/5.0 (compatible; FellowSignal/0.1; research)",
}


def fetch_all() -> list[dict]:
    records, offset, page = [], None, 0
    while True:
        body = {"offset": offset} if offset else {}
        r = requests.post(f"{BASE}/data", headers=HEADERS, json=body, timeout=30)
        r.raise_for_status()
        data = r.json()
        batch = data.get("records", [])
        records.extend(batch)
        page += 1
        print(f"  page {page}: +{len(batch)} (total {len(records)})")
        offset = data.get("offset")
        if not offset or not batch:
            break
        time.sleep(0.4)
    return records


def main() -> None:
    print("Fetching Activate companies from Softr/Airtable proxy...")
    records = fetch_all()
    OUT.write_text(json.dumps(records, indent=2, ensure_ascii=False), encoding="utf-8")
    print(f"\nWrote {len(records)} records -> {OUT.relative_to(ROOT)}")

    # Quick shape report.
    from collections import Counter
    years = Counter(r["fields"].get("Cohort Year") for r in records)
    print("by cohort year:", dict(sorted(years.items(), key=lambda x: (x[0] is None, x[0]))))
    field_fill = Counter()
    for r in records:
        for k, v in r["fields"].items():
            if v not in (None, "", [], {}):
                field_fill[k] += 1
    print("\nfield coverage (of {} records):".format(len(records)))
    for k, n in field_fill.most_common():
        print(f"  {n:>3}  {k}")


if __name__ == "__main__":
    main()
