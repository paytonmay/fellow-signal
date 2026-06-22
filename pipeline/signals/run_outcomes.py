"""
Build the outcomes ledger across the full portfolio.

For every company: NSF non-dilutive grants won + count of SEC EDGAR Form D
filings (private-raise signal). Writes per-company ledger + aggregates by
vertical and cohort. SBIR.gov (all-agency) is layered in later via backoff.

Output: data/processed/outcomes.json
Run:    python pipeline/signals/run_outcomes.py
"""
from __future__ import annotations

import json
import sys
import time
from collections import defaultdict
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from funding import nsf_by_company, edgar_mentions  # noqa: E402

ROOT = Path(__file__).resolve().parent.parent.parent
COMPANIES = ROOT / "data" / "processed" / "companies.json"
OUT = ROOT / "data" / "processed" / "outcomes.json"


def main() -> None:
    companies = json.loads(COMPANIES.read_text(encoding="utf-8"))
    ledger = []
    for i, c in enumerate(companies, 1):
        name = c["name"]
        # Skip very short/generic names for NSF keyword precision; still log them.
        nsf = nsf_by_company(name) if len(name) >= 4 else []
        time.sleep(0.3)
        formd = edgar_mentions(name)
        time.sleep(0.2)
        nsf_total = sum(a["amount"] for a in nsf)
        ledger.append({
            "slug": c["slug"], "name": name,
            "cohort_year": c["cohort_year"], "hub": c["hub"],
            "verticals": c["verticals"],
            "nsf_awards": nsf, "nsf_total": nsf_total,
            "nsf_count": len(nsf), "edgar_formD": formd,
            "has_outcome": bool(nsf or formd),
        })
        if i % 20 == 0 or i == len(companies):
            won = sum(1 for x in ledger if x["nsf_total"])
            tot = sum(x["nsf_total"] for x in ledger)
            print(f"[{i}/{len(companies)}] NSF-funded so far: {won}  ${tot:,}", flush=True)

    OUT.write_text(json.dumps(ledger, indent=2, ensure_ascii=False), encoding="utf-8")

    # Aggregates.
    nsf_funded = [x for x in ledger if x["nsf_total"]]
    total_nsf = sum(x["nsf_total"] for x in ledger)
    by_vert_amt: dict[str, int] = defaultdict(int)
    by_vert_cnt: dict[str, int] = defaultdict(int)
    for x in nsf_funded:
        for v in x["verticals"]:
            by_vert_amt[v] += x["nsf_total"]
            by_vert_cnt[v] += 1
    by_cohort: dict = defaultdict(int)
    for x in nsf_funded:
        by_cohort[x["cohort_year"]] += x["nsf_total"]

    print(f"\n=== OUTCOMES LEDGER ({len(ledger)} companies) ===")
    print(f"NSF-funded companies: {len(nsf_funded)} ({len(nsf_funded)/len(ledger)*100:.0f}%)")
    print(f"Total NSF non-dilutive: ${total_nsf:,}")
    print(f"EDGAR Form D present:  {sum(1 for x in ledger if x['edgar_formD'])}")
    print("\nNSF $ by vertical (top 10):")
    for v, amt in sorted(by_vert_amt.items(), key=lambda kv: -kv[1])[:10]:
        print(f"  ${amt:>11,}  ({by_vert_cnt[v]:>2} cos)  {v}")
    print("\nNSF $ by cohort:")
    for y in sorted(k for k in by_cohort if k):
        print(f"  {y}: ${by_cohort[y]:,}")


if __name__ == "__main__":
    main()
