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
from pathlib import Path

import requests

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
        out.append({"topic": r["topic"], "field": fld, "growth": r["growth"],
                    "recent_works": r["recent_works"], "activate_present": r["topic"].lower() in act})
        if len(out) >= 30:
            break

    OUT.write_text(json.dumps({"topics": out, "activate_topic_count": len(act)}, indent=2), encoding="utf-8")
    present = sum(1 for r in out if r["activate_present"])
    print(f"\nWrote {OUT.relative_to(ROOT)} — {len(out)} relevant rising topics, {present} where Activate is present")
    for r in out[:16]:
        flag = "Activate IN" if r["activate_present"] else "whitespace "
        print(f"  x{r['growth']:5.1f}  [{flag}]  {r['topic'][:46]:<46} [{r['field']}]")


if __name__ == "__main__":
    main()
