"""
Stage 2 (authoritative) — Build the canonical company dataset.

Parses the harvested Airtable records into clean company objects. The Airtable
"Link" field holds EITHER the activate.org profile OR the company's own website
(per row); both are captured. LinkedIn and any remaining websites are merged in
from the page scraper.

Input:  data/processed/00_airtable_raw.json   (224 harvested records)
        data/processed/02_companies.json       (scraped; for website/linkedin)
Output: data/processed/companies.json          (canonical spine)
        data/processed/taxonomy.json           (verticals, hubs, years)
"""
from __future__ import annotations

import json
import re
from collections import Counter
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
RAW = ROOT / "data" / "processed" / "00_airtable_raw.json"
SCRAPED = ROOT / "data" / "processed" / "02_companies.json"
OUT = ROOT / "data" / "processed" / "companies.json"
TAX = ROOT / "data" / "processed" / "taxonomy.json"


def split_list(v) -> list[str]:
    if not v:
        return []
    if isinstance(v, list):
        return [str(x).strip() for x in v if str(x).strip()]
    return [p.strip() for p in str(v).split(",") if p.strip()]


def split_people(v) -> list[str]:
    """Split a co-founder string on comma, '&', ' and ', '/'."""
    if not v:
        return []
    parts = re.split(r"\s*(?:,|&|/|\band\b)\s*", str(v))
    return [p.strip() for p in parts if p.strip()]


def parse_link(v) -> tuple[str, str, str]:
    """'[Name](url)' -> (slug, activate_url, website).

    The "Link" field holds EITHER the activate.org profile OR the company's own
    website, depending on the row. Classify by host so external company sites are
    captured rather than discarded."""
    m = re.search(r"\((https?://[^)]+)\)", str(v or ""))
    if not m:
        return "", "", ""
    url = m.group(1).strip()
    am = re.search(r"activate\.org/([^)/?#]+)", url)
    if am:
        return am.group(1).strip("/"), url, ""
    return "", "", url  # external = company website


def clean_text(v) -> str:
    return re.sub(r"\s+", " ", str(v or "")).strip()


def main() -> None:
    raw = json.loads(RAW.read_text(encoding="utf-8"))
    scraped = {c["slug"]: c for c in json.loads(SCRAPED.read_text(encoding="utf-8"))}

    companies = []
    for r in raw:
        f = r["fields"]
        name = clean_text(f.get("Name"))
        if not name:
            continue
        slug, activate_url, link_website = parse_link(f.get("Link"))
        s = scraped.get(slug, {})
        if not slug:  # website-link rows have no activate slug; keep slugs unique
            slug = re.sub(r"[^a-z0-9]+", "-", name.lower()).strip("-")
        try:
            year = int(str(f.get("Cohort Year")).strip()[:4])
        except (ValueError, TypeError):
            year = None
        # Verticals can arrive as one comma-joined string; split into a real list.
        verticals = split_list(f.get("Verticals"))
        companies.append({
            "id": r["id"],
            "slug": slug,
            "name": name,
            "tagline": clean_text(f.get("Tagline")),
            "one_liner": clean_text(f.get("One-Liner")),
            "elevator_pitch": clean_text(f.get("Elevator Pitch")),
            "critical_need": clean_text(f.get("Critical Need")),
            "technology_vision": clean_text(f.get("Technology Vision")),
            "potential_impact": clean_text(f.get("Potential Impact")),
            "cohort_year": year,
            "hub": clean_text(f.get("Community")),
            "verticals": verticals,
            "fellows": split_people(f.get("Fellow(s) at Company") or f.get("Fellow(s)")),
            "activate_url": activate_url,
            "website": link_website or s.get("website", ""),
            "linkedin": s.get("linkedin", ""),
        })

    companies.sort(key=lambda c: (-(c["cohort_year"] or 0), c["name"].lower()))
    OUT.write_text(json.dumps(companies, indent=2, ensure_ascii=False), encoding="utf-8")

    # Taxonomy / facets for the frontend filters.
    verticals = Counter(v for c in companies for v in c["verticals"])
    hubs = Counter(c["hub"] for c in companies if c["hub"])
    years = Counter(c["cohort_year"] for c in companies if c["cohort_year"])
    TAX.write_text(json.dumps({
        "verticals": verticals.most_common(),
        "hubs": hubs.most_common(),
        "years": dict(sorted(years.items())),
        "total": len(companies),
    }, indent=2, ensure_ascii=False), encoding="utf-8")

    print(f"Wrote {len(companies)} companies -> {OUT.relative_to(ROOT)}")
    print(f"  with website:  {sum(1 for c in companies if c['website'])}")
    print(f"  with impact text: {sum(1 for c in companies if c['potential_impact'])}")
    print(f"\n{len(verticals)} verticals (Activate taxonomy):")
    for v, n in verticals.most_common():
        print(f"  {n:>3}  {v}")
    print("\nhubs:", dict(hubs.most_common()))


if __name__ == "__main__":
    main()
