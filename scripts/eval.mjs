#!/usr/bin/env node
/**
 * T5 — `npm run eval`: end-to-end search-quality evaluation on REAL live data.
 *
 * Spawns scripts/local-api-server.mjs (the real api/*.ts handlers, exactly as
 * Vercel runs them) and runs a fixed query set through /api/live-search.
 * ≥2s between requests; ~30 marketplace calls total, inside the 100 budget.
 *
 * Per query it records: result count, per-source counts, price-available
 * fraction (the same rule as isPriceAvailable in api/_liveNormalize.ts),
 * image-present fraction, and a KEYWORD relevance proxy — the fraction of
 * the top-8 titles containing at least one query content token. The proxy is
 * reported as what it is (keyword overlap, not human relevance judgment).
 *
 * Hard gates (non-zero exit): every query returns >= 1 result; no source is
 * in 'error' state for every query; overall price-available fraction >= 40%.
 *
 * Usage: npm run eval
 * Output: prints a table; writes eval/eval-report-<timestamp>.json
 */

import { spawn, execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = path.dirname(fileURLToPath(new URL('../package.json', import.meta.url)));
const PORT = 4181;
const GAP_MS = 2000;

const QUERIES = [
  'nike white sneakers',
  'kala joota',
  'sasta smartwatch',
  'audionic',
  'milli sneakers',
  'sneakers',
  'power bank',
  'bachon ke kapray',
  'laptop',
  'perfume',
];

// Small stopword list so the relevance proxy only counts content tokens.
const STOPWORDS = new Set(
  'a an the mujhe chahiye dikhao ke ki ko ka se sasta sasti white black kala'.split(' ')
);

const CURRENCY_RE = /(rs\.?|pkr|₨)/i;
/** Same rule as isPriceAvailable in api/_liveNormalize.ts. */
function isPriceAvailable(price, priceText) {
  if (!(price >= 50)) return false;
  const t = String(priceText ?? '').trim();
  if (t !== '' && !CURRENCY_RE.test(t)) return false;
  return true;
}

function contentTokens(query) {
  return query.toLowerCase().split(/[^a-z0-9\u0600-\u06FF]+/u)
    .filter((t) => t.length > 1 && !STOPWORDS.has(t));
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function getJson(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  return res.json();
}

async function waitForServer(base, timeoutMs = 30000) {
  const start = Date.now();
  for (;;) {
    try {
      await getJson(`${base}/api/live-search?q=test`);
      return;
    } catch {
      if (Date.now() - start > timeoutMs) throw new Error('API server did not start');
      await sleep(500);
    }
  }
}

async function main() {
  // Bundle the REAL client query pipeline (parseQuery, categorizeKeywords,
  // buildMarketplaceQuery, priceOyeSellsCategory) so the eval sends exactly
  // what the app would send to /api/live-search — never a hand-written guess.
  const queryBundleDir = mkdtempSync(path.join(tmpdir(), 'eval-query-'));
  const queryBundle = path.join(queryBundleDir, 'evalQuery.mjs');
  execFileSync(
    'npx',
    [
      'esbuild',
      path.join(root, 'scripts/evalQuery.ts'),
      '--bundle',
      '--platform=node',
      '--format=esm',
      '--loader:.jpg=empty',
      '--loader:.png=empty',
      '--loader:.svg=empty',
      `--outfile=${queryBundle}`,
    ],
    { stdio: 'pipe' },
  );

  /** The exact marketplace request the app would make for a raw user query. */
  async function appQueryFor(raw) {
    const out = execFileSync('node', [queryBundle, raw], { encoding: 'utf8' });
    const parsed = JSON.parse(out);
    const params = new URLSearchParams({
      q: parsed.marketplaceQuery,
      pq: parsed.marketplaceQuery,
    });
    if (parsed.skipSource) params.set('skip', parsed.skipSource);
    return { ...parsed, apiPath: `/api/live-search?${params.toString()}` };
  }

  const server = spawn('node', ['scripts/local-api-server.mjs', String(PORT)], {
    cwd: root, stdio: 'pipe',
  });
  const base = `http://localhost:${PORT}`;
  const queryResults = [];
  let failures = [];
  try {
    await waitForServer(base);
    for (const q of QUERIES) {
      let appQ;
      try {
        appQ = await appQueryFor(q);
      } catch (e) {
        failures.push(`${q}: query pipeline failed (${e.message})`);
        queryResults.push({ query: q, error: String(e.message) });
        await sleep(GAP_MS);
        continue;
      }
      let data;
      try {
        data = await getJson(`${base}${appQ.apiPath}`);
      } catch (e) {
        failures.push(`${q}: request failed (${e.message})`);
        queryResults.push({ query: q, error: String(e.message) });
        await sleep(GAP_MS);
        continue;
      }
      const results = Array.isArray(data.results) ? data.results : [];
      const priceOk = results.filter((r) => isPriceAvailable(r.price, r.priceText)).length;
      const imgOk = results.filter((r) => typeof r.image === 'string' && r.image.length > 0).length;
      // Keyword proxy uses the ENGLISH mapped query (what was actually sent
      // to the sources), not the raw user query — otherwise Roman Urdu
      // queries score 0 against English titles by construction.
      const tokens = contentTokens(`${appQ.english} ${appQ.marketplaceQuery}`);
      const top8 = results.slice(0, 8);
      const relevant = top8.filter((r) =>
        tokens.some((t) => String(r.title || '').toLowerCase().includes(t))
      ).length;
      queryResults.push({
        query: q,
        marketplaceQuery: appQ.marketplaceQuery,
        category: appQ.category,
        skipSource: appQ.skipSource ?? null,
        count: results.length,
        sources: data.sources,
        priceAvailable: priceOk,
        priceAvailableFrac: results.length ? +(priceOk / results.length).toFixed(2) : 0,
        imagesPresentFrac: results.length ? +(imgOk / results.length).toFixed(2) : 0,
        keywordRelevanceProxy: top8.length ? +(relevant / top8.length).toFixed(2) : 0,
        topTitles: results.slice(0, 5).map((r) => r.title),
      });
      if (results.length === 0) failures.push(`${q}: zero results`);
      await sleep(GAP_MS);
    }
  } finally {
    server.kill();
  }

  // ---- aggregate + gates ----
  const ok = queryResults.filter((r) => !r.error);
  const totalResults = ok.reduce((n, r) => n + r.count, 0);
  const totalPriceOk = ok.reduce((n, r) => n + r.priceAvailable, 0);
  const priceFrac = totalResults ? totalPriceOk / totalResults : 0;
  const sourcesSeen = {};
  for (const r of ok) {
    for (const [k, v] of Object.entries(r.sources || {})) {
      sourcesSeen[k] = sourcesSeen[k] || { ok: 0, error: 0, skipped: 0 };
      if (v === 'error') sourcesSeen[k].error++;
      else if (v === 'skipped') sourcesSeen[k].skipped++;
      else sourcesSeen[k].ok++;
    }
  }
  for (const [k, s] of Object.entries(sourcesSeen)) {
    if (s.error === ok.length && ok.length > 0) {
      failures.push(`source ${k}: error on every query`);
    }
  }
  if (priceFrac < 0.4) {
    failures.push(`overall price-available fraction ${priceFrac.toFixed(2)} < 0.40`);
  }

  const report = {
    generatedAt: new Date().toISOString(),
    queries: QUERIES.length,
    requestsMade: QUERIES.length,
    totals: {
      results: totalResults,
      priceAvailable: totalPriceOk,
      priceAvailableFrac: +priceFrac.toFixed(2),
    },
    sources: sourcesSeen,
    perQuery: queryResults,
    gatesFailed: failures,
    pass: failures.length === 0,
  };

  // ---- output ----
  console.log('\nQuery                          | sent as              | count | PriceOye Daraz Telemart | price% | img% | kwRel');
  console.log('-------------------------------|----------------------|-------|-------------------------|--------|------|------');
  for (const r of ok) {
    const s = r.sources || {};
    const cell = (v) => String(v).padStart(7);
    console.log(
      `${r.query.padEnd(30)} | ${(r.marketplaceQuery || '').padEnd(20)} | ${String(r.count).padStart(5)} |` +
      `${cell(s.priceoye)}${cell(s.daraz)}${cell(s.telemart)} |` +
      ` ${String(Math.round(r.priceAvailableFrac * 100)).padStart(3)}%  |` +
      ` ${String(Math.round(r.imagesPresentFrac * 100)).padStart(3)}% |` +
      ` ${r.keywordRelevanceProxy.toFixed(2)}`
    );
  }
  console.log(`\nTotals: ${totalResults} results, price-available ${(priceFrac * 100).toFixed(0)}%`);
  console.log(`Sources: ${JSON.stringify(sourcesSeen)}`);
  if (failures.length > 0) {
    console.log('\nGATES FAILED:');
    for (const f of failures) console.log(`  - ${f}`);
  } else {
    console.log('\nEVAL PASS — all gates green.');
  }
  console.log('Note: kwRel is a keyword-overlap proxy, not human relevance judgment.');

  const dir = path.join(root, 'eval');
  mkdirSync(dir, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const outPath = path.join(dir, `eval-report-${stamp}.json`);
  writeFileSync(outPath, JSON.stringify(report, null, 2));
  console.log(`Report written: ${outPath}`);

  if (failures.length > 0) process.exit(1);
}

main().catch((e) => {
  console.error(`EVAL ERROR: ${e.message}`);
  process.exit(2);
});
