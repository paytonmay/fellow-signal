#!/usr/bin/env bash
# Refresh the HTTP signal layers and rebuild the web dataset.
# Runs the data sources that actually move month-to-month (publications,
# federal funding, outcomes, 990, founders). The browser-harvested portfolio
# (Activate directory + peer portfolios) changes ~yearly and is refreshed
# separately, on demand. Tolerant: a transient API failure on one layer leaves
# its last-good output in place and the rest still refresh.
#
# Usage:  bash pipeline/refresh.sh         (locally or in CI)
set -uo pipefail
cd "$(dirname "$0")/.."

run() { echo "== $* =="; "$@" || echo "!! warning: '$*' failed, keeping last-good output"; }

run python pipeline/signals/field_velocity.py   # OpenAlex research momentum
run python pipeline/signals/space_signals.py    # USAspending federal funding by space
run python pipeline/signals/funder_model.py     # Activate IRS 990 financials
run python pipeline/signals/run_outcomes.py     # NSF + SEC EDGAR outcomes ledger
run python pipeline/signals/federal_outcomes.py # all-agency federal non-dilutive (USAspending)
run python pipeline/signals/run_founders.py     # OpenAlex founder footprints (resumable)
run python pipeline/signals/emerging_science.py # bottom-up emerging research topics
run python pipeline/build_web.py                 # -> web/data/dataset.json

# Blocking gate: hard data-integrity failures (parse errors, dup names/ids,
# federal mismatch, unjoined fellows) abort the refresh so corrupt data is never
# published. Soft warnings (nsf>federal, missing verticals) exit 0 and pass.
echo "== validate (blocking) =="
python pipeline/validate.py || { echo "!! data-integrity check failed, not publishing"; exit 1; }

echo "== refresh complete =="
