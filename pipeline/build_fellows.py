"""
Build the canonical fellows dataset from Activate's authoritative Fellows table.

292 fellows, each with a human-written Biography that almost always states their
education. We parse degree level + universities heuristically from the bio
(Activate's own words), giving a far richer, more complete background dataset
than OpenAlex name-matching alone.

Input:  data/processed/00_fellows_raw.json
Output: data/processed/fellows.json
"""
from __future__ import annotations

import json
import re
from collections import Counter
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
RAW = ROOT / "data" / "processed" / "00_fellows_raw.json"
OUT = ROOT / "data" / "processed" / "fellows.json"


def clean(s) -> str:
    return re.sub(r"\s+", " ", str(s or "")).strip()


def highest_degree(bio: str) -> str | None:
    b = bio
    if re.search(r"\bPh\.?\s?D\b|\bdoctora(te|l)\b", b, re.I):
        return "PhD"
    if re.search(r"\bmaster'?s?\b|\bM\.?S\.?\b|\bM\.?A\.?\b|\bM\.?Eng\b|\bMBA\b|\bS\.?M\.?\b", b, re.I):
        return "Master's"
    if re.search(r"\bbachelor'?s?\b|\bB\.?S\.?\b|\bB\.?A\.?\b|\bundergrad", b, re.I):
        return "Bachelor's"
    return None


# Common institution shorthands the regex would miss.
KNOWN = {
    "MIT": "MIT", "Caltech": "Caltech", "UC Berkeley": "UC Berkeley",
    "UC San Diego": "UC San Diego", "UCLA": "UCLA", "UCSF": "UCSF",
    "Georgia Tech": "Georgia Tech", "ETH Zurich": "ETH Zurich",
}
UNI_RE = re.compile(
    r"\b(University of [A-Z][A-Za-z.&\-]+(?:[ ,][A-Z][A-Za-z.&\-]+){0,3}"
    r"|[A-Z][A-Za-z.&\-]+(?:[ ][A-Z][A-Za-z.&\-]+){0,3} (?:University|Institute of Technology|Institute|College|Polytechnic))\b"
)
STOP_UNI = re.compile(r"\b(the|and|at|from|in|a|completed|her|his|their)\b", re.I)


# Academic disciplines, specific -> general (first match wins). Maps the
# messy bio phrasing onto a clean field taxonomy.
DISCIPLINES = [
    ("Chemical engineering", r"chemical engineer"),
    ("Mechanical engineering", r"mechanical engineer"),
    ("Electrical engineering", r"electrical engineer|electrical and computer"),
    ("Materials science", r"materials? science|materials? engineer"),
    ("Biomedical engineering", r"biomedical engineer|bioengineer"),
    ("Aerospace engineering", r"aerospace|aeronautic|astronautic"),
    ("Environmental engineering", r"environmental engineer"),
    ("Civil engineering", r"civil engineer"),
    ("Nuclear engineering", r"nuclear engineer|nuclear physic"),
    ("Synthetic biology", r"synthetic biology"),
    ("Molecular biology", r"molecular biolog|biochemis"),
    ("Microbiology", r"microbiolog"),
    ("Neuroscience", r"neuroscience"),
    ("Genetics / genomics", r"genetic|genomic"),
    ("Chemistry", r"chemistry"),
    ("Physics", r"\bphysics\b|physicist"),
    ("Biology", r"\bbiology\b|biologist"),
    ("Computer science", r"computer science|machine learning|artificial intelligence"),
    ("Mathematics", r"mathematic|applied math"),
    ("Earth / environmental science", r"earth science|geolog|geoscience|oceanograph|climate science|environmental science"),
    ("Engineering (other)", r"engineer"),
]


def field_of_study(bio: str) -> str | None:
    # prefer the field tied to the doctorate, else the first discipline mentioned
    m = re.search(r"(Ph\.?\s?D\.?|doctorate|doctoral)[^.]{0,60}?\bin\s+([a-z][a-z /-]{4,40})", bio, re.I)
    scope = m.group(2) if m else bio
    for label, pat in DISCIPLINES:
        if re.search(pat, scope, re.I):
            return label
    for label, pat in DISCIPLINES:
        if re.search(pat, bio, re.I):
            return label
    return None


def universities(bio: str) -> list[str]:
    found = []
    for m in UNI_RE.findall(bio):
        u = m.strip().strip(",")
        # trim leading lowercase connectors the greedy match may grab
        u = re.sub(r"^(the|and|at|from|in)\s+", "", u, flags=re.I)
        if 3 < len(u) < 60 and not STOP_UNI.match(u):
            found.append(u)
    for k, v in KNOWN.items():
        if re.search(rf"\b{re.escape(k)}\b", bio):
            found.append(v)
    # de-dupe preserving order
    seen, out = set(), []
    for u in found:
        if u.lower() not in seen:
            seen.add(u.lower()); out.append(u)
    return out[:4]


def main() -> None:
    raw = json.loads(RAW.read_text(encoding="utf-8"))
    fellows = []
    for r in raw:
        f = r["fields"]
        bio = clean(f.get("Biography"))
        name = clean(f.get("Full Name"))
        if not name:
            continue
        try:
            year = int(str(f.get("Cohort")).strip()[:4])
        except (ValueError, TypeError):
            year = None
        fellows.append({
            "name": name,
            "cohort_year": year,
            "hub": clean(f.get("Community")),
            "company": clean(f.get("Fellow Company")),
            "verticals": [v.strip() for v in str(f.get("Company Verticals") or "").split(",") if v.strip()],
            "linkedin": clean(f.get("LinkedIn")),
            "bio": bio,
            "degree": highest_degree(bio),
            "universities": universities(bio),
            "field_of_study": field_of_study(bio),
        })

    fellows.sort(key=lambda x: (-(x["cohort_year"] or 0), x["name"]))
    OUT.write_text(json.dumps(fellows, indent=2, ensure_ascii=False), encoding="utf-8")

    print(f"Wrote {len(fellows)} fellows -> {OUT.relative_to(ROOT)}")
    deg = Counter(f["degree"] for f in fellows)
    print("\ndegree mix:", {k: deg[k] for k in ["PhD", "Master's", "Bachelor's", None]})
    print(f"with >=1 university parsed: {sum(1 for f in fellows if f['universities'])}/{len(fellows)}")
    unis = Counter(u for f in fellows for u in f["universities"])
    print("\ntop universities:")
    for u, n in unis.most_common(15):
        print(f"  {n:>3}  {u}")


if __name__ == "__main__":
    main()
