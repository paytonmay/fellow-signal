"""
Peer-funder tier — who else backs these spaces.

Maps a peer deep-tech funder's portfolio (harvested from their site) onto
Activate's 16-vertical taxonomy, so we can compare where each funder concentrates.
Currently: The Engine (engine.xyz, harvested via pipeline/harvester/engine_harvest.mjs).
Extensible to Breakthrough Energy, Greentown, Prime, etc.

Output: data/processed/peer_funders.json
"""
from __future__ import annotations

import json
from collections import Counter
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent.parent
P = ROOT / "data" / "processed"
OUT = P / "peer_funders.json"

# The Engine's industry tags -> Activate verticals (approximate; taxonomies differ).
ENGINE_MAP = {
    "advanced-materials": ["Chemistry & Materials"],
    "fuels-chemicals": ["Chemistry & Materials", "Carbon Management / CO2e"],
    "advanced-engineering": ["Advanced Manufacturing & Robotics"],
    "ai-physical-systems": ["Computing", "Advanced Manufacturing & Robotics"],
    "biotech-life-sciences-2": ["Life Science", "Industrial Biotechnology"],
    "advanced-computing": ["Computing"],
    "energy": ["Energy Generation & Delivery", "Energy Storage & Batteries"],
    "infrastructure-mobility-built-environment": ["Built Environment", "Transportation & Mobility"],
    "ai-deep-software": ["Computing"],
    "semiconductors-photonics-hardware": ["Electronics & Connectivity"],
    "robotics": ["Advanced Manufacturing & Robotics"],
    "space": ["Space & Aeronautics"],
}


def map_funder(name: str, raw_file: str, mapping: dict) -> dict:
    cos = json.loads((P / raw_file).read_text())
    vert_count: Counter = Counter()
    for c in cos:
        verts = set()
        for ind in c.get("industries", []):
            verts.update(mapping.get(ind, []))
        for v in verts:
            vert_count[v] += 1
    n = len(cos) or 1
    return {
        "name": name,
        "total": len(cos),
        "vertical_count": dict(vert_count),
        "vertical_share": {v: round(c / n, 4) for v, c in vert_count.items()},
    }


def main() -> None:
    funders = [map_funder("The Engine", "peer_engine_raw.json", ENGINE_MAP)]
    OUT.write_text(json.dumps({"funders": funders}, indent=2, ensure_ascii=False), encoding="utf-8")
    print(f"Wrote {OUT.relative_to(ROOT)}")
    for f in funders:
        print(f"\n{f['name']} ({f['total']} companies) — top spaces:")
        for v, c in sorted(f["vertical_count"].items(), key=lambda kv: -kv[1])[:6]:
            print(f"  {c:>2} ({f['vertical_share'][v]*100:>3.0f}%)  {v}")


if __name__ == "__main__":
    main()
