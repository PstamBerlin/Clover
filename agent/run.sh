#!/bin/bash
# Clover's checker: one scheduled run. GLM (OpenCode) reads agent/BRIEF.md and
# does the work; this script only sets the stage and keeps a log.
#   bash agent/run.sh            a full run with GLM
#   bash agent/run.sh --scripts  only the scripts, no GLM (for testing)
set -u
export PATH="/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin"
REPO="$(cd "$(dirname "$0")/.." && pwd)"
cd "$REPO" || exit 1
mkdir -p agent/logs agent/out
STAMP="$(date +%Y-%m-%d_%H%M)"
LOG="agent/logs/run-$STAMP.log"
MODEL="${CLOVER_MODEL:-baseten/zai-org/GLM-5.3}"   # the GLM Peter uses; override with CLOVER_MODEL
echo "clover checker $STAMP model $MODEL" | tee "$LOG"

# never two runs at once, and never on a machine that is busy with a heavy job
if pgrep -f "agent/cart_check.py" >/dev/null; then echo "a run is already going, stopping" | tee -a "$LOG"; exit 0; fi

if [ "${1:-}" = "--scripts" ]; then
  python3 agent/fetch_stores.py 2>&1 | tee -a "$LOG"
  python3 agent/cart_check.py 2>&1 | tee -a "$LOG"
  python3 agent/sync.py 2>&1 | tee -a "$LOG"
  exit 0
fi

opencode run --model "$MODEL" --auto --title "Clover checker $STAMP" \
  "Read agent/BRIEF.md in this folder and do exactly what it says, step by step. Today is $(date +%Y-%m-%d). When you are done, the report must exist at agent/logs/report-$(date +%Y-%m-%d).md." \
  2>&1 | tee -a "$LOG"
echo "done $(date +%H:%M)" | tee -a "$LOG"
