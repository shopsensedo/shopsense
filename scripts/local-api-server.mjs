#!/usr/bin/env node
/**
 * Local harness: serves the REAL api/*.ts handlers (transpiled with esbuild,
 * exactly like Vercel's Node ESM runtime) on localhost so `npm run smoke`
 * and the thumbnail failure-rate probe can run against actual handler code
 * without a Vercel preview deployment.
 *
 * Usage: node scripts/local-api-server.mjs [port]
 * Only for local verification — never committed as a prod path.
 */
import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';
import http from 'node:http';

const port = Number(process.argv[2] || 4173);
const apiDir = fileURLToPath(new URL('../api/', import.meta.url));
const outDir = mkdtempSync(path.join(tmpdir(), 'e1-api-'));

for (const f of ['_liveNormalize.ts', 'live-search.ts', 'img.ts']) {
  execFileSync(
    'npx',
    ['esbuild', path.join(apiDir, f), '--format=esm', `--outfile=${path.join(outDir, f.replace(/\.ts$/, '.js'))}`],
    { stdio: 'pipe' },
  );
}

const liveSearch = (await import(pathToFileURL(path.join(outDir, 'live-search.js')).href)).default;
const imgProxy = (await import(pathToFileURL(path.join(outDir, 'img.js')).href)).default;

function mockRes(nodeRes) {
  let statusCode = 200;
  const headers = {};
  return {
    status(c) { statusCode = c; return this; },
    setHeader(k, v) { headers[k] = v; },
    json(o) {
      const body = Buffer.from(JSON.stringify(o));
      nodeRes.writeHead(statusCode, { ...headers, 'content-type': 'application/json' });
      nodeRes.end(body);
    },
    send(b) {
      const body = Buffer.isBuffer(b) ? b : Buffer.from(String(b ?? ''));
      nodeRes.writeHead(statusCode, headers);
      nodeRes.end(body);
    },
  };
}

const server = http.createServer(async (nodeReq, nodeRes) => {
  try {
    const u = new URL(nodeReq.url, `http://localhost:${port}`);
    const handler = u.pathname === '/api/live-search' ? liveSearch
      : u.pathname === '/api/img' ? imgProxy : null;
    if (!handler) { nodeRes.writeHead(404); nodeRes.end('nope'); return; }
    const req = {
      method: nodeReq.method,
      query: Object.fromEntries(u.searchParams.entries()),
      headers: nodeReq.headers,
    };
    await handler(req, mockRes(nodeRes));
  } catch (e) {
    console.error('handler error', e);
    nodeRes.writeHead(500); nodeRes.end('handler error');
  }
});

server.listen(port, () => console.log(`local api on http://localhost:${port}`));
process.on('SIGTERM', () => { server.close(); rmSync(outDir, { recursive: true, force: true }); });
