"""
Stage 1 — Ingest.

Enumerate Activate's public sitemap, identify candidate fellow/company detail
pages, fetch each, and extract the raw structured fields the page exposes
(title, summary, body text, external links, contact email).

Output: data/processed/01_raw_records.json  — one record per detail page.

This stage is intentionally deterministic and dumb. It does NOT classify
domains, industries, or page type beyond a cheap heuristic — that is the job of
the enrichment stage, which can use an LLM. Keeping ingest deterministic means
we can re-run it cheaply and diff the raw dataset over time.
"""
from __future__ import annotations

import json
import re
import time
import sys
from pathlib import Path
from urllib.parse import urlparse

import requests
from bs4 import BeautifulSoup

ROOT = Path(__file__).resolve().parent.parent
RAW_DIR = ROOT / "data" / "raw"
OUT_DIR = ROOT / "data" / "processed"
SITEMAP_URL = "https://activate.org/sitemap.xml"
UA = "Mozilla/5.0 (compatible; ActivateFrontierMap/0.1; research project)"

# Top-level slugs that are clearly NOT fellow/company detail pages.
NON_DETAIL_SLUGS = {
    "about-us", "apply", "the-fellowship", "team", "nominate", "codeofconduct",
    "activate-fellows", "activate-companies", "activate-partner-programs",
    "supporting-scientists", "tools-for-scientists", "technical-reviewer-reg",
    "external-reviewer-submission-confirmation", "sipa", "sf-climate-week-2026",
    "techonomics", "meet-the-cohort-2025-activate-berkeley-fellows",
    "privacy-policy", "terms", "contact", "careers", "donate",
}

session = requests.Session()
session.headers.update({"User-Agent": UA})


def fetch(url: str, *, retries: int = 3, timeout: int = 20) -> str | None:
    for attempt in range(retries):
        try:
            r = session.get(url, timeout=timeout)
            if r.status_code == 200:
                return r.text
            if r.status_code == 404:
                return None
        except requests.RequestException as e:
            print(f"  ! {url} attempt {attempt+1}: {e}", file=sys.stderr)
        time.sleep(1.5 * (attempt + 1))
    return None


def get_detail_slugs() -> list[str]:
    """Top-level (non-/news/) slugs from the sitemap = candidate detail pages."""
    xml = fetch(SITEMAP_URL)
    if not xml:
        raise SystemExit("could not fetch sitemap")
    locs = re.findall(r"<loc>([^<]+)</loc>", xml)
    slugs = []
    for loc in locs:
        path = urlparse(loc).path.strip("/")
        if not path or "/" in path:          # skip home and nested (/news/...) URLs
            continue
        if path in NON_DETAIL_SLUGS:
            continue
        slugs.append(path)
    return sorted(set(slugs))


def text_of(el) -> str:
    return re.sub(r"\s+", " ", el.get_text(" ", strip=True)).strip() if el else ""


def meta(soup: BeautifulSoup, *keys: str) -> str:
    for key in keys:
        tag = soup.find("meta", property=key) or soup.find("meta", attrs={"name": key})
        if tag and tag.get("content"):
            return tag["content"].strip()
    return ""


def classify(slug: str, name: str, body: str) -> str:
    """Cheap heuristic page-type guess; refined later by enrichment."""
    text = f"{body} {name}".lower()
    # Person slugs tend to be "firstname-lastname" (two short tokens, no corp suffix).
    corp_suffix = re.search(r"\b(inc|llc|labs?|technolog|energy|bio|systems?|materials|co)\b", slug)
    looks_like_person = bool(re.fullmatch(r"[a-z]+-[a-z]+", slug)) and not corp_suffix
    if re.search(r"\bmanaging director\b|\bmentors? activate fellows\b|\bactivate (boston|berkeley|houston|community)\b", text):
        return "staff"
    if looks_like_person:
        return "person"
    return "company"


def parse(slug: str, html: str) -> dict:
    soup = BeautifulSoup(html, "lxml")
    name = meta(soup, "og:title") or text_of(soup.find("title")) or slug
    summary = meta(soup, "og:description", "description")

    # Body = concatenated rich-text content modules (the editorial content).
    blocks = soup.select(".hs_cos_wrapper_type_rich_text, .widget-type-rich_text")
    seen, parts = set(), []
    for b in blocks:
        t = text_of(b)
        if t and t not in seen and len(t) > 20:
            seen.add(t)
            parts.append(t)
    body = "\n\n".join(parts)

    emails = sorted(set(re.findall(r"[\w.+-]+@[\w-]+\.[\w.-]+", html)))
    links = sorted({
        a["href"] for a in soup.find_all("a", href=True)
        if a["href"].startswith("http")
        and "activate.org" not in a["href"]
        and not a["href"].endswith((".css", ".js"))
    })
    linkedin = next((l for l in links if "linkedin.com" in l), "")

    return {
        "slug": slug,
        "url": f"https://activate.org/{slug}",
        "name": name,
        "summary": summary,
        "body": body,
        "type_guess": classify(slug, name, body),
        "emails": [e for e in emails if "sentry" not in e and "example" not in e],
        "linkedin": linkedin,
        "external_links": [l for l in links if "linkedin.com" not in l][:10],
        "body_len": len(body),
    }


def main() -> None:
    RAW_DIR.mkdir(parents=True, exist_ok=True)
    OUT_DIR.mkdir(parents=True, exist_ok=True)

    slugs = get_detail_slugs()
    print(f"Found {len(slugs)} candidate detail pages in sitemap")

    records = []
    for i, slug in enumerate(slugs, 1):
        cache = RAW_DIR / f"{slug}.html"
        if cache.exists():
            html = cache.read_text(encoding="utf-8")
        else:
            print(f"[{i:>3}/{len(slugs)}] fetch {slug}")
            html = fetch(f"https://activate.org/{slug}")
            if not html:
                print(f"        skip (no html)")
                continue
            cache.write_text(html, encoding="utf-8")
            time.sleep(0.6)  # be polite
        rec = parse(slug, html)
        records.append(rec)

    out = OUT_DIR / "01_raw_records.json"
    out.write_text(json.dumps(records, indent=2, ensure_ascii=False), encoding="utf-8")

    by_type: dict[str, int] = {}
    for r in records:
        by_type[r["type_guess"]] = by_type.get(r["type_guess"], 0) + 1
    print(f"\nWrote {len(records)} records -> {out.relative_to(ROOT)}")
    print("type_guess breakdown:", by_type)


if __name__ == "__main__":
    main()
