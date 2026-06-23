"""
Consolidate the pipeline outputs into a single dataset the web app imports at
build time (static export -> no runtime fetch, no exposed API).

Output: web/data/dataset.json
"""
from __future__ import annotations

import json
import re
from collections import Counter, defaultdict
from pathlib import Path

TEXT_FIELDS = ("name", "tagline", "one_liner", "elevator_pitch", "critical_need",
               "technology_vision", "potential_impact")


def no_em_dash(s: str) -> str:
    """Replace em/en dashes used as punctuation with a comma (site style: no em dashes)."""
    if not isinstance(s, str):
        return s
    s = re.sub(r"\s*—\s*", ", ", s)        # em dash -> comma
    s = re.sub(r"(?<=\d)\s*–\s*(?=\d)", "-", s)  # numeric en-dash range -> hyphen
    s = re.sub(r"\s*–\s*", ", ", s)        # other en dashes -> comma
    return re.sub(r"\s+", " ", s).strip()

ROOT = Path(__file__).resolve().parent.parent
P = ROOT / "data" / "processed"
OUT = ROOT / "web" / "data" / "dataset.json"


def load(name):
    return json.loads((P / name).read_text(encoding="utf-8"))


def main() -> None:
    companies = load("companies.json")
    # 130/224 companies have no detail-page slug, so slug is NOT unique — merge
    # on name (verified collision-free).
    outcomes = {o["name"]: o for o in load("outcomes.json")}
    field = load("field_signal.json")
    try:
        founders = load("founders.json")
    except FileNotFoundError:
        founders = {}
    try:
        space_signals = load("space_signals.json")
    except FileNotFoundError:
        space_signals = {"spaces": [], "agency_matrix": {}}
    try:
        funder_model = load("funder_model.json")
    except FileNotFoundError:
        funder_model = None
    try:
        peer_funders = load("peer_funders.json")
    except FileNotFoundError:
        peer_funders = {"funders": []}

    # Site style: strip em dashes from all displayed text.
    for c in companies:
        for f in TEXT_FIELDS:
            if f in c:
                c[f] = no_em_dash(c[f])

    # Merge outcomes into companies.
    for c in companies:
        o = outcomes.get(c["name"], {})
        c["nsf_total"] = o.get("nsf_total", 0)
        c["nsf_count"] = o.get("nsf_count", 0)
        c["edgar_formD"] = o.get("edgar_formD", 0)
        c["nsf_awards"] = o.get("nsf_awards", [])
        c["founders"] = founders.get(c["name"], [])

    dated = [c for c in companies if c["cohort_year"]]

    # By-year: count + vertical mix (for cohort drift).
    by_year = defaultdict(lambda: {"count": 0, "verticals": Counter()})
    for c in dated:
        by_year[c["cohort_year"]]["count"] += 1
        for v in c["verticals"]:
            by_year[c["cohort_year"]]["verticals"][v] += 1
    years = [{"year": y, "count": by_year[y]["count"],
              "verticals": dict(by_year[y]["verticals"])}
             for y in sorted(by_year)]

    # By-vertical: counts + outcomes + hub mix.
    by_vert = defaultdict(lambda: {"count": 0, "nsf_total": 0, "nsf_cos": 0,
                                   "formd_cos": 0, "hubs": Counter()})
    for c in companies:
        for v in c["verticals"]:
            d = by_vert[v]
            d["count"] += 1
            d["nsf_total"] += c["nsf_total"]
            d["nsf_cos"] += 1 if c["nsf_total"] else 0
            d["formd_cos"] += 1 if c["edgar_formD"] else 0
            if c["hub"]:
                d["hubs"][c["hub"]] += 1
    verticals = [{"vertical": v, **{k: (dict(x) if isinstance(x, Counter) else x)
                                    for k, x in d.items()}}
                 for v, d in sorted(by_vert.items(), key=lambda kv: -kv[1]["count"])]

    # Hubs.
    hubs = Counter(c["hub"] for c in companies if c["hub"])

    # --- Hub Atlas: hub x vertical specialization (over/under-index vs global) ---
    vert_order = [v["vertical"] for v in verticals]
    n_total = len(companies)
    global_share = {v: sum(1 for c in companies if v in c["verticals"]) / n_total
                    for v in vert_order}
    main_hubs = ["Berkeley", "Boston", "New York", "Houston", "Anywhere"]
    hub_cells = {}
    for hub in main_hubs:
        rows = [c for c in companies if c["hub"] == hub]
        n = len(rows) or 1
        hub_cells[hub] = {
            "n": len(rows),
            "verticals": {
                v: {
                    "count": sum(1 for c in rows if v in c["verticals"]),
                    "share": round(sum(1 for c in rows if v in c["verticals"]) / n, 4),
                    "over": round(sum(1 for c in rows if v in c["verticals"]) / n - global_share[v], 4),
                }
                for v in vert_order
            },
        }
    hub_atlas = {"hubs": main_hubs, "verticals": vert_order,
                 "global_share": {v: round(s, 4) for v, s in global_share.items()},
                 "cells": hub_cells}

    # --- Convergence: vertical co-occurrence (where fields combine) ---
    from itertools import combinations
    pair = Counter()
    for c in companies:
        for a, b in combinations(sorted(set(c["verticals"])), 2):
            pair[(a, b)] += 1
    links = [{"a": a, "b": b, "count": n} for (a, b), n in pair.items() if n >= 4]
    links.sort(key=lambda d: -d["count"])
    convergence = {
        "nodes": [{"vertical": v["vertical"], "count": v["count"]} for v in verticals],
        "links": links,
    }

    headline = {
        "companies": len(companies),
        "cohorts": f"{min(c['cohort_year'] for c in dated)}–{max(c['cohort_year'] for c in dated)}",
        "nsf_total": sum(c["nsf_total"] for c in companies),
        "nsf_funded": sum(1 for c in companies if c["nsf_total"]),
        "formd": sum(1 for c in companies if c["edgar_formD"]),
        "verticals": len(by_vert),
        "hubs": len(hubs),
        "fellows": len({f for c in companies for f in c["fellows"]}),
    }

    # Enrich radar rows with federal funding momentum (for bubble size).
    fed_mom = {s["vertical"]: s.get("federal_momentum") for s in space_signals.get("spaces", [])}
    radar = [{**r, "federal_momentum": fed_mom.get(r["vertical"])} for r in field["fields"]]

    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps({
        "headline": headline,
        "companies": companies,
        "years": years,
        "verticals": verticals,
        "hubs": hubs.most_common(),
        "radar": radar,
        "hub_atlas": hub_atlas,
        "convergence": convergence,
        "space_signals": space_signals,
        "funder_model": funder_model,
        "peer_funders": peer_funders,
    }, ensure_ascii=False), encoding="utf-8")
    kb = OUT.stat().st_size // 1024
    print(f"Wrote {OUT.relative_to(ROOT)} ({kb} KB)")
    print("headline:", json.dumps(headline, indent=2))


if __name__ == "__main__":
    main()
