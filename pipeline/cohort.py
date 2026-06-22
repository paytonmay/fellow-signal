"""
Stage 4 — Cohort linkage.

Cohort year is not on the company detail pages, but Activate publishes a
per-year cohort announcement post that names the new ventures. We match each of
our companies against those posts to recover its cohort year — the field that
unlocks the time-series "emerging fields" view.

A company is assigned the EARLIEST cohort year whose announcement names it
(that is its entry cohort; later retrospectives may mention it again).

Input:  data/processed/03_enriched.json
Output: data/processed/04_with_cohort.json
"""
from __future__ import annotations

import json
import re
import time
from pathlib import Path

import requests
from bs4 import BeautifulSoup

ROOT = Path(__file__).resolve().parent.parent
IN = ROOT / "data" / "processed" / "03_enriched.json"
OUT = ROOT / "data" / "processed" / "04_with_cohort.json"
RAW = ROOT / "data" / "raw"
UA = {"User-Agent": "Mozilla/5.0 (compatible; FellowSignal/0.1; research)"}

# Per-year cohort announcement posts (a year may have several).
COHORT_POSTS: dict[int, list[str]] = {
    2018: ["news/cohort-2018-stories-of-impact"],
    2020: ["news/cohort-2020"],
    2021: ["news/welcome-cohort-2021", "news/activate-fellows-cohort-2021-finalists"],
    2022: ["news/meet-cohort-2022-activate-fellows"],
    2023: ["news/introducing-cohort-2023", "news/meet-cohort-2023"],
    2024: ["news/introducing-cohort-2024"],
    2025: ["news/activate-welcomes-47-new-fellows-to-cohort-2025",
           "meet-the-cohort-2025-activate-berkeley-fellows",
           "meet-the-cohort2025-activate-houston-fellows"],
}

# Hubs appear in the cohort posts; match by name to tag a venture's hub.
HUBS = ["Berkeley", "Boston", "Houston", "New York", "Anywhere"]


def fetch_text(slug: str) -> str:
    cache = RAW / f"news__{slug.replace('/', '__')}.html"
    if cache.exists():
        html = cache.read_text(encoding="utf-8")
    else:
        try:
            r = requests.get(f"https://activate.org/{slug}", headers=UA, timeout=20)
            html = r.text if r.status_code == 200 else ""
        except requests.RequestException:
            html = ""
        cache.write_text(html, encoding="utf-8")
        time.sleep(0.5)
    if not html:
        return ""
    return re.sub(r"\s+", " ", BeautifulSoup(html, "lxml").get_text(" ", strip=True))


def match_name(name: str, text: str) -> bool:
    """Does the company name (or a robust core of it) appear in the post text?"""
    text_l = text.lower()
    # Try the full name, then a stripped core (drop suffixes / parentheticals).
    core = re.sub(r"\(.*?\)", "", name)                       # drop "(fka ...)"
    core = re.sub(r"\b(inc|llc|ltd|co|technologies?|technology|labs?|systems?|"
                  r"materials|energy|solutions|health|bio)\b\.?", "", core, flags=re.I)
    core = re.sub(r"[^\w\s]", " ", core)
    core = re.sub(r"\s+", " ", core).strip()
    # Also try the first token alone (>=6 chars = distinctive), to catch posts
    # that list a shortened name ("Heliotrope" for "Heliotrope Photonics").
    first = core.split(" ")[0] if core else ""
    candidates = [name.lower(), core.lower()]
    if len(first) >= 6:
        candidates.append(first.lower())
    for cand in candidates:
        # Word-boundary match avoids false positives like core "eeli" hitting
        # "feeling". Require a reasonably distinctive core length.
        if len(cand) >= 4 and re.search(rf"\b{re.escape(cand)}\b", text_l):
            return True
    return False


def main() -> None:
    companies = json.loads(IN.read_text(encoding="utf-8"))

    # Build {year: text} and a combined text for hub detection.
    year_text = {y: " ".join(fetch_text(s) for s in slugs)
                 for y, slugs in COHORT_POSTS.items()}

    matched = 0
    for c in companies:
        years = sorted(y for y, t in year_text.items() if match_name(c["name"], t))
        c["cohort_year"] = years[0] if years else None
        # Hub: look in the matched year's text for a hub name near the company.
        hub = None
        if years:
            t = year_text[years[0]]
            idx = t.lower().find(c["name"].lower())
            window = t[max(0, idx - 200): idx + 200] if idx >= 0 else ""
            for h in HUBS:
                if h.lower() in window.lower():
                    hub = h
                    break
        c["hub"] = hub
        if c["cohort_year"]:
            matched += 1

    OUT.write_text(json.dumps(companies, indent=2, ensure_ascii=False), encoding="utf-8")
    from collections import Counter
    print(f"Wrote {len(companies)} -> {OUT.relative_to(ROOT)}")
    print(f"cohort_year matched: {matched}/{len(companies)}")
    print("by year:", dict(sorted(Counter(c['cohort_year'] for c in companies).items(),
                                  key=lambda x: (x[0] is None, x[0]))))
    print("hub tagged:", sum(1 for c in companies if c['hub']))


if __name__ == "__main__":
    main()
