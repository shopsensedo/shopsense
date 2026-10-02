// Vercel serverless: image proxy for visual-search embedding.
// Some product CDNs don't send CORS headers, so the browser can't fetch their
// pixels for CLIP embedding. This proxy fetches the image server-side and
// re-serves it with Access-Control-Allow-Origin: *.
//
// Strict by design — this must never become an open proxy:
// - https only
// - exact host allowlist (the real image CDNs seen in live /api/live-search
//   responses on 2026-10-02; NOT suffix matching — no new CDN host can be
//   served without an explicit code change)
// - redirects are followed only to https URLs on an allowlisted host (max 3)
// - upstream content-type must be image/*
// - max 8 MiB (content-length gate + capped streaming read)
// - 10 s timeout

const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36';

const FETCH_TIMEOUT_MS = 10000;
const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
const MAX_REDIRECTS = 3;

// Exact host allowlist. Only these CDN hosts were observed in live
// /api/live-search responses on 2026-10-02:
//   pk-live-21.slatic.net, sg-test-11.slatic.net, static-01.daraz.pk,
//   images.priceoye.pk
// Any other host (including other *.slatic.net subdomains) is rejected.
const ALLOWED_HOSTS = new Set([
  'pk-live-21.slatic.net',
  'sg-test-11.slatic.net',
  'static-01.daraz.pk',
  'images.priceoye.pk',
  // T3: Telemart (telex.pk, Shopify) product images.
  'cdn.shopify.com',
  // R8: eval labelling page query photos (Wikimedia Commons).
  'commons.wikimedia.org',
  'upload.wikimedia.org',
]);

function isAllowedUrl(u: string): boolean {
  try {
    const parsed = new URL(u);
    return parsed.protocol === 'https:' && ALLOWED_HOSTS.has(parsed.hostname.toLowerCase());
  } catch {
    return false;
  }
}

async function fetchImage(url: string): Promise<Response> {
  let current = url;
  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    const r = await fetch(current, {
      headers: { 'User-Agent': UA },
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      redirect: 'manual',
    });
    if (r.status >= 300 && r.status < 400) {
      const loc = r.headers.get('location');
      if (!loc) throw new Error('redirect without location');
      const next = new URL(loc, current).toString();
      if (!isAllowedUrl(next)) throw new Error('redirect to non-allowlisted host');
      current = next;
      continue;
    }
    return r;
  }
  throw new Error('too many redirects');
}

export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*');

  const u = String(req.query?.url ?? '');
  if (!isAllowedUrl(u)) {
    res.status(403).json({ error: 'host not allowed' });
    return;
  }

  try {
    const r = await fetchImage(u);
    if (!r.ok) {
      res.status(502).json({ error: `upstream ${r.status}` });
      return;
    }
    const contentType = r.headers.get('content-type') || '';
    if (!contentType.toLowerCase().startsWith('image/')) {
      res.status(502).json({ error: 'not an image' });
      return;
    }
    const declared = Number(r.headers.get('content-length') || '0');
    if (declared > MAX_IMAGE_BYTES) {
      res.status(502).json({ error: 'image too large' });
      return;
    }
    // Capped streaming read: never buffer more than MAX_IMAGE_BYTES even when
    // content-length lies or is absent.
    const reader = r.body?.getReader();
    if (!reader) {
      res.status(502).json({ error: 'no body' });
      return;
    }
    const chunks: Buffer[] = [];
    let total = 0;
    try {
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        total += value.byteLength;
        if (total > MAX_IMAGE_BYTES) {
          res.status(502).json({ error: 'image too large' });
          return;
        }
        chunks.push(Buffer.from(value));
      }
    } finally {
      reader.releaseLock();
    }
    const buf = Buffer.concat(chunks);
    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', 'public, max-age=86400');
    res.status(200).send(buf);
  } catch (err: any) {
    const msg = String(err?.message ?? '');
    if (msg.includes('redirect') || msg.includes('allowlisted')) {
      res.status(502).json({ error: msg });
      return;
    }
    res.status(504).json({ error: 'fetch failed' });
  }
}
