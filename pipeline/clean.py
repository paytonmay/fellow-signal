"""
Stage 2 — Clean & canonicalize.

Takes the raw scraped records and produces the canonical company dataset:
genuine fellow ventures only, boilerplate stripped, fields normalized.

Input:  data/processed/01_raw_records.json
Output: data/processed/02_companies.json

We keep ONLY company pages. Activate's person/staff detail pages are
JS-rendered template shells (their og:title and bios are not in the static
HTML), so they are not reliably scrapable. Companies are the fellow ventures,
which is exactly the unit we want to map: topic -> industry -> impact.
"""
from __future__ import annotations

import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
IN = ROOT / "data" / "processed" / "01_raw_records.json"
OUT = ROOT / "data" / "processed" / "02_companies.json"

BOILERPLATE = [
    "We Spark the transformation of bold ideas into world-changing companies.",
    "We Spark the transformation of Lorem Ipsum Etc.",
]

SOCIAL = ("instagram.com", "youtube.com", "twitter.com", "x.com",
          "facebook.com", "linkedin.com")

# Non-company slugs: staff/people template shells + section/utility pages.
# These either render no real static content or are not fellow ventures.
JUNK_SLUGS = {
    "amy-fehir", "caitlin-cutter", "cyrus-wadia-ceo", "daniel-recht",
    "etosha-cave", "jeremy-pitts", "jill-fuss", "kevin-see", "naomi-baer",
    "sarah-morrill", "steven-tran",
    "events", "faq", "get-involved", "global-programs", "innovation-labs",
    "job-listing", "news", "oldhome", "partners", "prospect-growth",
    "pumpkin", "hit-nano-draft", "meet-the-cohort2025-activate-houston-fellows",
}


def strip_boilerplate(body: str) -> str:
    for b in BOILERPLATE:
        body = body.replace(b, "")
    return re.sub(r"\s+", " ", body).strip()


def company_website(links: list[str]) -> str:
    return next((l for l in links if not any(s in l for s in SOCIAL)), "")


def main() -> None:
    raw = json.loads(IN.read_text(encoding="utf-8"))
    companies = []
    for r in raw:
        if r["slug"] in JUNK_SLUGS:
            continue
        body = strip_boilerplate(r["body"])
        if not r["summary"] or len(body) < 200:
            continue
        companies.append({
            "slug": r["slug"],
            "name": r["name"].strip(),
            "url": r["url"],
            "website": company_website(r["external_links"]),
            "linkedin": r["linkedin"],
            "summary": r["summary"].strip(),
            "description": body,
            "contact_email": r["emails"][0] if r["emails"] else "",
        })

    companies.sort(key=lambda c: c["name"].lower())
    OUT.write_text(json.dumps(companies, indent=2, ensure_ascii=False), encoding="utf-8")
    print(f"Wrote {len(companies)} companies -> {OUT.relative_to(ROOT)}")
    print(f"  with website:  {sum(1 for c in companies if c['website'])}")
    print(f"  with linkedin: {sum(1 for c in companies if c['linkedin'])}")


if __name__ == "__main__":
    main()
