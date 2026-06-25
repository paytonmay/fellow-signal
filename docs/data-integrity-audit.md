# Data Integrity Audit

Audit date: 2026-06-24

Scope: `data/processed/*.json`, `web/data/dataset.json`, the pipeline scripts that produce them, and user-facing claims in README/docs/pages/components. I did not change any data or app code.

## Resolution status (actioned 2026-06-24)

**Fixed:**
- #2 Discarded company websites — `build.py` link parser now captures external company sites; websites went 72 → 202 / 224.
- #8 Quoted fellow company names — `build_fellows.py` strips wrapping quotes; fellow-profile joins now 224/224, zero unmatched.
- #4 Form D count — ROADMAP updated 48 → 59 (SEC Form D mentions).
- #5 NSF vs federal reconciliation — documented in Methods as an entity-matched lower-bound estimate; a regression check is now in `pipeline/validate.py`.
- #6 / #1 Funding + coverage language — README and Methods reframe 224 as a public-directory snapshot (Activate now lists ~235), distinguish $227.2M all-agency federal (46%) from $58.8M NSF (33%).
- #11 Founder sample sizes — Methods/Brief/Findings now use "112 resolved founders across 100 companies" (89 in the citation-depth split).
- #12 University concentration — `FellowBackground.tsx` corrected from "roughly half" to "nearly a third".
- #13 Mutable OpenAlex size — "~250M works" replaced with "large open scholarly index".
- #14 "Verified exactly" — federal total reclassified as an entity-matched public-record estimate; "verified to the number" reserved for internal recomputes.
- Added `pipeline/validate.py` (parse, dup-name/id, federal reconciliation, nsf>federal, empty-vertical, fellow-join checks).

**Deferred (need a re-harvest or external data not yet machine-readable):**
- #1 / #3 Re-harvest the directories to current counts (~235 companies / ~294 fellows). Framed honestly as a snapshot in the meantime.
- #7 FY2024 financials — ProPublica's *structured* API (`filings_with_data`) still stops at FY2023, so the pipeline correctly returns 7.2× (FY2019→2023); FY2024 will flow in once ProPublica extracts it.
- #9 Alva Energy / Loamist missing verticals, #10 hybrid "New York, Boston" hubs — flagged by `validate.py`; both await the re-harvest / a normalization decision.



## Sources Checked

- Activate homepage: https://activate.org/
- Activate Fellowship page: https://activate.org/the-fellowship
- Activate 2025 Annual Impact Report post: https://activate.org/news/2025-annual-impact-report
- Activate communities page: https://activate.org/communities
- ProPublica Nonprofit Explorer for Activate Global Inc, EIN 47-5502184: https://projects.propublica.org/nonprofits/organizations/475502184
- Local generated data: `data/processed/*.json` and `web/data/dataset.json`

## Clean Checks

- All processed JSON files parse successfully.
- `data/processed/00_airtable_raw.json`, `data/processed/companies.json`, `data/processed/outcomes.json`, `data/processed/federal_outcomes.json`, `data/processed/founders.json`, and `web/data/dataset.json` are internally aligned at 224 company records.
- `web/data/dataset.json` headline values recompute exactly from its company rows:
  - 224 companies
  - 2015-2025 cohorts
  - $58,813,059 NSF total across 74 companies
  - $227,238,504 all-agency federal assistance total across 102 companies
  - 59 companies with SEC Form D mentions
  - 16 verticals
  - 6 raw hub values
  - 267 unique fellow names from company records
- There are no duplicate canonical company names or company IDs in `data/processed/companies.json`.
- The 2024 to 2025 cohort shift claims in `web/app/brief/page.tsx` are internally correct:
  - Climate: 1/50 in 2024 = 2%; 12/38 in 2025 = 32%.
  - Electronics & Connectivity: 4/50 in 2024 = 8%; 9/38 in 2025 = 24%.
- The selection-loop rates in `web/app/findings/page.tsx` are internally correct:
  - Above-median founder citations: 17/45 funded = 37.8%.
  - Below-median founder citations: 16/44 funded = 36.4%.

## Update Items

### 1. Refresh public Activate impact counts

Current repo/data snapshot:
- `README.md` and the app present 224 ventures.
- `data/processed/fellows.json` has 292 fellows.
- `notes.txt` still says 197 companies, $4B follow-on funding, and 2,800 jobs.

Current Activate public site says:
- 294 fellows supported, $5.5B follow-on funding, and 3,000 jobs on the homepage.
- 294 scientists and 235 hard-tech science companies on the Fellowship page.
- 235+ ventures and about 300 fellows in the 2025 annual impact report post.

Recommended update:
- Treat `224` as "public directory records in this harvest", not "all Activate companies".
- Re-harvest the company and fellow directories to see whether the current public directory now returns 235 companies and 294 fellows.
- Update `notes.txt:6`, `README.md:4`, `README.md:21`, `ROADMAP.md:28`, `ROADMAP.md:75`, `web/app/methods/page.tsx:48-49`, and app copy that implies complete coverage.

### 2. Fix discarded company websites from the Airtable Link field

`pipeline/build.py` assumes the Airtable `Link` field only contains Activate profile URLs. That is not true for 130 of 224 raw rows. Those 130 rows contain external company websites, and all 130 are currently discarded into blank `website` fields.

Evidence:
- `pipeline/build.py:43-48` only parses `https://activate.org/...`.
- Raw records contain 94 Activate URLs and 130 external URLs.
- `data/processed/companies.json` has 152 missing websites, including the 130 external links that already exist in raw data.

Recommended update:
- Change `parse_link` to return both an Activate profile URL when host is `activate.org` and an external website URL otherwise.
- Populate `website` from raw external `Link` before falling back to scraped `02_companies.json`.
- Update the comment at `pipeline/build.py:4-7`, which currently says the Airtable Link field points at Activate profiles, not company sites.

### 3. Reconcile official portfolio size vs harvested portfolio size

The canonical dataset is internally consistent at 224 companies, but Activate currently publishes 235 companies on its Fellowship page. That is an 11-company gap if the goal is current total coverage.

Recommended update:
- Re-run `pipeline/harvester/harvest.mjs` against the current companies directory.
- If the public directory still returns 224, document the dataset as a public-directory subset and avoid "all companies" phrasing.
- If it returns 235, rebuild `companies.json`, `taxonomy.json`, all outcome layers, and `web/data/dataset.json`.

### 4. Update Form D count in docs

`web/data/dataset.json` and `data/processed/outcomes.json` currently show 59 companies with SEC Form D mentions. `ROADMAP.md:58-59` still says 48.

Recommended update:
- Change `48 with Form D raises` to `59 with SEC Form D mentions`, or derive this number from `dataset.headline.formd` in user-facing pages.
- Keep "mentions" wording unless each hit is entity-reviewed, because EDGAR full-text search can include false positives.

### 5. Fix NSF vs federal-total reconciliation

The app treats `federal_total` as all-agency federal non-dilutive funding, but 11 companies have `nsf_total > federal_total`. Eight of those have NSF awards but zero all-agency federal total:

- KIRA
- RETRN
- LumiStrain, Inc.
- rStream
- Pascal
- Tyfast
- AeroShield
- Brimstone

Three more have lower all-agency federal totals than NSF totals:

- AsimicA
- Soctera
- FLO Materials

Recommended update:
- Decide whether `federal_total` should be the source of truth or should be `max(USAspending assistance total, NSF Awards API total)` per company.
- If USAspending remains the source of truth, explain why NSF API awards are excluded for these companies.
- Add a reconciliation check to `pipeline/build_web.py` so this cannot silently regress.

### 6. Update stale/ambiguous federal funding language

`README.md:16-18` says "$58.8M in NSF non-dilutive funding, 33% of the portfolio federally funded". In the current dataset:

- 74/224 = 33.0% are NSF-funded.
- 102/224 = 45.5% have all-agency federal assistance funding.

Recommended update:
- If referring to NSF, say "33% NSF-funded".
- If referring to all federal assistance, say "46% federally funded" and use the $227.2M federal total.

### 7. Refresh Activate financials through FY2024

`data/processed/funder_model.json` stops at FY2023:

- FY2023 revenue: $26,734,894
- FY2023 expenses: $19,015,079
- FY2023 net assets: $24,179,809
- FY2019 to FY2023 revenue growth: 7.2x

ProPublica now has FY2024 extracted Form 990 data:

- FY2024 revenue: $23,823,486
- FY2024 expenses: $23,553,752
- FY2024 net assets: $24,570,535
- FY2019 to FY2024 revenue growth: about 6.4x

Recommended update:
- Re-run `pipeline/signals/funder_model.py`.
- Update `web/app/methods/page.tsx:72`, `web/app/methods/page.tsx:83-86`, `web/app/brief/page.tsx:86-90`, `web/app/findings/page.tsx:98-100`, and `web/app/components/FunderModel.tsx`.
- Consider noting that FY2025 has an audit document on ProPublica but no extracted Form 990 financial data yet.

### 8. Fix fellow-profile joins with quoted company names

Five fellow rows fail to attach to their company cards because `build_fellows.py` preserves literal quotation marks in `Fellow Company`:

- Jessica Frick -> `"Astral Materials, Inc."`
- Jiya Janowitz -> `"Astral Materials, Inc."`
- Juanjuan Zheng -> `"Cellsius, Inc."`
- Lily Rajic -> `"Elateq, Inc."`
- Wei Meng -> `"LumiStrain, Inc."`

Recommended update:
- Normalize `company` in `pipeline/build_fellows.py:127-132` by stripping wrapping quotes.
- Rebuild `fellows.json` and `web/data/dataset.json`.
- This should reduce `canonical companies no fellow_profiles join` from 4 to 0.

### 9. Handle companies with missing verticals and narrative fields

Two canonical company rows have no verticals:

- Alva Energy
- Loamist

Also, 56 company rows are missing all three narrative fields: `critical_need`, `technology_vision`, and `potential_impact`.

Recommended update:
- For Alva Energy and Loamist, either recover missing Activate verticals from a refreshed directory harvest or manually mark them as unknown/excluded from vertical calculations.
- For the 56 rows missing narrative text, make the site copy explicit that narrative fields are available only where Activate's directory provides them.

### 10. Represent hybrid hub values consistently

The raw taxonomy has six hub values because three companies are `New York, Boston`:

- Tatta Bio
- Still Bright
- Thalo Labs

But `pipeline/build_web.py:129` hard-codes the Hub Atlas to five hubs: Berkeley, Boston, New York, Houston, Anywhere. The dashboard hub filter uses `data.hub_atlas.hubs`, so the hybrid hub cannot be selected directly.

Recommended update:
- Decide whether hybrid hubs should be split across both hubs, shown as their own filter option, or normalized to a primary hub.
- Update `pipeline/build_web.py:129`, `web/app/components/Dashboard.tsx:94-97`, and any hub-specialization text accordingly.

### 11. Clarify founder-profile sample sizes

Current data has:

- 112 resolved OpenAlex founder records.
- 100 companies with at least one resolved founder.
- 89 companies with positive founder citation counts used in the selection-loop split.

Some copy says "~90 resolved profiles" while other copy says "~100/224 companies resolved".

Recommended update:
- Use "100 profiled companies" for company-level coverage.
- Use "112 resolved founder records" for founder-level descriptive stats.
- Use "89 companies with positive citation counts" for the selection-loop analysis.
- Update `web/app/brief/page.tsx:110-116`, `web/app/findings/page.tsx:131-137`, and `web/app/methods/page.tsx:65-67`.

### 12. Correct university concentration wording

The current parsed university data:

- 292 fellows total.
- 267 fellows with at least one parsed university.
- 438 total university mentions.
- MIT, UC Berkeley, and Stanford total 127 mentions.

That means the top three are:

- 29.0% of all university mentions.
- 47.6% of fellows with at least one parsed university, if counted against people rather than total mentions.
- 43.5% of all fellows.

Recommended update:
- `web/app/findings/page.tsx:60-62` is defensible if it says "nearly a third of university mentions".
- `web/app/components/FellowBackground.tsx:57-58` is not defensible as written because it says "roughly half of all university mentions". Change it to "nearly a third of all university mentions" or "nearly half of fellows with a parsed university".

### 13. Avoid hard-coding mutable source-size claims

`web/app/methods/page.tsx:51` says OpenAlex has "~250M works". That number changes over time and should not be material to the analysis.

Recommended update:
- Replace with "public API; large open scholarly index" unless the build fetches and stores the current OpenAlex `meta.count`.

### 14. Tighten wording around "verified exactly"

`web/app/methods/page.tsx:81-86` says several values are "verified to the number", including the federal total and top recipients. That overstates the certainty because the pipeline uses exact recipient-name matching, a $25M per-award cap, keyword queries for space-level funding, and currently has NSF-vs-USAspending reconciliation gaps.

Recommended update:
- Reserve "verified to the number" for internally recomputed values from a chosen source.
- Use "recomputed from the pipeline source" or "entity-matched public-record estimate" for funding totals.

## Suggested Fix Order

1. Refresh company/fellow harvests and finance data.
2. Fix the `Link` parser so the 130 already-harvested company websites are not discarded.
3. Normalize quoted fellow company names.
4. Reconcile NSF API awards with USAspending federal totals.
5. Rebuild `companies.json`, `fellows.json`, signal layers, and `web/data/dataset.json`.
6. Update stale user-facing copy and docs after the rebuilt numbers settle.
7. Add a small validation script that fails on:
   - JSON parse errors
   - duplicate company names/IDs
   - `nsf_total > federal_total` unless explicitly waived
   - company rows with no vertical
   - fellow company names that do not join to any canonical company after normalization
   - docs/pages containing stale hard-coded counts
