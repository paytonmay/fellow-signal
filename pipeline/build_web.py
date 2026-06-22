"""
Consolidate the pipeline outputs into a single dataset the web app imports at
build time (static export -> no runtime fetch, no exposed API).

Output: web/data/dataset.json
"""
from __future__ import annotations

import json
from collections import Counter, defaultdict
from pathlib import Path

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

    # Merge outcomes into companies.
    for c in companies:
        o = outcomes.get(c["name"], {})
        c["nsf_total"] = o.get("nsf_total", 0)
        c["nsf_count"] = o.get("nsf_count", 0)
        c["edgar_formD"] = o.get("edgar_formD", 0)
        c["nsf_awards"] = o.get("nsf_awards", [])

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

    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps({
        "headline": headline,
        "companies": companies,
        "years": years,
        "verticals": verticals,
        "hubs": hubs.most_common(),
        "radar": field["fields"],
    }, ensure_ascii=False), encoding="utf-8")
    kb = OUT.stat().st_size // 1024
    print(f"Wrote {OUT.relative_to(ROOT)} ({kb} KB)")
    print("headline:", json.dumps(headline, indent=2))


if __name__ == "__main__":
    main()
