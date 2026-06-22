"""
Stage 3 — Enrich (map science -> domain -> industry -> impact).

Each fellow venture is classified along the axes that matter for Activate's
discovery & insights mission:

  domain   - the hard-tech sector (one of a fixed taxonomy)
  field    - the underlying scientific discipline
  market   - the industry / end market served
  impact   - tags for the kind of real-world impact the science enables
  keywords - salient technical terms (auto-extracted from the description)

The labels below are model-generated (the same class of model the API path
would call). When ANTHROPIC_API_KEY is set, `llm_classify()` regenerates labels
for any company not already in LABELS — this is the reproducible production
path; the curated dict is the current golden set and offline fallback.

Input:  data/processed/02_companies.json
Output: data/processed/03_enriched.json
"""
from __future__ import annotations

import json
import os
import re
from collections import Counter
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
IN = ROOT / "data" / "processed" / "02_companies.json"
OUT = ROOT / "data" / "processed" / "03_enriched.json"

# --- Taxonomy -------------------------------------------------------------
DOMAINS = {
    "Energy Storage": "Batteries, thermal and mechanical storage",
    "Power & Grid": "Generation, power electronics, grid, renewables, hydrogen",
    "Carbon & Climate": "Carbon capture/removal, emissions mitigation",
    "Advanced Materials": "Novel materials, nanomanufacturing, coatings, membranes",
    "Critical Minerals": "Extraction & supply of battery/energy-transition minerals",
    "Water": "Desalination, treatment, contaminant remediation",
    "Biotech & Health": "Diagnostics, therapeutics, bioprocessing, life-science tools",
    "Agriculture & Food": "Crops, livestock, aquaculture, food safety",
    "Semiconductors & Photonics": "Chips, lasers, photonic and RF devices",
    "Computing & AI Infra": "AI hardware, optical compute, simulation, cooling",
    "Quantum": "Quantum computing and networking",
    "Space": "In-space propulsion, manufacturing, sensing",
    "Robotics & Automation": "Robots, actuators, autonomy, smart manufacturing",
    "Industrial Chemicals": "Electrochemical / bio routes to commodity chemicals",
    "Recycling & Circular": "Recycling, upcycling, circular-economy materials",
}

IMPACT_TAGS = [
    "Decarbonization", "Energy access & resilience", "Clean water",
    "Critical mineral supply", "Circular economy", "Pollution remediation",
    "Sustainable food", "Healthcare access", "Scientific tooling",
    "Domestic manufacturing", "Climate resilience", "Carbon removal",
    "Energy efficiency", "Space infrastructure", "Labor & automation",
    "Food safety", "Infrastructure safety", "Security",
]

# --- Curated labels: slug -> (domain, field, market, [impact...]) ---------
LABELS: dict[str, tuple[str, str, str, list[str]]] = {
    "4th-state-energies": ("Energy Storage", "Materials science / electrochemistry", "EV & Li-ion batteries", ["Decarbonization", "Domestic manufacturing"]),
    "aimm": ("Water", "Materials chemistry", "Wastewater treatment", ["Clean water", "Pollution remediation"]),
    "alkali-labs": ("Critical Minerals", "Biotechnology / sorbents", "Critical mineral recovery", ["Critical mineral supply", "Circular economy"]),
    "andros": ("Industrial Chemicals", "Catalysis / chemical engineering", "Ammonia & fertilizer", ["Decarbonization", "Domestic manufacturing"]),
    "anew-material": ("Advanced Materials", "Materials science", "Sustainable materials", ["Circular economy", "Decarbonization"]),
    "astral-materials": ("Semiconductors & Photonics", "Crystal growth / microgravity materials", "Semiconductors", ["Domestic manufacturing", "Space infrastructure"]),
    "bairitone-health": ("Biotech & Health", "Medical imaging / AI", "Diagnostics", ["Healthcare access"]),
    "biosimo-chemicals": ("Industrial Chemicals", "Chemical engineering / biotech", "Platform chemicals", ["Decarbonization"]),
    "biowraptor": ("Biotech & Health", "Biomaterials", "Biopharma cold chain", ["Healthcare access", "Decarbonization"]),
    "brightlight-photonics": ("Semiconductors & Photonics", "Photonics / lasers", "Scientific & industrial instruments", ["Scientific tooling"]),
    "calectra": ("Energy Storage", "Thermal storage / materials", "Industrial process heat", ["Decarbonization", "Energy access & resilience"]),
    "capillary-nanotechnologies": ("Advanced Materials", "Nanomaterials", "Advanced manufacturing", ["Domestic manufacturing"]),
    "carbide-radio": ("Semiconductors & Photonics", "Compound-semiconductor devices", "5G/6G telecom chips", ["Domestic manufacturing"]),
    "carbion": ("Critical Minerals", "Materials / chemical engineering", "Battery-grade graphite", ["Critical mineral supply", "Domestic manufacturing", "Decarbonization"]),
    "carbon-infuse": ("Carbon & Climate", "Materials chemistry", "Construction materials", ["Decarbonization", "Carbon removal", "Circular economy"]),
    "cellsius-bio": ("Biotech & Health", "Single-cell sensing", "Life-science tools", ["Scientific tooling", "Healthcare access"]),
    "chipadd": ("Computing & AI Infra", "Thermal / electronics", "Data-center cooling", ["Energy efficiency", "Decarbonization"]),
    "closed-composites": ("Recycling & Circular", "Composite materials", "Carbon-fiber recycling", ["Circular economy", "Decarbonization"]),
    "cobi": ("Quantum", "Quantum computing", "Computing", ["Scientific tooling"]),
    "coflux-purification": ("Water", "Photocatalysis / chemistry", "PFAS remediation", ["Pollution remediation", "Clean water"]),
    "daqus-energy": ("Energy Storage", "Organic electrochemistry", "Batteries", ["Decarbonization", "Energy access & resilience"]),
    "deep-anchor-solutions": ("Power & Grid", "Marine / civil engineering", "Offshore floating renewables", ["Decarbonization", "Energy access & resilience"]),
    "drul": ("Biotech & Health", "Microbiome / diagnostics", "Oral & chronic disease diagnostics", ["Healthcare access"]),
    "earthflow-ai": ("Carbon & Climate", "AI / computational simulation", "Subsurface energy & carbon storage", ["Decarbonization", "Scientific tooling"]),
    "edulis-labs": ("Advanced Materials", "Surface science / chemistry", "Consumer / cosmetics", ["Pollution remediation"]),
    "eeli-technology": ("Critical Minerals", "Electrochemistry", "Lithium extraction", ["Critical mineral supply", "Domestic manufacturing"]),
    "elateq-inc": ("Water", "Electrochemistry", "Water treatment", ["Clean water", "Pollution remediation"]),
    "elysia-creative-biology": ("Agriculture & Food", "Synthetic biology / agronomy", "Livestock feed", ["Decarbonization", "Sustainable food"]),
    "elysium-robotics": ("Robotics & Automation", "Actuators / materials", "Robotics", ["Labor & automation"]),
    "epitactic": ("Semiconductors & Photonics", "Integrated photonics / materials", "Optical communications & compute", ["Domestic manufacturing"]),
    "every-electric": ("Power & Grid", "Power electronics", "Grid flexibility / DER", ["Energy access & resilience", "Decarbonization"]),
    "exciplex-inc": ("Agriculture & Food", "Spectroscopy / photochemistry", "Food safety", ["Food safety", "Healthcare access"]),
    "expand-power-technologies": ("Power & Grid", "Power electronics", "Electrification", ["Energy access & resilience", "Decarbonization"]),
    "fast-metals-inc": ("Critical Minerals", "Metallurgy / chemistry", "Green critical minerals", ["Critical mineral supply", "Circular economy", "Decarbonization"]),
    "fermi-energy": ("Energy Storage", "Materials / electrochemistry", "EV battery cathodes", ["Decarbonization", "Domestic manufacturing"]),
    "flowcellutions": ("Power & Grid", "Diagnostics / software", "Energy-storage reliability", ["Energy access & resilience"]),
    "fourier": ("Advanced Materials", "Ceramics / materials", "High-power electronics", ["Domestic manufacturing", "Decarbonization"]),
    "gallox-semiconductors": ("Semiconductors & Photonics", "Power-semiconductor devices", "Power electronics", ["Decarbonization", "Domestic manufacturing"]),
    "gel-matter": ("Biotech & Health", "Biomaterials", "Biotech materials", ["Scientific tooling"]),
    "greenshoot-materials": ("Recycling & Circular", "Polymers / materials", "Food packaging", ["Circular economy", "Pollution remediation"]),
    "heliotrope-photonics-inc": ("Power & Grid", "Photonics / materials", "Solar", ["Decarbonization", "Energy access & resilience"]),
    "hit-nano": ("Energy Storage", "Materials / electrochemistry", "Battery cathode materials", ["Decarbonization", "Domestic manufacturing"]),
    "huminly": ("Recycling & Circular", "Enzyme / synthetic biology", "Textile recycling", ["Circular economy", "Pollution remediation"]),
    "hyperion-transport-systems-inc": ("Space", "Electric propulsion", "In-space propulsion", ["Space infrastructure"]),
    "hypermelt": ("Biotech & Health", "Microfluidics / genomics", "Diagnostics", ["Healthcare access", "Scientific tooling"]),
    "icarus-quantum": ("Quantum", "Quantum networking", "Quantum internet", ["Scientific tooling", "Security"]),
    "innate-energy": ("Energy Storage", "Mechanical energy storage", "Grid storage", ["Energy access & resilience", "Decarbonization"]),
    "intero-biosystems": ("Biotech & Health", "Stem-cell organoids", "Drug discovery & toxicology", ["Scientific tooling", "Healthcare access"]),
    "kira": ("Water", "Membrane / desalination", "Desalination", ["Clean water"]),
    "kytyra": ("Robotics & Automation", "Sensors / RF", "Counter-UAS / security", ["Security"]),
    "lagomics": ("Biotech & Health", "Computational biology / AI", "Biotech R&D", ["Scientific tooling"]),
    "leap-photonics": ("Semiconductors & Photonics", "Integrated photonics / LiDAR", "Robotics sensing", ["Domestic manufacturing", "Labor & automation"]),
    "lift-biolabs": ("Biotech & Health", "Bioprocessing", "Biotech tools", ["Scientific tooling"]),
    "lightfinder": ("Semiconductors & Photonics", "Photonics / spectroscopy", "Optical sensing", ["Scientific tooling"]),
    "lumistrain": ("Advanced Materials", "Nanomaterials / sensors", "Infrastructure monitoring", ["Infrastructure safety"]),
    "macrobreed": ("Agriculture & Food", "Marine biology / breeding", "Aquaculture / kelp", ["Sustainable food", "Decarbonization"]),
    "manifest-technologies": ("Robotics & Automation", "Additive / digital manufacturing", "On-demand manufacturing", ["Domestic manufacturing"]),
    "membravo": ("Advanced Materials", "Membrane science", "Industrial separations", ["Decarbonization", "Energy efficiency"]),
    "mithril-technologies-inc": ("Space", "Optics / space systems", "Space-based climate monitoring", ["Climate resilience", "Space infrastructure"]),
    "motibera-inc": ("Robotics & Automation", "Electric machines", "Industrial machinery", ["Decarbonization", "Domestic manufacturing"]),
    "nanoscale-labs": ("Advanced Materials", "Nanomanufacturing", "Advanced materials", ["Scientific tooling", "Domestic manufacturing"]),
    "netpreme": ("Computing & AI Infra", "Photonic computing", "AI supercomputing", ["Energy efficiency", "Domestic manufacturing"]),
    "newfound-materials": ("Advanced Materials", "Materials informatics / AI", "Energy materials", ["Scientific tooling", "Decarbonization"]),
    "nextglass-llc": ("Advanced Materials", "Glass / materials", "Building & construction", ["Decarbonization", "Energy efficiency"]),
    "nextset-materials": ("Recycling & Circular", "Composite materials", "Composites recycling", ["Circular economy", "Decarbonization"]),
    "oleo-sustainable-palm-oil-solutions": ("Agriculture & Food", "Bioprocessing", "Sustainable oils", ["Sustainable food", "Circular economy", "Decarbonization"]),
    "one-d-nano": ("Power & Grid", "Nanomaterials / catalysis", "Green hydrogen", ["Decarbonization", "Energy access & resilience"]),
    "orien-energy": ("Power & Grid", "Surface engineering / thermal", "Power-plant efficiency", ["Energy efficiency", "Decarbonization"]),
    "osmopure-technologies": ("Water", "Membrane / water engineering", "Clean water", ["Clean water", "Energy efficiency"]),
    "page-technologies": ("Agriculture & Food", "Sensors / ag-tech", "Precision agriculture", ["Sustainable food", "Pollution remediation"]),
    "phnx-materials": ("Carbon & Climate", "Materials chemistry", "Low-carbon cement & concrete", ["Decarbonization", "Circular economy"]),
    "plumajet": ("Advanced Materials", "Coatings / manufacturing", "Precision coatings", ["Domestic manufacturing", "Energy efficiency"]),
    "praio": ("Industrial Chemicals", "Synthetic biology", "Sustainable fuels & chemicals", ["Decarbonization"]),
    "rapid-radicals-technology": ("Water", "Chemical / water engineering", "Wastewater treatment", ["Clean water", "Pollution remediation"]),
    "raven-space-systems": ("Space", "Additive manufacturing / composites", "Aerospace manufacturing", ["Domestic manufacturing", "Space infrastructure"]),
    "reforge-robotics": ("Robotics & Automation", "Robotics software", "Precision manufacturing", ["Domestic manufacturing", "Labor & automation"]),
    "resolute-methane": ("Carbon & Climate", "Catalysis / chemistry", "Methane mitigation", ["Decarbonization"]),
    "retrn": ("Recycling & Circular", "Bio-derived materials", "Food packaging", ["Circular economy", "Decarbonization"]),
    "rhoic": ("Advanced Materials", "Nanofiber manufacturing", "Hydrogen fuel cells", ["Decarbonization", "Domestic manufacturing"]),
    "robotics-88": ("Robotics & Automation", "Autonomy / drones", "Wildfire resilience", ["Climate resilience"]),
    "roca-water": ("Water", "Electrochemistry / desalination", "Desalination", ["Clean water", "Energy access & resilience"]),
    "rstream": ("Recycling & Circular", "Robotics / AI", "Recycling automation", ["Circular economy", "Labor & automation"]),
    "semion": ("Agriculture & Food", "Chemical ecology / agronomy", "Crop protection", ["Sustainable food", "Pollution remediation"]),
    "sharp-diagnostics": ("Biotech & Health", "Molecular diagnostics", "Point-of-care diagnostics", ["Healthcare access"]),
    "sinkco-labs": ("Carbon & Climate", "Marine geochemistry", "Carbon removal", ["Decarbonization", "Carbon removal"]),
    "solidec": ("Industrial Chemicals", "Electrochemistry", "Commodity chemicals", ["Decarbonization", "Domestic manufacturing"]),
    "supercarb": ("Advanced Materials", "Bio-derived materials", "Sustainable fibers", ["Circular economy", "Decarbonization"]),
    "tatta-bio": ("Biotech & Health", "Genomics / AI", "Biotech R&D tools", ["Scientific tooling"]),
    "topolight": ("Semiconductors & Photonics", "Photonics / lasers", "Semiconductor lasers", ["Domestic manufacturing"]),
    "unspent": ("Recycling & Circular", "Bio-derived materials", "Plastics", ["Circular economy", "Decarbonization"]),
    "vectorwave": ("Computing & AI Infra", "Analog / RF computing", "Wireless & AI hardware", ["Energy efficiency", "Domestic manufacturing"]),
    "vertility-health": ("Agriculture & Food", "Plant biology / breeding", "Agriculture", ["Sustainable food"]),
    "wave-lumina": ("Water", "Sensors / chemistry", "PFAS detection & remediation", ["Pollution remediation", "Clean water"]),
}

# phnx-materials' scraped summary was mis-copied from Nanoscale Labs on the
# source site; its labels here come from the company's actual public profile.
LOW_CONFIDENCE = {"phnx-materials", "anew-material"}

STOP = set("the a an and or of to for with from into using that this their our we are is be as on in by at it its world more less than next generation high low cost using enables enable building builds develops developing make makes creating creates company technology technologies platform new novel".split())


def keywords(text: str, k: int = 6) -> list[str]:
    words = re.findall(r"[a-zA-Z][a-zA-Z\-]{3,}", text.lower())
    freq = Counter(w for w in words if w not in STOP)
    return [w for w, _ in freq.most_common(k)]


def llm_classify(company: dict) -> tuple | None:
    """Reproducible production path: classify one company via the Claude API.

    Used for companies not in the curated LABELS set when a key is available.
    Kept import-light so the offline path has no extra dependencies.
    """
    if not os.environ.get("ANTHROPIC_API_KEY"):
        return None
    from anthropic import Anthropic  # lazy import; only needed on the API path

    client = Anthropic()
    prompt = (
        "Classify this hard-tech startup for a science-discovery dataset. "
        f"Return JSON with keys domain (one of {list(DOMAINS)}), field, market, "
        f"impact (subset of {IMPACT_TAGS}).\n\n"
        f"Name: {company['name']}\nSummary: {company['summary']}\n"
        f"Description: {company['description'][:1500]}"
    )
    msg = client.messages.create(
        model="claude-opus-4-8",
        max_tokens=400,
        messages=[{"role": "user", "content": prompt}],
    )
    data = json.loads(re.search(r"\{.*\}", msg.content[0].text, re.S).group())
    return (data["domain"], data["field"], data["market"], data["impact"])


def main() -> None:
    companies = json.loads(IN.read_text(encoding="utf-8"))
    enriched, unlabeled = [], []
    for c in companies:
        label = LABELS.get(c["slug"])
        if label is None:
            label = llm_classify(c)
        if label is None:
            unlabeled.append(c["slug"])
            continue
        domain, field, market, impact = label
        enriched.append({
            **c,
            "domain": domain,
            "field": field,
            "market": market,
            "impact": impact,
            "keywords": keywords(f"{c['summary']} {c['description']}"),
            "low_confidence": c["slug"] in LOW_CONFIDENCE,
        })

    OUT.write_text(json.dumps(enriched, indent=2, ensure_ascii=False), encoding="utf-8")
    print(f"Wrote {len(enriched)} enriched companies -> {OUT.relative_to(ROOT)}")
    if unlabeled:
        print(f"  UNLABELED ({len(unlabeled)}): {unlabeled}")
    print("\nDomain distribution:")
    for dom, n in Counter(e["domain"] for e in enriched).most_common():
        print(f"  {n:>3}  {dom}")
    print("\nTop impact areas:")
    impacts = Counter(i for e in enriched for i in e["impact"])
    for imp, n in impacts.most_common(8):
        print(f"  {n:>3}  {imp}")


if __name__ == "__main__":
    main()
