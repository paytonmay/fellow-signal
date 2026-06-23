#!/usr/bin/env bash
# One-command founder-data refresh: retry unresolved OpenAlex lookups (resumable),
# rebuild the web dataset, and push to deploy if anything improved.
# Run anytime:  bash pipeline/refresh_founders.sh
set -euo pipefail
cd /Users/paytonmay/activate
source .venv/bin/activate

echo "== resolving founders (resumes from cache) =="
python pipeline/signals/run_founders.py

echo "== rebuilding web dataset =="
python pipeline/build_web.py >/dev/null

if git diff --quiet -- data/processed/founders.json web/data/dataset.json; then
  echo "no founder changes — nothing to deploy"
  exit 0
fi

git add data/processed/founders.json web/data/dataset.json
git -c user.name="Payton May" -c user.email="may.payton@bitsourceky.com" \
  commit -q -m "Refresh founder research footprints (resumable run)

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
git push -q origin main
echo "pushed founder refresh -> auto-deploy"
