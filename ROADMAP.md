# Activate Frontier Map

A data system that maps Activate Global's fellow ventures — their science,
their industries, and their potential impact — and future-casts where the
frontier of hard tech is heading.

This is a working prototype of the three responsibilities in Activate's
*deep-tech founder discovery* role:
1. **Talent engine** — a rigorous, structured view of the fellow pipeline.
2. **Insight & strategy** — turn pipeline data into a read on the frontier.
3. **Productize the pipeline** — a shareable, data-rich decision-support tool.

## Architecture

```
pipeline/ (Python)   scrape -> clean -> enrich -> build store
   data/processed/    versioned JSON dataset (canonical, read-only)
web/ (Next.js)        static-exported, beautiful, deployed via public link
```

Read-only static site = near-zero attack surface, fast, cheap to host.
Secrets (LLM key) live only in the pipeline and never reach the client.

## Data source (authoritative)

Activate's `activate-companies` directory is a **Softr app over an Airtable
base**. Its data proxy ignores `offset`, so we harvest via headless Chrome
(`pipeline/harvester/harvest.mjs`) — **224 companies, cohorts 2015–2025**, with
Activate's own fields: 16 **Verticals**, **Community** (hub), **Cohort Year**,
**Fellow(s)**, and human-written **Critical Need / Technology Vision /
Potential Impact**. This supersedes the page-scraper as the spine.

Pipeline: `harvest.mjs → build.py → companies.json + taxonomy.json`.
(The older `scrape/clean/enrich/cohort` chain is kept only for the company
website / LinkedIn links it recovered.)

## Status

- [x] **Stage 1 — Ingest** (`scrape.py`). Enumerate sitemap, fetch detail
      pages, extract title/summary/body/links. → `01_raw_records.json`
- [x] **Stage 2 — Clean** (`clean.py`). Filter to genuine fellow ventures,
      strip boilerplate, normalize. → **96 companies** in `02_companies.json`
- [x] **Stage 3 — Enrich** (`enrich.py`). Each company classified by domain
      (15-sector taxonomy), research field, target market, impact tags, and
      auto-extracted keywords. → **93 companies** in `03_enriched.json`.
      Reproducible Claude-API path included for future/unlabeled companies.
- [x] **Stage 4 — Cohort linkage** (`cohort.py`). Match companies against
      per-year cohort announcement posts. → **89/93** have cohort_year
      (mostly 2024–2025; sitemap only exposes recent portfolio). Hub partial
      (10/93). → `04_with_cohort.json`
- [ ] **Stage 5 — Canonical store**. Build SQLite/DuckDB + denormalized JSON
      for the frontend.
- [ ] **Stage 6 — Frontend**. Next.js + Tailwind + shadcn/ui. Views: domain
      treemap, cohort timeline, research→industry graph, impact metrics,
      searchable company directory.
- [~] **Stage 7 — Signal layers** (`pipeline/signals/`).
  - [x] **Outcomes ledger** (`funding.py`, `run_outcomes.py`) → `outcomes.json`.
        NSF + EDGAR across all 224. **$58.8M NSF non-dilutive, 74/224 (33%)
        funded; 59 with SEC Form D mentions.** SBIR all-agency = next (backoff).
  - [x] **Founder footprint** (`scholar.py`). OpenAlex, field/domain-aware
        disambiguation. Resolves fellow → works, citations, h-index, and
        **pre-founding research topics** (leading frontier signal). Generic
        names need ORCID/institution cross-check for production precision.
  - [ ] Run founder footprint + field publication-velocity across portfolio.
  - [ ] **Frontier Radar**: internal presence × external momentum → whitespace.
  - Principle: normalize every internal metric against the FIELD (base rates,
    field-normalized citations) — the field is the denominator.
- [ ] **Stage 8 — Deploy**. Vercel public link.

## Known data notes

- Person/staff pages are JS-rendered shells — not reliably scrapable. Founders
  will be linked via the directory API or LinkedIn in a later pass.
- Cohort year + hub are not on company detail pages; need a secondary source.
- The public Softr/Airtable directory returns 224 companies (re-harvested
  2026-06-24, unchanged). Activate's 2025 marketing cites ~235 total on a broader
  basis (ventures not in the public directory), so 224 is the complete directory,
  not the full marketing roster.

## Run

```bash
python -m venv .venv && . .venv/bin/activate
pip install -r pipeline/requirements.txt
python pipeline/scrape.py   # ingest (caches raw HTML in data/raw/)
python pipeline/clean.py    # canonical company dataset
```
