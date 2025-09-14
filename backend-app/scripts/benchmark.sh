#!/usr/bin/env bash
set -euo pipefail

# Simple benchmark runner targeting the ultra-light endpoints /perf/ping or /bench/ping
# - Detects the running server port automatically (3001..3006)
# - Uses local dev dependency autocannon (no npx needed)
# - Writes JSON report to perf/bench.json and prints a concise summary
# - Exits non-zero if average RPS < TARGET_RPS

TARGET_RPS=${TARGET_RPS:-1000}
DURATION=${DURATION:-30}
CONCURRENCY=${CONCURRENCY:-300}
PIPELINES=${PIPELINES:-10}
PATH_SUFFIX=${PATH_SUFFIX:-/perf/ping}
HOST=${HOST:-localhost}

ROOT_DIR=$(cd "$(dirname "$0")/.." && pwd)
cd "$ROOT_DIR"

AUTOCANNON_BIN="./node_modules/.bin/autocannon"
if [[ ! -x "$AUTOCANNON_BIN" ]]; then
  echo "[ERROR] autocannon not found at $AUTOCANNON_BIN. Run 'npm install' in backend-app first." >&2
  exit 1
fi

# Ensure perf directory exists
mkdir -p perf

# Detect port by probing lightweight endpoints
PORT=""
for p in 3001 3002 3003 3004 3005 3006; do
  if curl -sf "http://$HOST:$p/perf/ping" | grep -q "pong"; then
    PORT="$p"; PATH_SUFFIX="/perf/ping"; break
  fi
  if curl -sf "http://$HOST:$p/bench/ping" | grep -q "pong"; then
    PORT="$p"; PATH_SUFFIX="/bench/ping"; break
  fi
  # health as fallback
  if curl -sf "http://$HOST:$p/health" >/dev/null; then
    PORT="$p"; PATH_SUFFIX="/health"; break
  fi
done

if [[ -z "$PORT" ]]; then
  echo "[ERROR] Could not detect running server port in 3001..3006. Start the server first (npm start)." >&2
  exit 1
fi

URL="http://$HOST:$PORT$PATH_SUFFIX"
echo "[INFO] Benchmarking $URL with C=$CONCURRENCY, P=$PIPELINES, D=${DURATION}s (target >= ${TARGET_RPS} rps)"

# Run autocannon and capture JSON
REPORT_FILE="perf/bench.json"
"$AUTOCANNON_BIN" -j -c "$CONCURRENCY" -d "$DURATION" -p "$PIPELINES" "$URL" > "$REPORT_FILE"

# Summarize via Node (avoid jq dependency)
node - <<'NODE'
const fs = require('fs');
const path = require('path');
const reportPath = path.resolve('perf/bench.json');
const raw = fs.readFileSync(reportPath, 'utf8');
const data = JSON.parse(raw);
const avg = data?.requests?.average ?? 0;
const p95 = data?.latency?.p95 ?? 0;
const p99 = data?.latency?.p99 ?? 0;
console.log(`[RESULT] average=${avg.toFixed(2)} req/s, p95=${p95} ms, p99=${p99} ms`);
const target = Number(process.env.TARGET_RPS || 1000);
if (avg < target) {
  console.error(`[FAIL] Average RPS ${avg.toFixed(2)} < target ${target}`);
  process.exit(2);
} else {
  console.log(`[PASS] Average RPS ${avg.toFixed(2)} >= target ${target}`);
}
NODE

