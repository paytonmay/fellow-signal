# Fellow Signal

An intelligence layer on [Activate Global](https://activate.org)'s fellowship —
**224 hard-tech ventures (2015–2025)** mapped by science, industry, and impact,
then read against where research and funding are actually moving.

**Live:** https://web-three-beryl-78.vercel.app

Built as an independent analysis / working prototype for the *Head of Scientific
Founder Discovery & Insights* role.

## What it does

- **Frontier Radar** — each field's research momentum (its growing share of
  global publications) × Activate's presence in recent cohorts → whitespace.
- **Outcomes ledger** — every venture matched to public funding records:
  **$58.8M** in NSF non-dilutive funding, 33% of the portfolio federally funded,
  plus SEC Form D raises.
- **Founder footprint** — fellows resolved to their actual body of work
  (OpenAlex), surfacing the pre-founding research that foreshadows the venture.
- **Cohort drift + searchable portfolio** of all 224 ventures.

## Architecture

```
pipeline/ (Python)
  harvester/harvest.mjs   headless harvest of Activate's Softr/Airtable directory
  build.py                -> data/processed/companies.json (canonical, 224 cos)
  signals/                NSF + SEC EDGAR (outcomes), OpenAlex (founders + fields)
  build_web.py            -> web/data/dataset.json
web/ (Next.js, static export)   the dashboard — custom SVG charts, no chart lib
```

Static export → no backend, minimal attack surface. Data: Activate's public
directory, NSF Awards API, SEC EDGAR, OpenAlex. Momentum/whitespace figures are
directional — trust the ranking over exact magnitudes. See `ROADMAP.md` and
`docs/research-backlog.md`.
