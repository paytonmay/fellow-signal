"""
Emerging Science — bottom-up frontier detection.

Instead of measuring our 16 pre-defined verticals, let the data surface what's
accelerating: rank OpenAlex's ~4,500 fine-grained research topics (which include
arXiv / bioRxiv preprints) by the growth in their share of publications, within
the deep-tech-relevant domains. Then cross each rising topic against the topics
Activate's own fellows publish in, to flag:
  - present  : Activate already has a fellow in this emerging area (validated)
  - absent   : nobody yet, the earliest science-level whitespace / watch list

Output: data/processed/emerging_science.json
"""
from __future__ import annotations

import json
import re
import time
from pathlib import Path

import requests

USASPEND = "https://api.usaspending.gov/api/v2/search/spending_over_time/"


# Curated USAspending keywords for recurring deep-tech topics. OpenAlex topic
# names don't match federal award text well, so a clean domain keyword is far
# more reliable than auto-cleaning the academic phrasing.
CURATED = {
    "perovskite": "perovskite solar", "battery": "battery materials",
    "photocatalysis": "photocatalysis", "electrocatalyst": "electrocatalysis",
    "concrete": "low carbon cement", "cement": "low carbon cement",
    "energy harvesting": "energy harvesting", "additive manufacturing": "additive manufacturing",
    "drug discovery": "computational drug discovery", "genomic": "genome sequencing",
    "carbon capture": "carbon capture", "direct air": "direct air capture",
    "hydrogen": "clean hydrogen", "quantum": "quantum information",
    "semiconductor": "semiconductor", "solar cell": "solar photovoltaic",
    "microbiota": "microbiome", "fuel cell": "fuel cell", "catalyst": "catalysis",
}
FEDERAL_MIN = 20_000_000  # below this, momentum off a tiny base is just noise


def fed_keyword(topic: str) -> str | None:
    """Best USAspending keyword for a topic, or None if no reliable match."""
    tl = topic.lower()
    for k, v in CURATED.items():
        if k in tl:
            return v
    return None


def federal_window(kw: str, start: str, end: str) -> float | None:
    try:
        r = requests.post(USASPEND, headers={"User-Agent": "FellowSignal/0.1 (research)",
                          "Content-Type": "application/json"},
                          json={"group": "fiscal_year", "filters": {"keywords": [kw],
                                "time_period": [{"start_date": start, "end_date": end}]}}, timeout=40)
        if r.status_code != 200:
            return None
        return sum((x.get("aggregated_amount") or 0) for x in r.json().get("results", []))
    except requests.RequestException:
        return None


def federal_signal(topic: str) -> dict:
    kw = fed_keyword(topic)
    if not kw:
        return {"federal_recent": 0, "federal_momentum": 0.0, "federal_new": False, "federal_matched": False}
    recent = federal_window(kw, "2021-10-01", "2025-09-30") or 0
    prior = federal_window(kw, "2016-10-01", "2020-09-30") or 0
    new = prior < 1_000_000 and recent >= FEDERAL_MIN  # money appeared from ~nothing
    # only trust momentum when current funding is material (tiny bases give absurd ratios)
    if recent < FEDERAL_MIN:
        mom = 0.0
    elif new:
        mom = 20.0
    else:
        mom = recent / prior
    return {"federal_recent": round(recent), "federal_momentum": round(min(mom, 20), 1),
            "federal_new": new, "federal_matched": True}

ROOT = Path(__file__).resolve().parent.parent.parent
OUT = ROOT / "data" / "processed" / "emerging_science.json"
DATASET = ROOT / "web" / "data" / "dataset.json"
UA = {"User-Agent": "FellowSignal/0.1 (mailto:may.payton@bitsourceky.com)"}
WORKS = "https://api.openalex.org/works"
# Physical Sciences (3) + Life Sciences (1) = the deep-tech-relevant frontier.
DOMAINS = "domains/3|domains/1"


def topic_counts(start: str, end: str) -> dict[str, tuple[str, int]]:
    r = requests.get(WORKS, params={
        "filter": f"from_publication_date:{start},to_publication_date:{end},primary_topic.domain.id:{DOMAINS}",
        "group_by": "primary_topic.id",
    }, headers=UA, timeout=60)
    return {g["key_display_name"]: (g["key"].split("/")[-1], g["count"]) for g in r.json().get("group_by", [])}


# Fields that aren't deep-tech-fundable science — drop the OpenAlex tagging noise.
EXCLUDE_FIELDS = {
    "Social Sciences", "Arts and Humanities", "Economics, Econometrics and Finance",
    "Psychology", "Business, Management and Accounting", "Decision Sciences",
    "Nursing", "Dentistry", "Health Professions", "Mathematics",
    "Earth and Planetary Sciences",  # geophysics/ionosphere: not Activate's domain
}


def topic_fields(ids: list[str]) -> dict[str, str]:
    """Map topic id -> field display name (for relevance filtering + context)."""
    out: dict[str, str] = {}
    for i in range(0, len(ids), 40):
        chunk = "|".join(ids[i:i + 40])
        r = requests.get("https://api.openalex.org/topics",
                         params={"filter": f"ids.openalex:{chunk}", "per-page": 100,
                                 "select": "id,field"}, headers=UA, timeout=40)
        for t in r.json().get("results", []):
            out[t["id"].split("/")[-1]] = (t.get("field") or {}).get("display_name", "")
    return out


def activate_topics() -> set[str]:
    """Every topic any resolved Activate fellow has published in (from founders.json)."""
    path = ROOT / "data" / "processed" / "founders.json"
    if not path.exists():
        return set()
    out: set[str] = set()
    for founders in json.loads(path.read_text()).values():
        for f in founders:
            for t in f.get("pre_founding_topics", []) or []:
                out.add(t.lower())
    return out


def main() -> None:
    print("fetching topic distributions (recent vs baseline)...")
    recent = topic_counts("2023-01-01", "2024-12-31")
    base = topic_counts("2016-01-01", "2017-12-31")

    tr = sum(c for _, c in recent.values())
    tb = sum(c for _, c in base.values())
    rising = []
    for t, (tid, rc) in recent.items():
        bc = base.get(t, (None, 0))[1]
        if rc >= 800 and bc > 0:  # meaningful current volume
            rising.append({"topic": t, "id": tid, "growth": round((rc / tr) / (bc / tb), 2), "recent_works": rc})
    rising.sort(key=lambda x: -x["growth"])

    fields = topic_fields([r["id"] for r in rising[:80]])
    act = activate_topics()
    out = []
    for r in rising:
        fld = fields.get(r["id"], "")
        if fld in EXCLUDE_FIELDS:
            continue
        # share growth above ~8x over 7 years is an OpenAlex coverage/tagging
        # artifact, not real field emergence
        if r["growth"] > 8:
            continue
        out.append({"topic": r["topic"], "id": r["id"], "field": fld, "growth": r["growth"],
                    "recent_works": r["recent_works"], "activate_present": r["topic"].lower() in act})
        if len(out) >= 28:
            break

    # Cross with federal funding momentum, then let opportunity = research x money.
    print("crossing with federal funding momentum...")
    for r in out:
        r.update(federal_signal(r["topic"]))
        time.sleep(0.25)
        rn = min(r["growth"], 8) / 8
        fn = min(r["federal_momentum"], 20) / 20
        r["opportunity"] = round(0.5 * rn + 0.5 * fn, 3)
    out.sort(key=lambda r: -r["opportunity"])

    OUT.write_text(json.dumps({"topics": out, "activate_topic_count": len(act)}, indent=2), encoding="utf-8")
    present = sum(1 for r in out if r["activate_present"])
    print(f"\nWrote {OUT.relative_to(ROOT)} — {len(out)} topics, {present} Activate-present. Ranked by opportunity:")
    for r in out[:16]:
        flag = "IN " if r["activate_present"] else "OPEN"
        fm = "new" if r["federal_new"] else f"x{r['federal_momentum']:.0f}"
        print(f"  opp {r['opportunity']:.2f} [{flag}] res x{r['growth']:4.1f} fed {fm:>4} ${r['federal_recent']/1e6:>5.0f}M  {r['topic'][:38]}")


if __name__ == "__main__":
    main()
