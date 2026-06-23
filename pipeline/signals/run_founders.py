"""
Founder research footprint across the whole portfolio (OpenAlex).

For each company's fellow(s): resolve to their OpenAlex author (field/domain-aware
disambiguation), capture footprint + pre-founding research topics. Generic names
that don't field-align are left unresolved rather than guessed.

Output: data/processed/founders.json  (keyed by company name)
"""
from __future__ import annotations

import json
import os
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

    # Resume: reuse any fellow already RESOLVED in a prior run; only (re)try the
    # unresolved ones. Makes re-runs gentle + progressive against the rate limit.
    cache: dict = {}
    if OUT.exists():
        prior = json.loads(OUT.read_text(encoding="utf-8"))
        for co_name, founders in prior.items():
            for f in founders:
                # Only reuse plausible matches; drop implausibly-senior namesake
                # false positives so they get re-resolved (and now rejected).
                if f.get("resolved") and (f.get("h_index") or 0) <= 60 and (f.get("works_count") or 0) <= 150:
                    cache[(co_name, f["name"])] = f

    # Wall-clock budget: OpenAlex throttles hard after a few hundred requests,
    # and the backoff then crawls. Stop cleanly before that eats the whole job
    # so progress gets saved + committed; the resumable cache lets the next run
    # pick up where this one left off. Override with FOUNDER_BUDGET_SECS.
    budget = int(os.environ.get("FOUNDER_BUDGET_SECS", "1500"))
    start = time.time()

    result = {}
    resolved = 0
    total_fellows = 0
    for i, c in enumerate(companies, 1):
        if time.time() - start > budget:
            # carry remaining companies' fellows through unchanged from cache
            for rest in companies[i - 1:]:
                result[rest["name"]] = [cache.get((rest["name"], fn)) or {"name": fn, "resolved": False}
                                        for fn in rest["fellows"]]
                resolved += sum(1 for fn in rest["fellows"] if cache.get((rest["name"], fn)))
            print(f"[budget] stopped at company {i} after {budget}s; saving progress", flush=True)
            break
        founders = []
        for fellow in c["fellows"]:
            total_fellows += 1
            cached = cache.get((c["name"], fellow))
            if cached:
                founders.append(cached)
                resolved += 1
                continue
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
            first_pub = min((w["year"] for w in tl if w["year"]), default=None)
            founders.append({
                "name": fellow,
                "resolved": True,
                "display_name": a["display_name"],
                "institution": a["institution"],
                "training_institution": a.get("training_institution"),
                "affiliations": a.get("affiliations", []),
                "field": a.get("field"),
                "works_count": a["works_count"],
                "cited_by_count": a["cited_by_count"],
                "h_index": a["h_index"],
                "pre_founding_topics": pre[:6],
                "first_pub_year": first_pub,
                # career stage at founding (research-to-venture latency)
                "years_to_founding": (c["cohort_year"] - first_pub) if (first_pub and c["cohort_year"]) else None,
            })
            resolved += 1
        result[c["name"]] = founders
        if i % 20 == 0 or i == len(companies):
            # Persist progress so a kill/throttle never loses resolved work.
            OUT.write_text(json.dumps(result, indent=2, ensure_ascii=False), encoding="utf-8")
            print(f"[{i}/{len(companies)}] fellows resolved: {resolved}/{total_fellows}", flush=True)

    OUT.write_text(json.dumps(result, indent=2, ensure_ascii=False), encoding="utf-8")
    print(f"\nWrote {OUT.relative_to(ROOT)}")
    print(f"resolved {resolved}/{total_fellows} fellows "
          f"({resolved/total_fellows*100:.0f}%)")


if __name__ == "__main__":
    main()
