"""
Funder & Model layer — Activate's own finances (the nonprofit angle).

Activate is a 501(c)(3), so its IRS Form 990s are public. ProPublica's Nonprofit
Explorer exposes the year-by-year financials: revenue (money in from
philanthropy + government), expenses, and net assets. This answers "is the
budget growing?" and frames the model: money in (donations/grants) vs. impact
out (the portfolio's funding outcomes).

Output: data/processed/funder_model.json
"""
from __future__ import annotations

import json
from pathlib import Path

import requests

ROOT = Path(__file__).resolve().parent.parent.parent
OUT = ROOT / "data" / "processed" / "funder_model.json"
EIN = "475502184"  # Activate Global Inc
URL = f"https://projects.propublica.org/nonprofits/api/v2/organizations/{EIN}.json"
UA = {"User-Agent": "FellowSignal/0.1 (research)"}


def main() -> None:
    d = requests.get(URL, headers=UA, timeout=30).json()
    org = d.get("organization", {})
    rows = []
    for f in d.get("filings_with_data", []):
        yr = f.get("tax_prd_yr")
        if not yr:
            continue
        rows.append({
            "year": yr,
            "revenue": f.get("totrevenue") or 0,
            "expenses": f.get("totfuncexpns") or 0,
            "net_assets": f.get("totnetassetend") or 0,
        })
    rows.sort(key=lambda r: r["year"])

    first, last = rows[0], rows[-1]
    n = last["year"] - first["year"]
    base = next((r["revenue"] for r in rows if r["revenue"] > 0), 0)
    cagr = ((last["revenue"] / base) ** (1 / max(n, 1)) - 1) if base else 0

    out = {
        "ein": EIN,
        "name": org.get("name"),
        "financials": rows,
        "revenue_latest": last["revenue"],
        "revenue_cagr": round(cagr, 3),
        "years": f"{first['year']}-{last['year']}",
        "source": "IRS Form 990 via ProPublica Nonprofit Explorer",
    }
    OUT.write_text(json.dumps(out, indent=2), encoding="utf-8")
    print(f"Wrote {OUT.relative_to(ROOT)}")
    print(f"  revenue {first['year']}: ${first['revenue']:,} -> {last['year']}: ${last['revenue']:,}")
    print(f"  revenue CAGR: {cagr*100:.0f}%/yr over {n} years")


if __name__ == "__main__":
    main()
