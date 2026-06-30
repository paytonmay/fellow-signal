# Proposal: The Sourcing Radar

Status: draft for review
Author: Payton May
Context: Fellow Signal (fellowsignal.xyz), an independent analysis of Activate's fellowship and the deep-tech founder frontier.

---

## 1. One-liner

Stop treating publication data as "field momentum + founder depth" and turn it into a **sourcing graph**: topics → labs → authors → institutions → funders → timing. The product: pick a research area and see **where to look, who to watch, why now, and what evidence says it is becoming venture-ready.** This is the part the rest of the site only sets up: not "what is happening at the frontier," but "who do I call on Monday."

## 2. Why this is the strongest direction

Every other layer (radar, emerging science, the simulator) answers *what* is moving. Sourcing answers *who*, and that is the core of Founder Discovery. It is also the deepest, most defensible thing public data can do here: OpenAlex exposes authors, institutions, coauthorship, topics, and timing, which is exactly the raw material of a recruiting map.

## 3. The honest feasibility triage (with our data)

OpenAlex (free, ~250M works, authors/institutions/topics/citations/dates) + USAspending + the Activate corpus. Not all ten ideas are equally feasible. Triaged:

**Tier 1, build now (clean OpenAlex queries):**
- **#3 Lab hotspot map.** Group recent works on a topic by institution, scoped to US authors. *Proven:* electrocatalysis returns MIT, LBNL, Argonne, Stanford, UT Austin, Cornell; direct air capture returns Oak Ridge, Georgia Tech, NETL, MIT. Immediately a recruiting list.
- **#9 Research-to-funding mismatch** and **#5 orphan-breakthrough watchlist.** We already cross OpenAlex research momentum with USAspending funding momentum and Activate presence in the Emerging Science panel. The "orphan" cut (high research, low funding, low Activate presence) is one filter away.
- **#8 Technical-bottleneck miner.** Tally bottleneck words (stability, yield, selectivity, degradation, cost, throughput, toxicity) across a topic's recent titles/abstracts. Clean keyword pass; names the company-thesis territory.

**Tier 2, feasible but data-heavy crawls:**
- **#6 Coauthor-network scouting.** Seed from our ~112 resolved Activate founders, pull their works, surface second-degree coauthors in adjacent hot topics. Powerful (turns the founder corpus into a sourcing network) but a real per-author crawl.
- **#2 Citation velocity, not volume.** Early-career authors whose last 2-3 papers cite unusually fast for their field. Needs per-author recent-work citation rates + career stage; the right signal, but heavy and namesake-prone.
- **#4 Boundary-spanner detection.** Authors publishing across two rarely-overlapping topic clusters (materials + biology, cement + electrochemistry). Per-author topic-pair analysis; moderate.

**Tier 3, partial / modeling:**
- **#1 Founder-readiness signal.** Translation-language shift (prototype, scale-up, pilot, techno-economic) is easy at the *topic* level, harder and noisier per *author*.
- **#7 Paper-to-company latency.** We can compute the historical lag distribution per vertical from our own `years_to_founding`. Forward-flagging "2 years pre-formation" topics is more speculative and should be labeled as such.

**The synthesis:**
- **#10 Reviewer packet = the Sourcing Radar itself.** Per area: hot US labs, rising authors, funding trend, Activate presence, bottlenecks, "why now." Composes Tier 1 immediately; Tiers 2-3 enrich it.

## 4. Honest constraints (must be designed in)

- **Geography.** Global lab rankings point at institutions Activate does not recruit from (the raw electrocatalysis top is Chinese Academy of Sciences, Tsinghua, CNRS). **Scope to US-authored work**, and even then filter co-authored foreign institutions out of the displayed list. The US scope is a feature, not a limitation, for a US fellowship.
- **Keyword topic matching** is noisy; trust the ranking, not the exact counts, and show the query.
- **Author disambiguation.** "Rising author" detection inherits the namesake/career-stage problems we already guard against in the founder resolver; the same precision guards apply, and more.
- **No contact data, and that is correct.** This surfaces public scientific signal (papers, labs, topics). It is a *map of where to look*, not a contact list, and explicitly not a ranking of people by predicted quality, the same line the simulator draws.
- **It informs sourcing, it does not gate it.** Same mission caveat: widen discovery, never narrow it; no identity-demographic inference.

## 5. The MVP (Phase 1)

A `/radar` page: a dropdown of research areas (seeded from the Emerging Science topics). Pick one, get a **reviewer packet**:
- **Where to look:** top ~8 US labs/institutions by recent applied output (Tier 1, #3).
- **Why now:** research momentum (OpenAlex) and federal-funding momentum (USAspending) for the area, plus the "orphan" flag if science is ahead of funding (#9, #5).
- **What's hard:** the top recurring technical bottlenecks from recent abstracts (#8).
- **Where Activate stands:** present / whitespace, from our existing cross.
- A one-paragraph **"why now" synthesis** generated from the above.

That is a self-contained, genuinely useful sourcing tool built almost entirely from Tier 1, and it proves the concept before any heavy crawl.

## 6. Pipeline additions

- `pipeline/signals/sourcing.py`: per-area OpenAlex queries for US lab hotspots + bottleneck terms, cached to `data/processed/sourcing.json` (one packet per emerging area). Reuses the federal momentum we already compute. Monthly-refreshable.
- No new sources; just deeper use of OpenAlex's author/institution dimensions.

## 7. Phasing

- **Phase 1:** the `/radar` reviewer packet from Tier 1 (lab hotspots + funding/why-now + bottlenecks + Activate presence). Ships the concept.
- **Phase 2:** coauthor-network scouting (#6) seeded from Activate founders, and citation-velocity rising-author detection (#2), the two that turn the map into named candidates. Gated on disambiguation rigor.
- **Phase 3:** boundary-spanner (#4), founder-readiness per author (#1), latency model (#7).

## 8. Open questions for reviewers

1. Is the **US-only scope** right, or does Activate Anywhere pull from specific non-US populations worth including?
2. For "rising author," what career-stage definition matters (years since first paper, total works, last-author vs first-author)?
3. Which bottleneck vocabulary actually maps to fundable company theses, versus generic hedging language?
4. Should the packet ever name *individuals*, or stop at labs/institutions to stay on the right side of "map, not scorecard"? (Leaning labs-only for Phase 1.)
5. How does Activate weight "science ahead of the ecosystem" (orphan breakthroughs) versus areas with proven funding pull?
