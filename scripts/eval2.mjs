#!/usr/bin/env node
/**
 * R3 — `npm run eval2`: real search-quality evaluation (60 queries).
 *
 * 30 photo queries + 30 text queries (Roman Urdu + mixed included).
 * Photo queries run the REAL visual pipeline: CLIP vision embedding of the
 * photo (Node, @huggingface/transformers, Xenova/clip-vit-base-patch32 q8 —
 * the same weights as the in-browser build), 80-category zero-shot
 * classification via the text tower, live listings from the real
 * /api/live-search handler, thumbnail download via the real /api/img proxy,
 * thumbnail embedding, cosine re-rank — exactly what the browser does.
 * Text queries embed the query with the CLIP text tower and rank the same way.
 *
 * Budget: ≤100 marketplace (live-search upstream) requests, ≥2s apart.
 * Raw live-search responses and thumbnails are cached under eval2/cache/
 * so reruns cost zero live requests.
 *
 * Per query: results returned/shown, Precision@5/@10 under a written
 * agent rubric (yes=1 / partly=0.5 / no=0 on titles — AGENT-MADE labels),
 * latency (cold/warm), per-source success, thumbnail failure rate.
 * The old keyword score is reported as "title keyword coverage" (never as
 * relevance/precision).
 *
 * Output: eval2/eval2-report-<ts>.json, eval2/sample-<ts>.csv (random 20%
 * for hand labeling), console tables.
 */
import { spawn, execFileSync } from 'node:child_process';
import {
  mkdirSync, writeFileSync, readFileSync, existsSync,
} from 'node:fs';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { PHOTO_QUERIES, TEXT_QUERIES } from './eval2/queries.mjs';
import { loadClip, embedImageFile, embedImageBuffer, embedTexts, cosine, classifyImage } from './eval2/clipNode.mjs';

const root = path.dirname(fileURLToPath(new URL('../package.json', import.meta.url)));
const PORT = 4182;
const GAP_MS = 2000;
const CACHE = path.join(root, 'eval2', 'cache');
const API_CACHE = path.join(CACHE, 'api');
const THUMB_CACHE = path.join(CACHE, 'thumbs');
mkdirSync(API_CACHE, { recursive: true });
mkdirSync(THUMB_CACHE, { recursive: true });

const sha = (s) => createHash('sha256').update(s).digest('hex').slice(0, 16);
let liveRequests = 0;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ---------------------------------------------------------------------------
// Live fetching with cache
// ---------------------------------------------------------------------------
async function liveSearch(base, q, skipSource) {
  const key = sha(`${q}|${skipSource ?? ''}`);
  const p = path.join(API_CACHE, `${key}.json`);
  if (existsSync(p)) return JSON.parse(readFileSync(p, 'utf8'));
  if (liveRequests >= 100) throw new Error('live request budget (100) exhausted');
  const url = `${base}/api/live-search?q=${encodeURIComponent(q)}${skipSource ? `&skip=${skipSource}` : ''}`;
  const r = await fetch(url);
  if (!r.ok) throw new Error(`live-search ${r.status}`);
  const j = await r.json();
  liveRequests++;
  writeFileSync(p, JSON.stringify(j));
  await sleep(GAP_MS);
  return j;
}

async function fetchThumb(base, imageUrl) {
  const key = sha(imageUrl);
  const p = path.join(THUMB_CACHE, `${key}.bin`);
  if (existsSync(p)) return { buf: readFileSync(p), cached: true };
  // Via the real /api/img proxy (exercises the allowlist), fallback direct.
  let buf = null;
  try {
    const r = await fetch(`${base}/api/img?url=${encodeURIComponent(imageUrl)}`, { signal: AbortSignal.timeout(15000) });
    if (r.ok) buf = Buffer.from(await r.arrayBuffer());
  } catch { /* fall through to direct */ }
  if (!buf) {
    try {
      const r = await fetch(imageUrl, { signal: AbortSignal.timeout(15000), headers: { 'User-Agent': 'Mozilla/5.0' } });
      if (r.ok) buf = Buffer.from(await r.arrayBuffer());
    } catch { /* failed */ }
  }
  if (!buf || buf.length === 0) return { buf: null, cached: false };
  writeFileSync(p, buf);
  return { buf, cached: false };
}

// ---------------------------------------------------------------------------
// Agent rubric labeling (titles only). yes=1, partly=0.5, no=0.
// ---------------------------------------------------------------------------
function labelTitle(title, yes, partly) {
  const t = title.toLowerCase();
  if (yes.some((k) => t.includes(k))) return { score: 1, label: 'yes' };
  if (partly.some((k) => t.includes(k))) return { score: 0.5, label: 'partly' };
  return { score: 0, label: 'no' };
}

function precisionAt(ranked, k) {
  const top = ranked.slice(0, k);
  if (top.length === 0) return 0;
  return top.reduce((s, r) => s + r.rubric.score, 0) / k;
}

function titleKeywordCoverage(ranked, tokens) {
  const top = ranked.slice(0, 8);
  if (!tokens.length || !top.length) return 0;
  return top.filter((r) => tokens.some((tk) => r.title.toLowerCase().includes(tk))).length / top.length;
}

// ---------------------------------------------------------------------------
async function main() {
  // Ensure the Commons photo set is present (downloads on first run).
  const { execFileSync: _e } = await import('node:child_process');
  try {
    _e('node', ['scripts/eval2/fetchPhotos.mjs'], { stdio: 'inherit', cwd: root });
  } catch {
    console.warn('photo fetch had failures; continuing with what is present');
  }
  // Skip seed-photo queries whose files are absent (backend checkout only).
  const { existsSync: _x } = await import('node:fs');
  const missingSeeds = PHOTO_QUERIES.filter((q) => q.seed && !_x(q.path));
  if (missingSeeds.length) {
    console.warn(`skipping ${missingSeeds.length} seed-photo queries (files absent)`);
  }
  const PHOTOS = PHOTO_QUERIES.filter((q) => !q.seed || _x(q.path));
  // Bundle the real client pipeline.
  const bundleOut = path.join(root, 'eval2', 'cache', 'pipeline.mjs');
  execFileSync('npx', ['esbuild', path.join(root, 'scripts/eval2/pipelineEntry.ts'),
    '--bundle', '--platform=node', '--format=esm',
    '--loader:.jpg=empty', '--loader:.png=empty', '--loader:.svg=empty', '--loader:.webp=empty',
    `--outfile=${bundleOut}`], { stdio: 'pipe', cwd: root });
  const pipeline = await import(pathToFileURL(bundleOut).href);
  console.log('pipeline bundled: IMAGE_CATEGORIES =', pipeline.IMAGE_CATEGORIES.length);

  // Spawn the real API server.
  const server = spawn('node', ['scripts/local-api-server.mjs', String(PORT)], { cwd: root, stdio: 'pipe' });
  const base = `http://localhost:${PORT}`;
  for (let i = 0; i < 30; i++) {
    try { const r = await fetch(`${base}/api/live-search?q=ping`); if (r.status === 400) break; } catch {}
    await sleep(500);
  }

  // Load CLIP (cold timing).
  console.log('loading CLIP (Node, @huggingface/transformers, Xenova/clip-vit-base-patch32 q8)…');
  const { loadMs } = await loadClip((m) => console.log(' ', m));
  console.log(`CLIP loaded in ${(loadMs / 1000).toFixed(1)}s`);

  const report = {
    generatedAt: new Date().toISOString(),
    clip: { runtime: 'node', library: '@huggingface/transformers', model: 'Xenova/clip-vit-base-patch32', dtype: 'q8', loadMs,
      note: 'Same weights as the in-browser build (q8 ONNX export). NOT a headless browser; preprocessing equivalent.' },
    budget: { liveRequests: 0, max: 100, gapMs: GAP_MS },
    queries: [],
  };
  const sourceStats = { priceoye: { ok: 0, total: 0 }, daraz: { ok: 0, total: 0 }, telemart: { ok: 0, total: 0 } };
  let thumbOk = 0, thumbFail = 0;
  let coldDone = false;

  async function rankWithClip(queryVec, listings, queryLabel) {
    // Download + embed thumbnails, cosine rank.
    const ranked = [];
    for (const l of listings) {
      if (!l.image) { thumbFail++; continue; }
      const { buf } = await fetchThumb(base, l.image);
      if (!buf) { thumbFail++; continue; }
      thumbOk++;
      try {
        const { vector } = await embedImageBuffer(buf);
        ranked.push({ ...l, clipScore: cosine(queryVec, vector) });
      } catch { thumbFail++; }
    }
    ranked.sort((a, b) => b.clipScore - a.clipScore);
    return ranked;
  }

  // ---- Photo queries ----
  const LIMIT = Number(process.env.EVAL2_LIMIT ?? 0);
  const photoSet = LIMIT > 0 ? PHOTOS.slice(0, LIMIT) : PHOTOS;
  const textSet = LIMIT > 0 ? TEXT_QUERIES.slice(0, LIMIT) : TEXT_QUERIES;
  for (const pq of photoSet) {
    const t0 = Date.now();
    const { vector: qvec, ms: embedMs } = await embedImageFile(pq.path);
    const cls = await classifyImage(qvec, pipeline.IMAGE_CATEGORIES);
    const plan = pipeline.planPhotoQuery(cls.category);
    const api = await liveSearch(base, plan.marketplaceQuery, plan.skipSource);
    for (const [s, v] of Object.entries(api.sources ?? {})) {
      if (sourceStats[s]) { sourceStats[s].total++; if (v !== 'error') sourceStats[s].ok++; }
    }
    const listings = (api.results ?? []).map((r) => ({ title: r.title, price: r.price, url: r.url, image: r.image }));
    const ranked = await rankWithClip(qvec, listings);
    const labeled = ranked.map((r) => ({ ...r, rubric: labelTitle(r.title, pq.yes, pq.partly) }));
    const shown = labeled.slice(0, 10);
    report.queries.push({
      kind: 'photo', file: pq.file, subject: pq.subject,
      classifiedAs: cls.category, classifiedScore: +cls.score.toFixed(3),
      marketplaceQuery: plan.marketplaceQuery, skipSource: plan.skipSource ?? null,
      returned: listings.length, shown: shown.length,
      precisionAt5: +precisionAt(labeled, 5).toFixed(2),
      precisionAt10: +precisionAt(labeled, 10).toFixed(2),
      titleKeywordCoverage: +titleKeywordCoverage(labeled, pq.yes).toFixed(2),
      latencyMs: Date.now() - t0, embedMs, cold: !coldDone,
      top5: shown.slice(0, 5).map((r) => ({ title: r.title.slice(0, 60), score: r.rubric.label, clip: +r.clipScore.toFixed(3) })),
    });
    coldDone = true;
    console.log(`photo ${pq.file}: cls=${cls.category} n=${listings.length} P@5=${report.queries.at(-1).precisionAt5} P@10=${report.queries.at(-1).precisionAt10}`);
  }

  // ---- Text queries ----
  for (const { query } of textSet) {
    const t0 = Date.now();
    const plan = pipeline.planTextQuery(query);
    const [qvec] = await embedTexts([plan.marketplaceQuery]);
    const api = await liveSearch(base, plan.marketplaceQuery, plan.skipSource);
    for (const [s, v] of Object.entries(api.sources ?? {})) {
      if (sourceStats[s]) { sourceStats[s].total++; if (v !== 'error') sourceStats[s].ok++; }
    }
    const listings = (api.results ?? []).map((r) => ({ title: r.title, price: r.price, url: r.url, image: r.image }));
    const ranked = await rankWithClip(qvec, listings);
    // Expectations for text queries: derive from the English mapped query.
    const toks = plan.english.split(/\s+/).filter((w) => w.length > 2);
    const labeled = ranked.map((r) => {
      const t = r.title.toLowerCase();
      const hit = toks.filter((tk) => t.includes(tk)).length;
      const score = toks.length === 0 ? 0 : hit / toks.length >= 0.5 ? 1 : hit > 0 ? 0.5 : 0;
      return { ...r, rubric: { score, label: score === 1 ? 'yes' : score === 0.5 ? 'partly' : 'no' } };
    });
    const shown = labeled.slice(0, 10);
    report.queries.push({
      kind: 'text', query, english: plan.english, category: plan.category,
      marketplaceQuery: plan.marketplaceQuery, skipSource: plan.skipSource ?? null,
      returned: listings.length, shown: shown.length,
      precisionAt5: +precisionAt(labeled, 5).toFixed(2),
      precisionAt10: +precisionAt(labeled, 10).toFixed(2),
      titleKeywordCoverage: +titleKeywordCoverage(labeled, toks).toFixed(2),
      latencyMs: Date.now() - t0, cold: false,
      top5: shown.slice(0, 5).map((r) => ({ title: r.title.slice(0, 60), score: r.rubric.label, clip: +r.clipScore.toFixed(3) })),
    });
    console.log(`text "${query}": n=${listings.length} P@5=${report.queries.at(-1).precisionAt5} P@10=${report.queries.at(-1).precisionAt10}`);
  }

  server.kill();
  report.budget.liveRequests = liveRequests;

  // Summary
  const avg = (a) => a.reduce((s, x) => s + x, 0) / (a.length || 1);
  const photos = report.queries.filter((q) => q.kind === 'photo');
  const texts = report.queries.filter((q) => q.kind === 'text');
  report.summary = {
    photo: { n: photos.length, meanP5: +avg(photos.map((q) => q.precisionAt5)).toFixed(2), meanP10: +avg(photos.map((q) => q.precisionAt10)).toFixed(2), meanLatencyMs: Math.round(avg(photos.map((q) => q.latencyMs))) },
    text: { n: texts.length, meanP5: +avg(texts.map((q) => q.precisionAt5)).toFixed(2), meanP10: +avg(texts.map((q) => q.precisionAt10)).toFixed(2), meanLatencyMs: Math.round(avg(texts.map((q) => q.latencyMs))) },
    sourceSuccess: Object.fromEntries(Object.entries(sourceStats).map(([k, v]) => [k, v.total ? +(v.ok / v.total).toFixed(2) : null])),
    thumbnails: { ok: thumbOk, failed: thumbFail, failureRate: +((thumbFail / (thumbOk + thumbFail || 1))).toFixed(3) },
    labelsAreAgentMade: true,
  };

  // Gates (non-zero exit on failure)
  const failed = [];
  for (const q of report.queries) {
    if (q.returned < 1) failed.push(`${q.kind}:${q.query ?? q.file} returned 0`);
  }
  report.gatesFailed = failed;
  report.pass = failed.length === 0 && liveRequests <= 100;

  const ts = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  writeFileSync(path.join(root, 'eval2', `eval2-report-${ts}.json`), JSON.stringify(report, null, 1));

  // CSV: random 20% sample for hand labeling (seeded RNG for reproducibility)
  let seed = 42;
  const rand = () => (seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff;
  const idx = report.queries.map((_, i) => i);
  for (let i = idx.length - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1));[idx[i], idx[j]] = [idx[j], idx[i]]; }
  const sample = idx.slice(0, 12).sort((a, b) => a - b).map((i) => report.queries[i]);
  const csv = ['query_kind,query,rank,title,agent_label,clip_score,hand_label'].concat(
    sample.flatMap((q) => q.top5.map((t, r) =>
      [q.kind, `"${(q.query ?? q.file).replace(/"/g, '""')}"`, r + 1, `"${t.title.replace(/"/g, '""')}"`, t.score, t.clip, ''].join(','))),
  ).join('\n');
  writeFileSync(path.join(root, 'eval2', `sample-${ts}.csv`), csv);

  console.log('\n--- summary ---');
  console.log(JSON.stringify(report.summary, null, 1));
  console.log(report.pass ? 'EVAL2 PASS' : `EVAL2 FAIL: ${failed.join('; ')}`);
  console.log(`live requests: ${liveRequests}/100`);
  process.exit(report.pass ? 0 : 1);
}

main().catch((e) => { console.error('eval2 failed:', e.message); process.exit(2); });
