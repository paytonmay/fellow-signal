# Proposal: The Selection Simulator ("Picking 50 from 1,000")

Status: draft for review
Author: Payton May
Context: Fellow Signal (fellowsignal.xyz), for the deep-tech founder discovery role at Activate.

---

## 1. One-liner

An interactive page that simulates the core act of the role: looking at ~1,000 applicants and choosing ~50. ~1,000 dots clustered by sector, each carrying real-world signals; a set of weights, strategy dials, manual overrides, and a stakeholder-vote layer that reshape the chosen cohort in real time. The point is not the toy: it is to make visceral that **there is no objective best 50, only a strategy made explicit.**

## 2. Why this, and why it fits the role

Every other panel on the site analyzes the **output** of selection (the accepted cohorts). This is the only one that models the **selection function itself**, the literal job. It also connects directly to the real funnel we surfaced: Activate draws **~900-1,040 applicants per cohort and accepts ~50 (~5%)**, growing ~30%/yr since 2015 ([sources in the brief]). The simulator puts the reviewer inside that 1,000 → 50 decision.

It extends the "close the selection loop" pillar from a static scorecard into a working instrument: weights in, a cohort out, the trade-offs visible.

## 3. The integrity principle (non-negotiable)

The whole project's credibility is "real public data, honest about its limits." A page of invented applicants must not read as a claim about real people. Two rules:

1. **Synthetic applicants, real signal structure.** Each dot is a realistic draw, not arbitrary:
   - **Sector** sampled from the real cohort/sector mix.
   - **Field signals inherited from real data** — an "Energy Storage" applicant carries energy storage's actual research momentum (×4.5), federal funding momentum (×15), and lead agency (DOE), straight from our radar + space_signals layers.
   - **Founder signals** (citations, h-index, years paper→founding) sampled from the **real distribution of our 112 resolved founders**.
   - **Hub** sampled from the real geographic mix.
2. **Labeled prominently:** "Illustrative model. Synthetic applicants drawn from real signal distributions to show how a weighted selection function behaves. Not real applicant data."

This reframes "made-up data" as "a working demonstration of the methodology," which is a strength, not a liability.

## 4. Signals each synthetic applicant carries

| Signal | Source (real distribution) | Per-applicant draw |
| --- | --- | --- |
| Sector / vertical | real cohort sector mix | categorical |
| Field research momentum | `radar.field_momentum` | inherited from sector |
| Field funding momentum | `space_signals.federal_momentum` | inherited from sector |
| Lead funding agency | `space_signals.top_agencies` | inherited from sector |
| Field convergence (cross-disciplinary) | real convergence pairs | 1-3 sectors per applicant |
| Founder research depth | resolved-founder citation/h-index distribution | sampled |
| Career timing (yrs paper→found) | resolved-founder latency distribution | sampled |
| Hub / geography | real hub distribution | categorical |
| Whitespace flag | sector's Activate presence | derived |

## 5. Controls (the heart of it)

Four tiers, increasing in fidelity to how committees actually work.

### Tier A — Signal weights (the base model)
Sliders for each signal's contribution to a composite score: field research momentum, field funding momentum, founder research depth, discipline fit, convergence (reward cross-disciplinary), geographic spread, whitespace bonus. Composite = normalized weighted sum. Top-N selected.

### Tier B — Strategy dials (Activate's posture for the year)
Knobs that encode institutional strategy, not per-signal weights:
- **Sector lean / target.** Bias toward (or set a soft floor for) a chosen sector. "Double down on climate this cohort."
- **Risk dial.** A spectrum from **proven** (established fields, high-citation founders, high funding momentum) to **frontier** (emerging/whitespace fields, earlier-career founders, lower proven signal). Shifts the whole selection bolder or safer. *Open question: what does "risk" mean to Activate, exactly? See §10.*
- **Diversity vs concentration.** Spread the cohort across many sectors/hubs, or concentrate the bets.
- **Cohort size.** 40 / 50 / 60 — see how the marginal picks change.
- **Geographic strategy.** Favor a hub, maximize spread, or lean into Activate Anywhere (distributed).
- **Stage timing.** Favor founders close to incorporation vs earlier-stage scientists.

### Tier C — Manual per-applicant weight (the human-in-the-loop)
The model is a *starting screen, not a verdict* (consistent with the Selection scorecard's framing). Real selection adds judgment the data can't see: a deep research insight, a standout interview, a reference, raw conviction. So:
- Click any applicant to apply a **manual conviction adjustment** (+/-), a "diligence boost" or "concern flag."
- Watch it ripple: do they make the cut, and who falls out to make room?
- This models the truth that the model ranks and humans decide. It is also a teaching moment: a few manual boosts can quietly reshape a cohort, which is exactly why the override needs to be visible and accountable.

### Tier D — Stakeholder voting (the democratic layer)
Selection committees are not single optimizers; they are several value functions negotiating. Model that:
- **N stakeholders**, each with their own weight profile (e.g., "the chemist," "the climate partner," "the commercialization lead").
- **Aggregate** their preferences into a consensus cohort, with selectable rules:
  - *Average* — blend everyone's weights.
  - *Champion* — any single stakeholder can pull one borderline candidate in (committees really work this way; a passionate advocate saves a candidate the score wouldn't).
  - *Veto* — a stakeholder can block a candidate.
- **Real-time:** as a stakeholder adjusts their profile or champions someone, the consensus cohort updates live.
- This demonstrates a genuine understanding of how selection actually happens, as a social process, not a spreadsheet.

## 6. Live outputs

As any control moves, a panel updates in real time:
- **Cohort composition**: sector mix, hub mix, median founder citations, % in whitespace sectors, % cross-disciplinary.
- **What changed**: who entered, who fell out on the last adjustment.
- **Scenario save & compare**: save weight/strategy profiles ("Climate-forward," "Risk-on frontier," "Balanced") and diff the resulting cohorts side by side.

## 7. The core insight it makes visceral

There is no objective best 50. **Every configuration encodes a strategy.** Crank funding momentum → an energy/climate-heavy cohort. Crank research depth → a publication-heavy cohort. Crank whitespace + risk → a frontier-betting cohort. The job isn't optimizing a number; it's choosing which cohort you want, and being able to say why. Watching the cohort reshape as you drag a slider lands that in a way no memo can.

## 8. Bias & fairness considerations (mission-critical)

- We deliberately do **not** model or infer identity demographics; signals are scientific and career depth only.
- But the tool should be **honest about second-order bias**: weighting "citations" heavily can systematically favor candidates from well-resourced labs. A useful feature is to make that visible — "watch what your weighting does to the composition" — turning the simulator into a bias-awareness instrument, not just a picker.
- The manual-override and voting layers must be **transparent** (every boost/veto is logged and shown), because that is where unaccountable bias usually enters real committees.

## 9. Technical approach

- New `/simulator` route (static page, same stack: Next.js + SVG/Canvas + TS).
- **Canvas** for the ~1,000-node field (SVG is fine up to ~1k but Canvas is safer for smooth slider drags).
- Deterministic synthetic generation seeded once at build (or seeded client-side) so results are reproducible and don't reshuffle on every render. Drawn from the real per-sector and founder distributions already in `dataset.json`.
- Pure-function scoring engine: `score(applicant, weights, strategy, manualAdj, stakeholders) -> number`; recompute + re-rank on every control change (1k items is trivial).
- No backend; all client-side and shareable via URL-encoded config (so a saved scenario is a link).

## 10. Open questions for reviewers

The point of circulating this:
1. **What does "risk" mean to Activate?** Career stage, field maturity, thesis-fit distance, portfolio variance? This drives the risk dial's definition.
2. **What signals matter that we are NOT capturing?** (Team composition, prior startup experience, customer pull, capital efficiency, mission alignment...)
3. **How does the real committee actually decide?** Scoring rubric, consensus, champion model, partner veto? We should mirror the real mechanism, not invent one.
4. **Hard constraints vs soft weights?** Should there be firm rules (min N per hub, sector caps, a diversity floor) alongside the soft scoring?
5. **Is the stakeholder-vote layer realistic or a gimmick?** Worth building, or does it overcomplicate the core message?
6. **Fairness:** how much to foreground the bias-awareness framing without overstepping?
7. **Counterfactual / backtest** (future): replay a real past cohort, seed the field with the actual accepted founders plus a synthetic rejected pool, and test whether a given weighting would have re-selected the real cohort. High-value, higher-effort. In scope, or phase 2?

## 11. Suggested phasing

- **Phase 1 (MVP):** the 1,000-node field + Tier A signal weights + live composition readout + the "no objective best 50" framing. Proves the concept.
- **Phase 2:** Tier B strategy dials + scenario save/compare.
- **Phase 3:** Tier C manual override + Tier D stakeholder voting.
- **Phase 4 (optional):** counterfactual backtest against a real cohort.

Ship Phase 1 first, gather reaction, then layer up. Each phase is independently valuable.
