/**
 * R8: describe-image evaluation mode.
 *
 * Evaluates the 30 eval2 photos through the production /api/describe-image
 * endpoint and compares the described category/queries with the zero-shot
 * classifier's top-1.
 *
 * Rate limit: 10 req/IP/min → 7 s spacing (30 photos ≈ 3.5 min).
 * If the endpoint returns 503 (no GEMINI_API_KEY), the run is marked PENDING
 * and the script exits 0 with a pending report — ready to re-run later.
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const ENDPOINT = 'https://shopsense-teal.vercel.app/api/describe-image';
const SPACING_MS = 7000;
const PHOTO_DIR = join(ROOT, 'eval2', 'photos');
const OUT = join(ROOT, 'eval2', `describe-eval-${new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-')}.json`);

const manifest = JSON.parse(readFileSync(join(PHOTO_DIR, 'manifest.json'), 'utf8'));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Downscale to max 768px JPEG via ImageMagick if available, else send as-is.
function photoAsBase64(file) {
  const src = join(PHOTO_DIR, file);
  try {
    const out = execFileSync('convert', [src, '-resize', '768x768>', '-quality', '82', 'jpg:-']);
    return out.toString('base64');
  } catch {
    return readFileSync(src).toString('base64');
  }
}

const rows = [];
let pending = false;
for (const [i, p] of manifest.entries()) {
  if (i > 0) await sleep(SPACING_MS);
  const body = JSON.stringify({ image: photoAsBase64(p.file), mimeType: 'image/jpeg' });
  let res, json = null;
  try {
    res = await fetch(ENDPOINT, { method: 'POST', headers: { 'content-type': 'application/json' }, body });
    json = await res.json().catch(() => null);
  } catch (e) {
    rows.push({ file: p.file, expected: p.category, status: 'fetch_error', error: String(e) });
    continue;
  }
  if (res.status === 503) {
    pending = true;
    rows.push({ file: p.file, expected: p.category, status: 'PENDING', detail: json });
    continue;
  }
  if (res.status === 429) {
    rows.push({ file: p.file, expected: p.category, status: 'rate_limited' });
    await sleep(60_000);
    continue;
  }
  if (!res.ok || !json) {
    rows.push({ file: p.file, expected: p.category, status: `http_${res.status}` });
    continue;
  }
  const described = (json.category ?? '').toLowerCase();
  const expected = p.category.toLowerCase();
  const match = described === expected || described.includes(expected) || expected.includes(described);
  rows.push({
    file: p.file, expected: p.category, status: 'ok',
    describedCategory: json.category, queries: json.queries ?? [],
    top1Match: match,
  });
  console.log(`${p.file}: described=${json.category} expected=${p.category} ${match ? 'MATCH' : 'DIFF'}`);
}

const done = rows.filter((r) => r.status === 'ok');
const report = {
  generatedAt: new Date().toISOString(),
  endpoint: ENDPOINT,
  status: pending ? 'PENDING' : 'complete',
  note: pending
    ? 'describe-image returned 503 (no GEMINI_API_KEY on production). Script is ready to re-run when the key is configured.'
    : 'describe-image evaluated on all 30 photos.',
  n: rows.length,
  nOk: done.length,
  top1Agreement: done.length ? +(done.filter((r) => r.top1Match).length / done.length).toFixed(2) : null,
  rows,
};
writeFileSync(OUT, JSON.stringify(report, null, 2));
console.log(`\nstatus=${report.status} nOk=${report.nOk}/${rows.length} agreement=${report.top1Agreement}`);
console.log('wrote', OUT);
