/**
 * k6 load test for the Record Store API.
 *
 * Run standalone:   k6 run scripts/load-test.js
 * Run via benchmark: bash scripts/benchmark.sh
 *
 * Scenarios tested:
 *   40% — text search      (hits MongoDB text index)
 *   25% — format+category  (hits compound indexes)
 *   20% — paginated list   (baseline)
 *   15% — single by ID     (by-_id lookup)
 */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';

// ── Custom metrics (no native histogram — keeps handleSummary compatible) ─────
const errorRate     = new Rate('error_rate');
const searchLatency = new Trend('search_latency');
const filterLatency = new Trend('filter_latency');
const listLatency   = new Trend('list_latency');
const singleLatency = new Trend('single_latency');

// ── Test config ───────────────────────────────────────────────────────────────
export const options = {
  stages: [
    { duration: '10s', target: 10  },
    { duration: '30s', target: 50  },
    { duration: '30s', target: 100 },
    { duration: '10s', target: 0   },
  ],
  thresholds: {
    http_req_duration: ['p(95)<1000'],
    search_latency:    ['p(95)<1500'],
    filter_latency:    ['p(95)<800'],
    list_latency:      ['p(95)<600'],
    single_latency:    ['p(95)<300'],
    error_rate:        ['rate<0.05'],
  },
};

const BASE = 'http://localhost:3000/api/v1';

const FORMATS    = ['Vinyl', 'CD', 'Cassette', 'Digital'];
const CATEGORIES = ['Rock', 'Jazz', 'Hip-Hop', 'Classical', 'Pop', 'Alternative', 'Indie'];
const SEARCH_TERMS = [
  'Thunder', 'Shadow', 'Crystal', 'Velvet', 'Neon', 'Golden', 'Silver',
  'Iron', 'Cosmic', 'Electric', 'Wild', 'Broken', 'Midnight', 'Burning',
  'Echoes', 'Waves', 'Dreams', 'Fires', 'Storms',
];

function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

function safeCheck(res, checks) {
  try {
    return check(res, checks);
  } catch (_) {
    return false;
  }
}

// ── Setup: collect record IDs for single-record tests ─────────────────────────
export function setup() {
  const res  = http.get(`${BASE}/records?offset=0&limit=50`);
  const body = JSON.parse(res.body);
  const ids  = (body.data ?? []).map(r => r.id).filter(Boolean);
  console.log(`Setup: collected ${ids.length} record IDs`);
  return { ids };
}

// ── Main VU loop ──────────────────────────────────────────────────────────────
export default function (data) {
  const roll = Math.random();

  if (roll < 0.40) {
    // ── Text search ──────────────────────────────────────────────────────────
    const q   = pick(SEARCH_TERMS);
    const res = http.get(`${BASE}/records?q=${encodeURIComponent(q)}&offset=0&limit=20`);
    const ok  = safeCheck(res, {
      'search 200': r => r.status === 200,
      'search has data': r => {
        const b = JSON.parse(r.body);
        return Array.isArray(b.data);
      },
    });
    errorRate.add(!ok);
    searchLatency.add(res.timings.duration);

  } else if (roll < 0.65) {
    // ── Format + category filter ─────────────────────────────────────────────
    const format   = pick(FORMATS);
    const category = pick(CATEGORIES);
    const res = http.get(`${BASE}/records?format=${format}&category=${category}&offset=0&limit=20`);
    const ok  = safeCheck(res, {
      'filter 200': r => r.status === 200,
      'filter has data': r => {
        const b = JSON.parse(r.body);
        return Array.isArray(b.data);
      },
    });
    errorRate.add(!ok);
    filterLatency.add(res.timings.duration);

  } else if (roll < 0.85) {
    // ── Paginated list ───────────────────────────────────────────────────────
    const offset = Math.floor(Math.random() * 500) * 20;
    const res    = http.get(`${BASE}/records?offset=${offset}&limit=20`);
    const ok     = safeCheck(res, {
      'list 200': r => r.status === 200,
      'list has paginationMetadata': r => {
        const b = JSON.parse(r.body);
        return b.paginationMetadata != null;
      },
    });
    errorRate.add(!ok);
    listLatency.add(res.timings.duration);

  } else {
    // ── Single record by ID ──────────────────────────────────────────────────
    const ids = data.ids ?? [];
    if (ids.length === 0) return;
    const id  = pick(ids);
    const res = http.get(`${BASE}/records/${id}`);
    const ok  = safeCheck(res, {
      'single 200': r => r.status === 200,
      'single has artist': r => {
        const b = JSON.parse(r.body);
        return typeof b.artist === 'string';
      },
    });
    errorRate.add(!ok);
    singleLatency.add(res.timings.duration);
  }

  sleep(0.05 + Math.random() * 0.1);
}

// ── Summary ───────────────────────────────────────────────────────────────────
export function handleSummary(data) {
  const m   = data.metrics;
  // Inside handleSummary, metrics are nested under .values
  const ms  = (metric, key) => {
    const v = metric?.values?.[key];
    return v != null ? `${Math.round(v)} ms` : 'n/a';
  };
  const pct = (metric) => {
    const v = metric?.values?.rate;
    return v != null ? `${(v * 100).toFixed(2)} %` : 'n/a';
  };
  const rps   = (m.http_reqs?.values?.rate ?? 0).toFixed(1);
  const total = m.http_reqs?.values?.count ?? 0;

  const pad  = (s, n) => String(s).padEnd(n);
  const line = (label, p50, p95, p99) =>
    `║  ${pad(label, 16)}  ${pad(p50, 10)}  ${pad(p95, 10)}  ${pad(p99, 10)}║`;

  const table = [
    '',
    '╔══════════════════════════════════════════════════════════╗',
    '║           RECORD STORE  —  LOAD TEST RESULTS             ║',
    '╠══════════════════════════════════════════════════════════╣',
    `║  Total requests : ${pad(total, 38)}║`,
    `║  Throughput     : ${pad(rps + ' req/s', 38)}║`,
    `║  Error rate     : ${pad(pct(m.error_rate), 38)}║`,
    '╠══════════════════════════════════════════════════════════╣',
    `║  ${'Scenario'.padEnd(16)}  ${'p50 (med)'.padEnd(10)}  ${'p95'.padEnd(10)}  ${'p90'.padEnd(10)}║`,
    '╠══════════════════════════════════════════════════════════╣',
    line('Text search',  ms(m.search_latency,'med'), ms(m.search_latency,'p(95)'), ms(m.search_latency,'p(90)')),
    line('Filter',       ms(m.filter_latency,'med'), ms(m.filter_latency,'p(95)'), ms(m.filter_latency,'p(90)')),
    line('List/paginate',ms(m.list_latency,  'med'), ms(m.list_latency,  'p(95)'), ms(m.list_latency,  'p(90)')),
    line('Single by ID', ms(m.single_latency,'med'), ms(m.single_latency,'p(95)'), ms(m.single_latency,'p(90)')),
    '╚══════════════════════════════════════════════════════════╝',
    '',
  ].join('\n');

  console.log(table);
  return { stdout: table };
}
