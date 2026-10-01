/**
 * LIVE visual search pipeline (the hybrid design):
 *
 *   user photo → CLIP embed (in-browser)
 *     → zero-shot classify vs pre-computed category text embeddings
 *     → /api/live-search?q=… fetches REAL listings from PriceOye + Daraz
 *     → product images embedded in-browser (via /api/img proxy where needed)
 *     → cosine-ranked vs the user's photo → real products, prices, links
 *
 * No mock data anywhere in this path: every listing comes from a live
 * site API seconds before it is shown.
 */
import type { PlatformType, Product } from '../types';
import { embedQueryImage, embedImageUrl, cosineSim } from './clipEmbed';
import categoryEmbeddingsRaw from '../data/category_embeddings.json';

interface CategoryEntry {
  query: string;
  embedding: number[];
}
const CATEGORIES = categoryEmbeddingsRaw as Record<string, CategoryEntry>;

export interface LiveListing {
  title: string;
  price: number;
  priceText: string;
  image: string;
  url: string;
  source: 'PriceOye' | 'Daraz';
}

export interface Classified {
  category: string;
  query: string;
  score: number;
}

/** Zero-shot classification: cosine(image embedding, category text embeddings). */
export function classifyImage(embedding: number[]): Classified {
  let best: Classified = { category: 'mobile', query: 'mobile', score: 0 };
  for (const [category, entry] of Object.entries(CATEGORIES)) {
    const sim = cosineSim(embedding, entry.embedding);
    if (sim > best.score) best = { category, query: entry.query, score: sim };
  }
  return best;
}

const LIVE_TIMEOUT_MS = 12000;
const EMBED_TIMEOUT_MS = 30000;
const MAX_CANDIDATES = 16;

async function fetchWithTimeout(url: string, ms: number): Promise<Response> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), ms);
  try {
    return await fetch(url, { signal: ctrl.signal });
  } finally {
    clearTimeout(t);
  }
}

/** Real listings from /api/live-search (PriceOye + Daraz, fetched live). */
export async function fetchLiveListings(query: string): Promise<LiveListing[]> {
  const r = await fetchWithTimeout(`/api/live-search?q=${encodeURIComponent(query)}`, LIVE_TIMEOUT_MS);
  if (!r.ok) throw new Error(`live-search ${r.status}`);
  const d = await r.json();
  const results = Array.isArray(d?.results) ? d.results : [];
  return results.slice(0, MAX_CANDIDATES) as LiveListing[];
}

function toLiveProduct(l: LiveListing, score: number): Product {
  const platform = (l.source === 'Daraz' ? 'daraz' : 'priceoye') as PlatformType;
  return {
    id: `live-${l.source}-${encodeURIComponent(l.url).slice(-24)}`,
    title: l.title,
    titleUrdu: '',
    price: l.price,
    originalPrice: l.price,
    currency: 'PKR',
    platform,
    platformUrl: l.url, // REAL product page
    imageUrl: l.image, // REAL product image (<img> needs no CORS)
    similarityScore: Math.max(1, Math.round(score * 100)),
    rating: 0,
    reviewsCount: 0,
    deliveryTime: '',
    deliveryCost: 0,
    inStock: true,
    seller: l.source,
    category: '',
    priceHistory: [],
    isLive: true,
  };
}

export type LiveProgress =
  | { stage: 'classify' }
  | { stage: 'fetch' }
  | { stage: 'match'; done: number; total: number };

/**
 * Full live pipeline. Throws when anything upstream fails so the caller can
 * fall back to the seed catalog — never show fake "live" results.
 */
export async function searchLive(
  dataUrl: string,
  onProgress?: (p: LiveProgress | number) => void,
): Promise<{ products: Product[]; category: string; query: string }> {
  // 1. embed the user's photo (downloads the CLIP model on first use)
  const queryVec = await embedQueryImage(dataUrl, (f) =>
    onProgress?.(typeof f === 'number' ? f * 0.5 : f),
  );

  // 2. understand the image → site search query
  onProgress?.({ stage: 'classify' });
  const cls = classifyImage(queryVec);

  // 3. live listings from the sites
  onProgress?.({ stage: 'fetch' });
  const listings = await fetchLiveListings(cls.query);
  if (listings.length === 0) throw new Error('no live listings');

  // 4+5. embed each product image (via proxy) and rank by visual similarity
  const deadline = Date.now() + EMBED_TIMEOUT_MS;
  const scored: { l: LiveListing; score: number }[] = [];
  let done = 0;
  const queue = listings.slice();
  const workers = Array.from({ length: 4 }, async () => {
    while (queue.length > 0 && Date.now() < deadline) {
      const l = queue.shift()!;
      try {
        const vec = await embedImageUrl(`/api/img?url=${encodeURIComponent(l.image)}`);
        scored.push({ l, score: cosineSim(queryVec, vec) });
      } catch {
        // one bad image must not kill the search
      }
      done++;
      onProgress?.({ stage: 'match', done, total: listings.length });
    }
  });
  await Promise.all(workers);
  if (scored.length === 0) throw new Error('no product images could be embedded');

  // 6. rank
  scored.sort((a, b) => b.score - a.score);
  return {
    products: scored.slice(0, 12).map(({ l, score }) => toLiveProduct(l, score)),
    category: cls.category,
    query: cls.query,
  };
}
