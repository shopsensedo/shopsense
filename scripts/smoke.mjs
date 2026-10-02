#!/usr/bin/env node
/**
 * ShopSense deploy smoke test.
 * Usage: npm run smoke -- <baseUrl>
 *   e.g. npm run smoke -- https://shopsense-e1-abc123.vercel.app
 * Defaults to the production URL when no argument is given.
 *
 * Checks:
 *  1. /api/live-search without q -> 400
 *  2. /api/live-search with one real query -> 200 and >= 1 result
 *  3. /api/img serves an image for an allowlisted CDN URL (taken from check 2)
 *  4. /api/img refuses a non-allowlisted URL -> 403
 *  5. every file under api/ has no extensionless relative imports AND loads
 *     under plain node ESM (regression guard for the D2-1 500 incident)
 */
import { readdirSync, readFileSync, rmSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';

const base = (
  process.argv[2] ||
  process.env.SMOKE_URL ||
  'https://shopsense-teal.vercel.app'
).replace(/\/$/, '');

let failures = 0;
const check = (name, cond, detail = '') => {
  console.log(`${cond ? 'PASS' : 'FAIL'}  ${name}${detail ? ` — ${detail}` : ''}`);
  if (!cond) failures++;
};

console.log(`smoke: ${base}\n`);

// 1. missing query -> 400
{
  const r = await fetch(`${base}/api/live-search`);
  check('live-search without q returns 400', r.status === 400, `got ${r.status}`);
}

// 2. one real query -> 200 with >= 1 result (daraz-only: 1 marketplace request)
let firstImage = '';
{
  const r = await fetch(`${base}/api/live-search?q=nike%20white%20sneakers&skip=priceoye`);
  const j = await r.json().catch(() => null);
  const n = j?.results?.length ?? 0;
  check(
    'live-search real query returns 200 with >= 1 result',
    r.status === 200 && n >= 1,
    `got ${r.status}, ${n} results`,
  );
  firstImage = j?.results?.[0]?.image ?? '';
}

// 3. /api/img serves a real allowlisted CDN image
{
  const r = await fetch(`${base}/api/img?url=${encodeURIComponent(firstImage)}`);
  const ct = r.headers.get('content-type') || '';
  check(
    'img proxy returns an image for an allowlisted URL',
    r.status === 200 && ct.toLowerCase().startsWith('image/'),
    `got ${r.status} ${ct}`,
  );
}

// 4. /api/img refuses a non-allowlisted host
{
  const r = await fetch(
    `${base}/api/img?url=${encodeURIComponent('https://example.com/x.jpg')}`,
  );
  check('img proxy refuses a non-allowlisted URL', r.status === 403, `got ${r.status}`);
}

// 5. api/*.ts: no extensionless relative imports, and each file loads under
//    plain node ESM (transpiled with esbuild, imported by node)
{
  const apiDir = fileURLToPath(new URL('../api/', import.meta.url));
  const files = readdirSync(apiDir).filter((f) => f.endsWith('.ts'));
  const badImports = [];
  for (const f of files) {
    const src = readFileSync(path.join(apiDir, f), 'utf8');
    for (const m of src.matchAll(/(?:from|import)\s*\(?\s*['"](\.\.?\/[^'"]+)['"]/g)) {
      if (!/\.(js|mjs|cjs|ts|json)$/.test(m[1])) badImports.push(`${f}: ${m[1]}`);
    }
  }
  check(
    'api/*.ts has no extensionless relative imports',
    badImports.length === 0,
    badImports.join('; ') || `${files.length} files scanned`,
  );

  const emitted = [];
  const loadFailures = [];
  try {
    // Emit each api/*.ts as api/<name>.js so relative specifiers like
    // './_liveNormalize.js' resolve exactly as they will on Vercel.
    for (const f of files) {
      const out = path.join(apiDir, f.replace(/\.ts$/, '.js'));
      execFileSync(
        'npx',
        ['esbuild', path.join(apiDir, f), '--format=esm', `--outfile=${out}`],
        { stdio: 'pipe' },
      );
      emitted.push(out);
    }
    for (const out of emitted) {
      try {
        await import(pathToFileURL(out).href);
      } catch (e) {
        loadFailures.push(`${path.basename(out)}: ${String(e?.message ?? e).slice(0, 100)}`);
      }
    }
  } catch (e) {
    loadFailures.push(`transpile: ${String(e?.message ?? e).slice(0, 100)}`);
  } finally {
    for (const out of emitted) rmSync(out, { force: true });
  }
  check(
    'api/*.ts loads under plain node ESM',
    loadFailures.length === 0,
    loadFailures.join('; ') || `${files.length} files loaded`,
  );
}

console.log(failures === 0 ? '\nSMOKE PASS' : `\nSMOKE FAIL (${failures})`);
process.exit(failures === 0 ? 0 : 1);
