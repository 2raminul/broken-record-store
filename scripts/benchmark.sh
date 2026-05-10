#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# benchmark.sh  —  Proves index + cache benefit on 100k records
#
# What it does:
#   1. Seeds 100k records (if not already there)
#   2. Runs load test WITH indexes  → "Optimised" result
#   3. Drops indexes temporarily
#   4. Runs load test WITHOUT indexes → "Baseline (no indexes)" result
#   5. Re-creates indexes
#   6. Prints side-by-side comparison
# ─────────────────────────────────────────────────────────────────────────────

set -uo pipefail
cd "$(dirname "$0")/.."

MONGO_URI="mongodb://localhost:27017"
DB="records"

# ── helpers ──────────────────────────────────────────────────────────────────
mongo_eval() {
  node -e "
const { MongoClient } = require('./node_modules/mongodb');
async function run() {
  const c = new MongoClient('${MONGO_URI}');
  await c.connect();
  ${1}
  await c.close();
}
run().catch(e => { console.error(e); process.exit(1); });
"
}

section() { echo ""; echo "▶  $1"; echo ""; }

# ── step 1: seed ─────────────────────────────────────────────────────────────
section "Seeding 100k records (skips if already done)"
node scripts/seed-100k.mjs

# ── step 2: optimised run (indexes ON) ───────────────────────────────────────
section "Load test WITH indexes + cache (optimised)"
k6 run scripts/load-test.js --summary-export=scripts/.result-with-indexes.json 2>&1 | tee scripts/.output-with-indexes.txt

# ── step 3: drop indexes ─────────────────────────────────────────────────────
section "Dropping performance indexes for baseline run…"
mongo_eval "
  const col = c.db('${DB}').collection('records');
  await col.dropIndex('format_1');
  await col.dropIndex('category_1');
  await col.dropIndex('artist_text_album_text');
  console.log('Indexes dropped');
"

# ── step 4: baseline run (no indexes) ────────────────────────────────────────
section "Load test WITHOUT indexes (baseline — slow)"
k6 run scripts/load-test.js --summary-export=scripts/.result-no-indexes.json 2>&1 | tee scripts/.output-no-indexes.txt

# ── step 5: recreate indexes ─────────────────────────────────────────────────
section "Re-creating indexes…"
mongo_eval "
  const col = c.db('${DB}').collection('records');
  await col.createIndex({ format: 1 });
  await col.createIndex({ category: 1 });
  await col.createIndex({ artist: 'text', album: 'text' });
  console.log('Indexes restored');
"

# ── step 6: comparison ───────────────────────────────────────────────────────
section "COMPARISON"
node -e "
const with_ = require('./scripts/.result-with-indexes.json');
const no_   = require('./scripts/.result-no-indexes.json');

// k6 --summary-export uses flat metric objects (no nested .values)
const ms  = (m, p) => Math.round(m?.[p] ?? 0);
const rps = m => (m?.rate ?? 0).toFixed(1);

const rows = [
  ['Metric',                     'WITH indexes',   'WITHOUT indexes',  'Improvement'],
  ['─────────────────────────',  '──────────────', '────────────────',  '───────────'],
  ['Throughput (req/s)',         rps(with_.metrics.http_reqs),   rps(no_.metrics.http_reqs),   ''],
  ['All requests p95 (ms)',      ms(with_.metrics.http_req_duration,'p(95)'), ms(no_.metrics.http_req_duration,'p(95)'), ''],
  ['Text search p95 (ms)',       ms(with_.metrics.search_latency,'p(95)'),   ms(no_.metrics.search_latency,'p(95)'),   ''],
  ['Filter p95 (ms)',            ms(with_.metrics.filter_latency,'p(95)'),   ms(no_.metrics.filter_latency,'p(95)'),   ''],
  ['List/paginate p95 (ms)',     ms(with_.metrics.list_latency,'p(95)'),     ms(no_.metrics.list_latency,'p(95)'),     ''],
  ['Single by ID p95 (ms)',      ms(with_.metrics.single_latency,'p(95)'),   ms(no_.metrics.single_latency,'p(95)'),   ''],
  ['Error rate',
    ((with_.metrics.error_rate?.value ?? 0)*100).toFixed(2)+'%',
    ((no_.metrics.error_rate?.value   ?? 0)*100).toFixed(2)+'%',
    ''],
];

// fill improvement column
for (let i = 2; i < rows.length; i++) {
  const w = parseFloat(rows[i][1]);
  const n = parseFloat(rows[i][2]);
  if (!isNaN(w) && !isNaN(n) && n > 0) {
    const diff = ((n - w) / n * 100).toFixed(0);
    rows[i][3] = diff > 0 ? diff + '% faster' : diff + '% slower';
  }
}

const cols = [28, 15, 17, 13];
const pad  = (s, n) => String(s).padEnd(n);
console.log('');
console.log('╔══════════════════════════════════════════════════════════════════════════╗');
console.log('║            BENCHMARK: INDEXES + CACHE  vs  NO INDEXES                   ║');
console.log('╠══════════════════════════════════════════════════════════════════════════╣');
rows.forEach(r => {
  const line = '║  ' + r.map((v,i) => pad(v, cols[i])).join('  ') + '║';
  console.log(line);
});
console.log('╚══════════════════════════════════════════════════════════════════════════╝');
console.log('');
"
