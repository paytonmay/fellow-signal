"""
Space Signals — the ecosystem/forecast layer.

For each Activate vertical: federal funding trajectory + top agencies
(USAspending) joined with research momentum (OpenAlex, from field_signal.json).
Powers the Space Forecast and Funder Landscape views.

Caveat: spaces are matched by keyword against federal award text, so magnitudes
are directional — trust the trend and the ranking over exact dollars.

Output: data/processed/space_signals.json
"""
from __future__ import annotations

import json
import time
from pathlib import Path

import requests

ROOT = Path(__file__).resolve().parent.parent.parent
FIELD = ROOT / "data" / "processed" / "field_signal.json"
OUT = ROOT / "data" / "processed" / "space_signals.json"
API = "https://api.usaspending.gov/api/v2/search"
HDR = {"User-Agent": "FellowSignal/0.1 (research)", "Content-Type": "application/json"}
TP = [{"start_date": "2015-10-01", "end_date": "2025-09-30"}]

# Vertical -> federal-award keyword(s) (OR-matched against award text).
KW = {
    "Chemistry & Materials": ["advanced materials"],
    "Climate": ["climate resilience", "climate adaptation"],
    "Advanced Manufacturing & Robotics": ["advanced manufacturing", "robotics"],
    "Industrial Biotechnology": ["synthetic biology", "industrial biotechnology"],
    "Electronics & Connectivity": ["semiconductor", "microelectronics"],
    "Computing": ["quantum computing", "high performance computing"],
    "Food & Agriculture": ["agricultural technology", "sustainable agriculture"],
    "Carbon Management / CO2e": ["carbon capture", "direct air capture"],
    "Life Science": ["biomedical diagnostics", "therapeutics"],
    "Energy Storage & Batteries": ["battery storage", "energy storage"],
    "Built Environment": ["building efficiency", "sustainable construction"],
    "Energy Generation & Delivery": ["renewable energy", "grid modernization"],
    "Earth Resources": ["critical minerals", "rare earth elements"],
    "Water": ["water treatment", "desalination"],
    "Transportation & Mobility": ["electric vehicle", "zero emission vehicle"],
    "Space & Aeronautics": ["spacecraft", "space propulsion"],
}


def post(path: str, body: dict, *, retries: int = 3):
    for i in range(retries):
        try:
            r = requests.post(f"{API}/{path}", headers=HDR, json=body, timeout=45)
            if r.status_code == 200:
                return r.json()
        except requests.RequestException:
            pass
        time.sleep(2 * (i + 1))
    return None


def by_year(keywords: list[str]) -> dict[int, float]:
    d = post("spending_over_time/", {"group": "fiscal_year",
             "filters": {"keywords": keywords, "time_period": TP}})
    out = {}
    for x in (d or {}).get("results", []):
        amt = x.get("aggregated_amount") or 0
        out[int(x["time_period"]["fiscal_year"])] = amt
    return out


def agencies(keywords: list[str]) -> list[dict]:
    d = post("spending_by_category/awarding_agency/",
             {"filters": {"keywords": keywords, "time_period": TP}, "limit": 6})
    return [{"name": a["name"], "amount": a["amount"]}
            for a in (d or {}).get("results", []) if a["amount"] > 0]


def momentum(years: dict[int, float]) -> float:
    recent = sum(years.get(y, 0) for y in (2022, 2023, 2024, 2025))
    prior = sum(years.get(y, 0) for y in (2016, 2017, 2018, 2019))
    return round(recent / prior, 2) if prior > 0 else (recent and 99.0)


def main() -> None:
    field = {f["vertical"]: f for f in json.loads(FIELD.read_text())["fields"]}
    spaces = []
    agency_matrix: dict[str, dict[str, float]] = {}
    for i, (vert, kws) in enumerate(KW.items(), 1):
        yrs = by_year(kws)
        time.sleep(0.4)
        ags = agencies(kws)
        time.sleep(0.4)
        total = sum(yrs.values())
        for a in ags:
            agency_matrix.setdefault(a["name"], {})[vert] = a["amount"]
        f = field.get(vert, {})
        spaces.append({
            "vertical": vert,
            "federal_total": round(total),
            "federal_by_year": {str(y): round(v) for y, v in sorted(yrs.items()) if v},
            "federal_momentum": momentum(yrs),
            "top_agencies": ags[:4],
            "research_momentum": f.get("field_momentum"),
            "activate_presence": f.get("activate_presence_recent"),
        })
        top = ags[0]["name"] if ags else "—"
        print(f"  [{i:>2}] {vert:<34} ${total/1e6:>7.0f}M  mom x{spaces[-1]['federal_momentum']}  lead: {top}", flush=True)

    OUT.write_text(json.dumps({"spaces": spaces, "agency_matrix": agency_matrix},
                              indent=2, ensure_ascii=False), encoding="utf-8")
    print(f"\nWrote {OUT.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
