// Vercel serverless: image proxy for visual-search embedding.
// Some product CDNs (e.g. images.priceoye.pk) don't send CORS headers, so the
// browser can't fetch their pixels for CLIP embedding. This proxy fetches the
// image server-side and re-serves it with Access-Control-Allow-Origin: *.
// Host allowlist keeps it from becoming an open proxy.

const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36';

const ALLOWED = /(^|\.)(priceoye\.pk|daraz\.pk)$/;

export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*');

  const u = String(req.query?.url ?? '');
  let host = '';
  try {
    const parsed = new URL(u);
    if (parsed.protocol !== 'https:') throw new Error('https only');
    host = parsed.hostname;
  } catch {
    res.status(400).json({ error: 'bad url' });
    return;
  }
  if (!ALLOWED.test(host)) {
    res.status(403).json({ error: 'host not allowed' });
    return;
  }

  try {
    const r = await fetch(u, {
      headers: { 'User-Agent': UA },
      signal: AbortSignal.timeout(10000),
    });
    if (!r.ok) {
      res.status(502).json({ error: `upstream ${r.status}` });
      return;
    }
    const buf = Buffer.from(await r.arrayBuffer());
    res.setHeader('Content-Type', r.headers.get('content-type') || 'image/jpeg');
    res.setHeader('Cache-Control', 'public, max-age=86400');
    res.status(200).send(buf);
  } catch {
    res.status(504).json({ error: 'fetch failed' });
  }
}
