"""
Field publication-velocity per vertical (OpenAlex) + Frontier Radar join.

Raw publication counts are misleading: OpenAlex's own corpus grows every year,
so every field "rises." We normalize each vertical to its SHARE of all
publications that year, then measure momentum as the change in that share —
the field is the denominator. (Caps at 2024; 2025 is a partial year.)

Then we join field momentum to Activate's internal presence per vertical to
produce Frontier Radar coordinates:
  x = field momentum (is the science accelerating?)
  y = Activate presence/trajectory (are they in it, and growing?)
  -> whitespace = high field momentum, low Activate presence.

Output: data/processed/field_signal.json
"""
from __future__ import annotations

import json
import time
from pathlib import Path

import requests

ROOT = Path(__file__).resolve().parent.parent.parent
COMPANIES = ROOT / "data" / "processed" / "companies.json"
OUT = ROOT / "data" / "processed" / "field_signal.json"
UA = {"User-Agent": "FellowSignal/0.1 (mailto:may.payton@bitsourceky.com)"}
WORKS = "https://api.openalex.org/works"

# Activate vertical -> OpenAlex relevance-search query.
VERTICAL_QUERY = {
    "Chemistry & Materials": "advanced materials synthesis",
    "Climate": "climate change mitigation",
    "Advanced Manufacturing & Robotics": "advanced manufacturing robotics automation",
    "Industrial Biotechnology": "industrial biotechnology synthetic biology",
    "Electronics & Connectivity": "semiconductor electronics wireless",
    "Computing": "machine learning quantum computing",
    "Food & Agriculture": "agricultural technology food production",
    "Carbon Management / CO2e": "carbon capture utilization storage",
    "Life Science": "biomedical therapeutics diagnostics",
    "Energy Storage & Batteries": "battery energy storage electrode",
    "Built Environment": "sustainable building construction materials",
    "Energy Generation & Delivery": "renewable energy power grid",
    "Earth Resources": "critical minerals rare earth extraction",
    "Water": "water treatment desalination purification",
    "Transportation & Mobility": "electric vehicle mobility transportation",
    "Space & Aeronautics": "spacecraft aerospace propulsion",
}

EARLY = range(2013, 2017)   # baseline window
RECENT = range(2021, 2025)  # recent window (2025 excluded — partial)


def histogram(query: str | None) -> dict[int, int]:
    params = {"group_by": "publication_year",
              "filter": "from_publication_date:2010-01-01"}
    if query:
        params["filter"] += f",default.search:{query}"
    try:
        r = requests.get(WORKS, params=params, headers=UA, timeout=30)
        rows = r.json().get("group_by", [])
    except (requests.RequestException, ValueError):
        return {}
    return {int(x["key"]): x["count"] for x in rows if x["key"].isdigit()}


def window_avg(hist: dict[int, int], years) -> float:
    vals = [hist.get(y, 0) for y in years]
    return sum(vals) / len(vals) if vals else 0.0


def main() -> None:
    companies = json.loads(COMPANIES.read_text(encoding="utf-8"))

    print("baseline: total publications/year ...")
    total = histogram(None)
    tot_early, tot_recent = window_avg(total, EARLY), window_avg(total, RECENT)

    # Activate presence per vertical (recent share + trajectory).
    def present(rows):
        n = len(rows) or 1
        from collections import Counter
        c = Counter(v for r in rows for v in r["verticals"])
        return {k: v / n for k, v in c.items()}, n
    early_co = [c for c in companies if c["cohort_year"] and c["cohort_year"] <= 2019]
    recent_co = [c for c in companies if c["cohort_year"] and c["cohort_year"] >= 2021]
    es, _ = present(early_co)
    rs, rn = present(recent_co)

    out = []
    for vert, query in VERTICAL_QUERY.items():
        hist = histogram(query)
        time.sleep(0.3)
        # Field momentum = growth of the field's SHARE of all publications.
        share_early = window_avg(hist, EARLY) / tot_early if tot_early else 0
        share_recent = window_avg(hist, RECENT) / tot_recent if tot_recent else 0
        momentum = (share_recent / share_early) if share_early else 0
        # Activate presence + trajectory.
        a_recent = rs.get(vert, 0)
        a_traj = (rs.get(vert, 0) / es[vert]) if es.get(vert) else None
        out.append({
            "vertical": vert,
            "field_share_recent": round(share_recent, 5),
            "field_momentum": round(momentum, 2),       # >1 = field share growing
            "activate_presence_recent": round(a_recent, 3),
            "activate_trajectory": round(a_traj, 2) if a_traj else None,
        })
        print(f"  {vert:<34} field x{momentum:4.2f}  | activate {a_recent*100:4.0f}% of recent")

    OUT.write_text(json.dumps({"recent_n": rn, "fields": out}, indent=2), encoding="utf-8")

    print("\n=== FRONTIER RADAR ===")
    fm = sorted(out, key=lambda d: -d["field_momentum"])
    med_field = sorted(d["field_momentum"] for d in out)[len(out) // 2]
    med_pres = sorted(d["activate_presence_recent"] for d in out)[len(out) // 2]
    print(f"(field momentum median x{med_field:.2f}; presence median {med_pres*100:.0f}%)\n")
    print("WHITESPACE — field accelerating, Activate light:")
    for d in fm:
        if d["field_momentum"] >= med_field and d["activate_presence_recent"] < med_pres:
            print(f"  {d['vertical']:<34} field x{d['field_momentum']:.2f}  activate {d['activate_presence_recent']*100:.0f}%")
    print("\nVALIDATED — field accelerating, Activate present:")
    for d in fm:
        if d["field_momentum"] >= med_field and d["activate_presence_recent"] >= med_pres:
            print(f"  {d['vertical']:<34} field x{d['field_momentum']:.2f}  activate {d['activate_presence_recent']*100:.0f}%")


if __name__ == "__main__":
    main()
