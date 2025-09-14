const fs = require('fs');
const path = require('path');

function readJSON(p) {
  try {
    return JSON.parse(fs.readFileSync(p, 'utf8'));
  } catch (e) {
    console.error('Failed to read', p, e.message);
    process.exitCode = 1;
    return null;
  }
}

function summarize(tag, data) {
  if (!data) return;
  const rps = data.requests && data.requests.average;
  const l = data.latency || {};
  console.log(`${tag}: ${rps} rps | p50 ${l.p50} ms | p90 ${l.p90} ms | p99 ${l.p99} ms`);
}

const base = process.argv[2] || 'perf';
const cases = [
  ['dev-read', path.join(base, 'dev-read.json')],
  ['dev-burst', path.join(base, 'dev-burst.json')],
  ['dev-soak', path.join(base, 'dev-soak.json')],
  ['prod-read', path.join(base, 'prod-read.json')],
  ['prod-burst', path.join(base, 'prod-burst.json')],
  ['prod-soak', path.join(base, 'prod-soak.json')],
];

for (const [name, file] of cases) {
  if (fs.existsSync(file)) {
    const data = readJSON(file);
    summarize(name, data);
  } else {
    console.log(`${name}: (missing)`);
  }
}

