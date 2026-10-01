#!/usr/bin/env node
/**
 * Thumbnail failure-rate probe (T1 acceptance: <=10% over 5 queries).
 * For each query: GET local /api/live-search -> for each result image,
 * GET local /api/img?url=... -> count 200+image/* as loaded.
 * Prints per-query and overall rates plus per-host breakdown.
 */
const BASE = process.env.LOCAL_API || 'http://localhost:4173';
const QUERIES = [
  ['nike white sneakers', 'skip=priceoye'],
  ['kala joota', 'skip=priceoye'],
  ['safaid kurta', 'skip=priceoye'],
  ['leather handbag', 'skip=priceoye'],
  ['smartwatch', ''],
];

let totalImgs = 0, totalLoaded = 0;
const hostStats = {};
for (const [q, extra] of QUERIES) {
  const r = await fetch(`${BASE}/api/live-search?q=${encodeURIComponent(q)}${extra ? `&${extra}` : ''}`);
  const j = await r.json();
  const imgs = (j.results || []).map((x) => x.image).filter(Boolean);
  let loaded = 0;
  for (const img of imgs) {
    let host = '';
    try { host = new URL(img).hostname; } catch { /* ignore */ }
    hostStats[host] = hostStats[host] || { ok: 0, fail: 0 };
    try {
      const pr = await fetch(`${BASE}/api/img?url=${encodeURIComponent(img)}`);
      const ct = (pr.headers.get('content-type') || '').toLowerCase();
      if (pr.status === 200 && ct.startsWith('image/')) { loaded++; hostStats[host].ok++; }
      else hostStats[host].fail++;
    } catch { hostStats[host].fail++; }
  }
  totalImgs += imgs.length; totalLoaded += loaded;
  const rate = imgs.length ? ((imgs.length - loaded) / imgs.length * 100).toFixed(1) : 'n/a';
  console.log(`query "${q}": ${loaded}/${imgs.length} loaded, failure ${rate}%`);
}
console.log(`\nOVERALL: ${totalLoaded}/${totalImgs} loaded, failure ${((totalImgs - totalLoaded) / totalImgs * 100).toFixed(1)}%`);
console.log('\nper-host:');
for (const [h, s] of Object.entries(hostStats))
  console.log(`  ${h}: ok=${s.ok} fail=${s.fail}`);
