"""
Data integrity checks. Run after a rebuild to catch regressions the
2026-06-24 audit surfaced. Hard failures exit non-zero; soft issues warn.

Usage: python pipeline/validate.py
"""
from __future__ import annotations

import json
import sys
from collections import Counter
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
PROC = ROOT / "data" / "processed"
DATASET = ROOT / "web" / "data" / "dataset.json"

errors: list[str] = []
warnings: list[str] = []


def check(name: str, ok: bool, detail: str, hard: bool = True) -> None:
    if ok:
        print(f"  PASS  {name}")
    else:
        (errors if hard else warnings).append(f"{name}: {detail}")
        print(f"  {'FAIL' if hard else 'WARN'}  {name} — {detail}")


def main() -> None:
    # 1. all processed JSON + dataset parse
    for p in list(PROC.glob("*.json")) + [DATASET]:
        try:
            json.loads(p.read_text())
        except json.JSONDecodeError as e:
            check(f"parse {p.name}", False, str(e))
    print("  PASS  all JSON parses")

    D = json.loads(DATASET.read_text())
    co = D["companies"]
    names = [c["name"] for c in co]
    ids = [c["id"] for c in co]

    # 2. no duplicate canonical names / ids
    dn = [n for n, k in Counter(names).items() if k > 1]
    di = [i for i, k in Counter(ids).items() if k > 1]
    check("unique company names", not dn, f"dupes: {dn}")
    check("unique company ids", not di, f"dupes: {di}")

    # 3. headline recomputes from rows
    fed = sum(c["federal_total"] for c in co)
    check("federal_total reconciles", fed == D["headline"]["federal_total"],
          f"sum {fed} != headline {D['headline']['federal_total']}")

    # 4. nsf_total should not exceed federal_total (all-agency) — known gap, soft
    nsf_gt = [c["name"] for c in co if c.get("nsf_total", 0) > c.get("federal_total", 0)]
    check("nsf_total <= federal_total", not nsf_gt,
          f"{len(nsf_gt)} cos have NSF-API awards beyond the USAspending match: {nsf_gt[:5]}", hard=False)

    # 5. every company has at least one vertical — soft
    no_vert = [c["name"] for c in co if not c.get("verticals")]
    check("companies have a vertical", not no_vert, f"missing: {no_vert}", hard=False)

    # 6. every fellow company joins to a canonical company (post quote-strip)
    fellows = json.loads((PROC / "fellows.json").read_text())
    canon = set(names)
    unjoined = sorted({f["company"] for f in fellows if f.get("company") and f["company"] not in canon})
    check("fellow companies join to a venture", not unjoined,
          f"{len(unjoined)} unmatched: {unjoined[:5]}", hard=False)

    # 7. sourcing radar packets (operational-facing, so check provenance + non-empty)
    src = (D.get("sourcing") or {}).get("areas", [])
    if src:
        no_id = [a["topic"] for a in src if not a.get("id")]
        check("sourcing areas carry a topic ID", not no_id, f"missing id: {no_id[:5]}")
        bad_inst = [a["topic"] for a in src if not a.get("institutions")]
        check("sourcing areas have institutions", not bad_inst, f"empty: {bad_inst[:5]}")
        bad_str = [a["topic"] for a in src for i in a.get("institutions", []) if not i.get("name")]
        check("sourcing institutions have names", not bad_str, f"{len(bad_str)} unnamed")
        thin = [a["topic"] for a in src if len(a.get("institutions", [])) < 4]
        check("sourcing areas have >=4 institutions", not thin, f"thin coverage: {thin[:5]}", hard=False)

    print()
    if errors:
        print(f"{len(errors)} hard failure(s):")
        for e in errors:
            print(f"  - {e}")
        sys.exit(1)
    print(f"OK — {len(warnings)} soft warning(s) (documented, non-blocking).")


if __name__ == "__main__":
    main()
