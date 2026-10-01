// Vercel serverless: live product listings from Pakistani e-commerce sites.
// Fetches PriceOye's JSON API and Daraz's catalog JSON in parallel (server-side,
// so no CORS issues), normalizes them, and returns real listings.
// Every item returned here is a REAL listing scraped seconds ago — no mock data.
import {
  normalizePriceOyeItem,
  normalizeDarazItem,
  type LiveItem,
} from '../src/lib/liveNormalize';

export type { LiveItem };

const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36';

const FETCH_TIMEOUT_MS = 8000;
const MAX_PER_SITE = 12;

async function fetchJson(url: string, extraHeaders: Record<string, string> = {}): Promise<any> {
  const r = await fetch(url, {
    headers: { 'User-Agent': UA, ...extraHeaders },
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
  });
  if (!r.ok) throw new Error(`upstream ${r.status}`);
  return r.json();
}

async function fetchPriceOye(query: string): Promise<LiveItem[]> {
  const url = `https://api.priceoye.pk/api/search_suggest?category=&widget=0&page=&query=${encodeURIComponent(query)}`;
  const d = await fetchJson(url);
  const items = Array.isArray(d?.items) ? d.items : [];
  return items.slice(0, MAX_PER_SITE).map((it: any) => {
    const n = normalizePriceOyeItem(it);
    n.title = n.title.slice(0, 160);
    return n;
  });
}

async function fetchDaraz(query: string): Promise<LiveItem[]> {
  const url = `https://www.daraz.pk/catalog/?q=${encodeURIComponent(query)}&ajax=true`;
  const d = await fetchJson(url, { 'X-Requested-With': 'XMLHttpRequest' });
  const items = Array.isArray(d?.mods?.listItems) ? d.mods.listItems : [];
  return items.slice(0, MAX_PER_SITE).map((it: any) => {
    const n = normalizeDarazItem(it);
    n.title = n.title.slice(0, 160);
    const img = n.image;
    n.image = img.startsWith('http') ? img : `https:${img}`;
    return n;
  });
}

export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 'public, max-age=120');

  const q = String(req.query?.q ?? '').trim().slice(0, 60);
  // PriceOye's suggest API responds better to different phrasing than Daraz;
  // `pq` lets the client tune each site separately (defaults to `q`).
  const pq = String(req.query?.pq ?? '').trim().slice(0, 60) || q;
  // Category routing: the client may skip a source entirely
  // (`skip=priceoye` — PriceOye sells electronics/appliances only).
  // A skipped source is reported as 'skipped', never as an error.
  const skip = String(req.query?.skip ?? '').trim().toLowerCase();
  if (!q) {
    res.status(400).json({ error: 'missing q' });
    return;
  }

  const fetchPo = skip === 'priceoye' ? null : fetchPriceOye(pq).then(
    (v) => ({ status: 'fulfilled' as const, value: v }),
    () => ({ status: 'rejected' as const, value: [] as LiveItem[] }),
  );
  const fetchDz = skip === 'daraz' ? null : fetchDaraz(q).then(
    (v) => ({ status: 'fulfilled' as const, value: v }),
    () => ({ status: 'rejected' as const, value: [] as LiveItem[] }),
  );
  const [po, dz] = await Promise.all([fetchPo, fetchDz]);
  // Counts reflect VALID normalized listings (title, price, image, URL all
  // present), so the client's status line never claims results it won't show.
  const isValid = (r: LiveItem) => !!(r.title && r.price > 0 && r.image && r.url);
  const poItems = (po && po.status === 'fulfilled' ? po.value : []).filter(isValid);
  const dzItems = (dz && dz.status === 'fulfilled' ? dz.value : []).filter(isValid);
  const results: LiveItem[] = [...poItems, ...dzItems];

  // null = deliberately skipped (category routing), reported as 'skipped'.
  const sourceCount = (
    s: { status: 'fulfilled' | 'rejected'; value: LiveItem[] } | null,
    items: LiveItem[],
  ) => (s === null ? 'skipped' : s.status === 'fulfilled' ? items.length : 'error');

  res.status(200).json({
    query: q,
    count: results.length,
    sources: {
      priceoye: sourceCount(po, poItems),
      daraz: sourceCount(dz, dzItems),
    },
    fetchedAt: new Date().toISOString(),
    results,
  });
}
