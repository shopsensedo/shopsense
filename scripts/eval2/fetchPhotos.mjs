#!/usr/bin/env node
/**
 * R3 — download eval photo set on first run.
 *
 * The 24 Wikimedia Commons photos (freely licensed; see manifest.json) are
 * NOT committed as binaries (the push tool is text-only). This script
 * fetches them from their canonical Commons URLs so `npm run eval2` works
 * from a clean checkout. The 6 seed photos are the project owner's own
 * files and only exist alongside the backend checkout — eval2 skips those
 * queries with a warning when they're absent.
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const PHOTOS_DIR = fileURLToPath(new URL('../../eval2/photos/', import.meta.url));
mkdirSync(PHOTOS_DIR, { recursive: true });

const manifest = JSON.parse(
  readFileSync(path.join(PHOTOS_DIR, 'manifest.json'), 'utf8'),
);

let fetched = 0, present = 0, failed = 0;
for (const m of manifest) {
  const dest = path.join(PHOTOS_DIR, m.file);
  if (existsSync(dest)) { present++; continue; }
  // Commons file URL -> direct upload URL. The manifest stores the
  // description page URL; we stored the thumb URL at fetch time in `src`.
  const src = m.src;
  if (!src) { console.warn(`no src for ${m.file}, skipping`); failed++; continue; }
  try {
    const r = await fetch(src, { headers: { 'User-Agent': 'ShopSenseEval/1.0 (academic prototype)' } });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    const buf = Buffer.from(await r.arrayBuffer());
    if (buf.length < 8000) throw new Error('too small');
    writeFileSync(dest, buf);
    fetched++;
    console.log(`fetched ${m.file}`);
  } catch (e) {
    console.warn(`FAILED ${m.file}: ${e.message}`);
    failed++;
  }
}
console.log(`photos: ${present} present, ${fetched} fetched, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
