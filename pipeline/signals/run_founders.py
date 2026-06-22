"""
Founder research footprint across the whole portfolio (OpenAlex).

For each company's fellow(s): resolve to their OpenAlex author (field/domain-aware
disambiguation), capture footprint + pre-founding research topics. Generic names
that don't field-align are left unresolved rather than guessed.

Output: data/processed/founders.json  (keyed by company name)
"""
from __future__ import annotations

import json
import sys
import time
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from scholar import resolve_fellow, works_timeline, pre_founding_topics, RateLimited  # noqa: E402


def resolve_with_retry(fellow, company):
    """Resolve, riding out OpenAlex throttling rather than recording a real
    founder as unresolved."""
    for _ in range(3):
        try:
            return resolve_fellow(fellow, company)
        except RateLimited:
            time.sleep(8)
    return None

ROOT = Path(__file__).resolve().parent.parent.parent
COMPANIES = ROOT / "data" / "processed" / "companies.json"
OUT = ROOT / "data" / "processed" / "founders.json"


def main() -> None:
    companies = json.loads(COMPANIES.read_text(encoding="utf-8"))
    result = {}
    resolved = 0
    total_fellows = 0
    for i, c in enumerate(companies, 1):
        founders = []
        for fellow in c["fellows"]:
            total_fellows += 1
            a = resolve_with_retry(fellow, c)
            time.sleep(0.5)
            if not a:
                founders.append({"name": fellow, "resolved": False})
                continue
            try:
                tl = works_timeline(a["openalex_id"])
            except RateLimited:
                time.sleep(8)
                try:
                    tl = works_timeline(a["openalex_id"])
                except RateLimited:
                    tl = []
            time.sleep(0.5)
            pre = pre_founding_topics(tl, c["cohort_year"])
            founders.append({
                "name": fellow,
                "resolved": True,
                "display_name": a["display_name"],
                "institution": a["institution"],
                "works_count": a["works_count"],
                "cited_by_count": a["cited_by_count"],
                "h_index": a["h_index"],
                "pre_founding_topics": pre[:6],
                "first_pub_year": min((w["year"] for w in tl if w["year"]), default=None),
            })
            resolved += 1
        result[c["name"]] = founders
        if i % 25 == 0 or i == len(companies):
            print(f"[{i}/{len(companies)}] fellows resolved: {resolved}/{total_fellows}", flush=True)

    OUT.write_text(json.dumps(result, indent=2, ensure_ascii=False), encoding="utf-8")
    print(f"\nWrote {OUT.relative_to(ROOT)}")
    print(f"resolved {resolved}/{total_fellows} fellows "
          f"({resolved/total_fellows*100:.0f}%)")


if __name__ == "__main__":
    main()
