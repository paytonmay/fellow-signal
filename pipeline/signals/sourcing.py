"""
Sourcing Radar (Phase 1). For each emerging area, a reviewer packet built from
OpenAlex: US INSTITUTION hotspots (scored by output x specialization x growth, not
raw count), recurring technical bottlenecks with evidence, the federal funding
signal, an evidence-quality badge, and a template 'why now'.

Institutions and research areas only, no individuals (see the proposal). US-scoped,
because the global ranking points at institutions Activate does not recruit from.

Output: data/processed/sourcing.json
"""
from __future__ import annotations

import json
import re
import time
from collections import defaultdict
from pathlib import Path

import requests

ROOT = Path(__file__).resolve().parent.parent.parent
EMERGING = ROOT / "data" / "processed" / "emerging_science.json"
OUT = ROOT / "data" / "processed" / "sourcing.json"
UA = {"User-Agent": "FellowSignal/0.1 (mailto:may.payton@bitsourceky.com)"}
WORKS = "https://api.openalex.org/works"
INSTS = "https://api.openalex.org/institutions"
REC_START, PRI_START, PRI_END = "2022-01-01", "2018-01-01", "2021-12-31"

# known OpenAlex institution artifacts: for-profit/community colleges and parsing
# errors whose output is inflated by mis-attributed works (so they pass volume floors)
BLOCK_INST = {"National Laboratory of the Rockies", "ASA College", "South University",
              "Saint Joseph's College", "Wilson College", "Genesee Community College",
              "Northwood University"}

# off-thesis topics that ride OpenAlex growth but aren't hard-tech sourcing areas
DENY = ["topic modeling", "network security", "intrusion", "ionosphere", "magnetosphere",
        "educational", "online learning", "iot and edge", "neural networks and applications",
        "land use"]

# unsolved-constraint vocabulary, the 'what is technically hard' signal
BOTTLENECKS = ["stability", "selectivity", "degradation", "durability", "scalability",
               "scale-up", "throughput", "corrosion", "toxicity", "lifetime", "yield",
               "efficiency", "cost", "manufacturability", "reproducibility", "sensitivity",
               "contamination", "fouling", "overpotential", "crosstalk"]


def get(url: str, params: dict, tries: int = 3) -> dict:
    for i in range(tries):
        try:
            r = requests.get(url, params=params, headers=UA, timeout=60)
            if r.status_code == 200:
                return r.json()
        except requests.RequestException:
            pass
        time.sleep(1.5 * (i + 1))
    return {}


def insts_by_topic(tid: str, start: str, end: str) -> dict[str, int]:
    j = get(WORKS, {"filter": f"primary_topic.id:{tid},from_publication_date:{start},"
                              f"to_publication_date:{end},authorships.institutions.country_code:US",
                    "group_by": "authorships.institutions.id"})
    return {g["key"].split("/")[-1]: g["count"] for g in j.get("group_by", [])}


def abstract_text(inv: dict | None) -> str:
    if not inv:
        return ""
    return " ".join(w for _, w in sorted((p, w) for w, ps in inv.items() for p in ps))


def bottlenecks_for(tid: str):
    j = get(WORKS, {"filter": f"primary_topic.id:{tid},from_publication_date:{REC_START}",
                    "select": "title,abstract_inverted_index", "per-page": 120, "sort": "cited_by_count:desc"})
    works = j.get("results", [])
    cov = sum(1 for w in works if w.get("abstract_inverted_index")) / max(1, len(works))
    counts: dict[str, int] = defaultdict(int)
    samples: dict[str, list] = defaultdict(list)
    for w in works:
        title = (w.get("title") or "").strip()
        text = (title + " " + abstract_text(w.get("abstract_inverted_index"))).lower()
        for term in BOTTLENECKS:
            if re.search(r"\b" + re.escape(term) + r"\b", text):
                counts[term] += 1
                if title and len(samples[term]) < 3 and title not in samples[term]:
                    samples[term].append(title[:150])
    top = sorted(counts.items(), key=lambda x: -x[1])[:5]
    return [{"term": t, "count": c, "samples": samples[t]} for t, c in top], round(cov, 2), len(works)


def inst_meta(ids: set[str]) -> dict[str, dict]:
    out: dict[str, dict] = {}
    ids = list(ids)
    for i in range(0, len(ids), 50):
        chunk = "|".join(ids[i:i + 50])
        j = get(INSTS, {"filter": f"ids.openalex:{chunk}", "select": "id,display_name,country_code,counts_by_year,ror,type", "per-page": 100})
        for it in j.get("results", []):
            iid = it["id"].split("/")[-1]
            recent_total = sum(c.get("works_count", 0) for c in it.get("counts_by_year", []) if c.get("year", 0) >= 2022)
            out[iid] = {"name": it["display_name"], "country": it.get("country_code"),
                        "recent_total": recent_total, "ror": it.get("ror"), "type": it.get("type")}
    return out


def funding_signal(t: dict) -> tuple[str, bool]:
    """(phrase, is_orphan). Orphan only when funding is MATCHED but low and Activate is absent."""
    if not t.get("federal_matched"):
        return "unavailable (no clean keyword match)", False
    if t.get("federal_new"):
        return f"appeared recently (~${round(t['federal_recent']/1e6)}M)", False
    mom = t.get("federal_momentum", 0)
    rec = t.get("federal_recent", 0)
    if mom >= 2:
        return f"rising (x{round(mom)}, ${round(rec/1e6)}M)", False
    low = rec < 20_000_000
    phrase = "low/flat" if low else f"established (${round(rec/1e6)}M)"
    orphan = low and not t.get("activate_present")
    return phrase, orphan


def main() -> None:
    topics = [t for t in json.loads(EMERGING.read_text())["topics"]
              if t.get("id") and not any(d in t["topic"].lower() for d in DENY)]
    print(f"building sourcing packets for {len(topics)} hard-tech areas...")
    areas = []
    meta_cache: dict[str, dict] = {}
    for t in topics:
        tid = t["id"]
        rec = insts_by_topic(tid, REC_START, "2025-12-31")
        pri = insts_by_topic(tid, PRI_START, PRI_END)
        need = set(rec) - set(meta_cache)
        if need:
            meta_cache.update(inst_meta(need))
        scored = []
        for iid, n in rec.items():
            m = meta_cache.get(iid)
            # require US + a ROR id (drops OpenAlex's auto-generated affiliation-string
            # entities, e.g. journals miscoded as institutions); drop archive/other
            # types and tiny miscoded "company" entities
            if not m or m["country"] != "US" or not m.get("ror") or n < 6:
                continue
            if m["name"] in BLOCK_INST:
                continue
            # Sourcing targets where PRE-company research happens: universities,
            # national labs, academic medical centers, government research. This is
            # both on-target for founder discovery and far cleaner (it drops the
            # company/nonprofit OpenAlex artifacts).
            if m.get("type") not in ("education", "facility", "government", "healthcare"):
                continue
            # credibility floor: a substantial research producer (drops community/
            # for-profit colleges and tiny miscoded entities spuriously topic-tagged)
            if m["recent_total"] < 1000:
                continue
            prior = pri.get(iid, 0)
            growth = (n / prior) if prior > 0 else None       # measured growth, or None (no prior baseline)
            g_score = growth if growth is not None else (2.0 if n >= 8 else 1.0)  # default only for scoring
            spec = n / max(1, m["recent_total"])              # focus: topic share of the institution's output
            score = n * (spec ** 0.5) * min(g_score, 3)       # output x specialization (softened) x growth
            scored.append({"name": m["name"], "type": m.get("type"), "recent": n,
                           "growth": round(min(growth, 3), 1) if growth is not None else None,
                           "spec": round(spec * 1000, 1), "score": score})
        scored.sort(key=lambda x: -x["score"])
        institutions = scored[:8]

        bn, cov, n_works = bottlenecks_for(tid)
        fund_phrase, orphan = funding_signal(t)
        present = t.get("activate_present", False)
        ev = {
            "topic_match": "by OpenAlex topic ID",
            "us_institutions": "strong" if len(scored) >= 8 else "limited" if len(scored) >= 3 else "thin",
            "funding_match": "matched keyword" if t.get("federal_matched") else "unavailable",
            "abstract_coverage": cov,
        }
        why = (f"The field's share of publications is up ~{t['growth']}x over the past several years; "
               f"the federal funding signal is {fund_phrase}; "
               f"Activate is {'already in this space' if present else 'not yet in this space'}. "
               + (f"Recurring bottlenecks: {', '.join(b['term'] for b in bn[:3])}." if bn else ""))
        areas.append({
            "topic": t["topic"], "id": tid, "field": t.get("field", ""), "research_growth": t["growth"],
            "activate_present": present, "funding_phrase": fund_phrase, "orphan": orphan,
            "institutions": institutions, "bottlenecks": bn, "evidence": ev, "why_now": why,
            "n_works": n_works,
        })
        flag = "ORPHAN" if orphan else ("Activate" if present else "")
        print(f"  {t['topic'][:38]:<38} {len(institutions)} US insts | {len(bn)} bottlenecks {flag}")
        time.sleep(0.2)

    OUT.write_text(json.dumps({"areas": areas}, indent=2), encoding="utf-8")
    print(f"\nWrote {OUT.relative_to(ROOT)} ({len(areas)} areas)")


if __name__ == "__main__":
    main()
