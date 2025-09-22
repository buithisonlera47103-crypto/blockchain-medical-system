/*
  Performance gate for CI.
  Runs autocannon against /perf/ping and enforces thresholds.
*/

const autocannon = require('autocannon');

const TARGET = process.env.PERF_TARGET || 'http://localhost:3001/perf/ping';
const CONCURRENCY = Number(process.env.PERF_CONCURRENCY || 250);
const DURATION = Number(process.env.PERF_DURATION || 20);
const PIPELINING = Number(process.env.PERF_PIPELINING || 10);
const MIN_QPS = Number(process.env.MIN_QPS || 15000);
const MAX_P99_MS = Number(process.env.MAX_P99_MS || 300);
const WARMUP_SEC = Number(process.env.PERF_WARMUP || 5);
const REPEATS = Number(process.env.PERF_REPEATS || 1);

async function runOnce({ url, connections, duration, pipelining }) {
  return await new Promise((resolve, reject) => {
    const inst = autocannon({ url, connections, duration, pipelining }, (err, result) => (err ? reject(err) : resolve(result)));
    inst.on('reqError', (e) => {
      // eslint-disable-next-line no-console
      console.error('Request error:', e?.message || e);
    });
  });
}

(async () => {
  try {
    // Optional warmup to stabilize JIT/GC
    if (WARMUP_SEC > 0) {
      // eslint-disable-next-line no-console
      console.log(`Warming up ${WARMUP_SEC}s @ ${Math.max(1, Math.floor(CONCURRENCY/2))} connections...`);
      await runOnce({ url: TARGET, connections: Math.max(1, Math.floor(CONCURRENCY/2)), duration: WARMUP_SEC, pipelining: PIPELINING });
    }

    // Helper: median
    const median = (arr) => {
      if (!arr || arr.length === 0) return NaN;
      const a = [...arr].sort((x, y) => x - y);
      const mid = Math.floor(a.length / 2);
      return a.length % 2 === 0 ? (a[mid - 1] + a[mid]) / 2 : a[mid];
    };

    // Main runs (repeat to reduce jitter)
    const runs = [];
    const repeats = Math.max(1, REPEATS);
    for (let i = 0; i < repeats; i++) {
      const res = await runOnce({ url: TARGET, connections: CONCURRENCY, duration: DURATION, pipelining: PIPELINING });
      runs.push(res);
    }

    const qpsList = runs.map(r => r.requests?.average ?? r.requests?.mean ?? 0);
    const p99List = runs.map(r => r.latency?.p99 ?? r.latency?.['99.9'] ?? r.latency?.['99'] ?? 999999);

    const qpsMed = median(qpsList);
    const p99Med = median(p99List);

    // eslint-disable-next-line no-console
    console.log(JSON.stringify({ target: TARGET, repeats, qpsList, p99List, qpsMed, p99Med, thresholds: { MIN_QPS, MAX_P99_MS } }, null, 2));

    const okQps = qpsMed >= MIN_QPS;
    const okP99 = p99Med <= MAX_P99_MS;

    if (!okQps || !okP99) {
      throw new Error(`Performance gate failed: qpsMed=${qpsMed} (>=${MIN_QPS}), p99Med=${p99Med}ms (<=${MAX_P99_MS})`);
    }

    // eslint-disable-next-line no-console
    console.log('Performance gate PASSED');
    process.exit(0);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('Performance gate FAILED:', err?.message || err);
    process.exit(1);
  }
})();

