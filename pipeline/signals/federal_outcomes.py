"""
All-agency federal non-dilutive outcomes (supersedes NSF-only).

For each company, query USAspending for federal assistance awards (grants +
cooperative agreements, which is where NSF / DOE / USDA / NIH / ARPA-E SBIR &
research money lives) whose recipient name matches the company. This replaces
the NSF-only ledger with a TOTAL federal non-dilutive figure across every
agency. (DOD SBIR contracts are a separate award class and a known remaining
gap.)

Output: data/processed/federal_outcomes.json  (keyed by company name)
"""
from __future__ import annotations

import json
import re
import sys
import time
from collections import Counter
from pathlib import Path

import requests

ROOT = Path(__file__).resolve().parent.parent.parent
COMPANIES = ROOT / "data" / "processed" / "companies.json"
OUT = ROOT / "data" / "processed" / "federal_outcomes.json"
API = "https://api.usaspending.gov/api/v2/search/spending_by_award/"
HDR = {"User-Agent": "FellowSignal/0.1 (research)", "Content-Type": "application/json"}
TP = [{"start_date": "2014-10-01", "end_date": "2025-09-30"}]
ASSISTANCE = ["02", "03", "04", "05"]  # grants + cooperative agreements


def norm(s: str) -> str:
    s = re.sub(r"\(.*?\)", "", s or "").lower()
    s = re.sub(r"\b(inc|incorporated|llc|l\.l\.c|ltd|corp|corporation|co|company|"
               r"technologies|technology|labs|laboratories|holdings|the|pbc)\b", "", s)
    return re.sub(r"[^a-z0-9]", "", s)


# A 2-5yr-old startup with a federal award over this is almost certainly a
# name collision with a large institutional recipient, not the company.
MAX_AWARD = 25_000_000


def federal_for(name: str, *, retries: int = 3) -> dict:
    body = {
        "filters": {"recipient_search_text": [name], "time_period": TP,
                    "award_type_codes": ASSISTANCE},
        "fields": ["Award Amount", "Recipient Name", "Awarding Agency"],
        "limit": 100, "page": 1,
    }
    results = None
    for i in range(retries):
        try:
            r = requests.post(API, headers=HDR, json=body, timeout=45)
            if r.status_code == 200:
                results = r.json().get("results", [])
                break
        except requests.RequestException:
            pass
        time.sleep(2 * (i + 1))
    if results is None:
        return {"federal_total": 0, "federal_count": 0, "agencies": [], "_error": True}

    cn = norm(name)
    awards, agencies = [], Counter()
    for a in results:
        # EXACT normalized recipient match (a 'contains' match falsely pulls in
        # giant institutional recipients), plus a per-award sanity cap.
        if cn and norm(a.get("Recipient Name", "")) == cn:
            amt = float(a.get("Award Amount") or 0)
            if amt <= 0 or amt > MAX_AWARD:
                continue
            ag = a.get("Awarding Agency")
            awards.append({"amount": amt, "agency": ag})
            agencies[ag] += amt
    return {
        "federal_total": round(sum(x["amount"] for x in awards)),
        "federal_count": len(awards),
        "agencies": [{"name": k, "amount": round(v)} for k, v in agencies.most_common()],
    }


def main() -> None:
    companies = json.loads(COMPANIES.read_text(encoding="utf-8"))
    out, funded, total = {}, 0, 0
    for i, c in enumerate(companies, 1):
        rec = federal_for(c["name"]) if len(c["name"]) >= 4 else {"federal_total": 0, "federal_count": 0, "agencies": []}
        out[c["name"]] = rec
        if rec["federal_total"]:
            funded += 1
            total += rec["federal_total"]
        time.sleep(0.35)
        if i % 25 == 0 or i == len(companies):
            OUT.write_text(json.dumps(out, indent=2, ensure_ascii=False), encoding="utf-8")
            print(f"[{i}/{len(companies)}] federally funded: {funded}  ${total:,}", flush=True)

    OUT.write_text(json.dumps(out, indent=2, ensure_ascii=False), encoding="utf-8")
    by_agency = Counter()
    for r in out.values():
        for a in r["agencies"]:
            by_agency[a["name"]] += a["amount"]
    print(f"\n=== ALL-AGENCY FEDERAL NON-DILUTIVE ===")
    print(f"funded companies: {funded}/{len(companies)}  total ${total:,}")
    print("by agency:")
    for ag, amt in by_agency.most_common(8):
        print(f"  ${amt:>12,}  {ag}")


if __name__ == "__main__":
    main()
