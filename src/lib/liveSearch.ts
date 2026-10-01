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
import { embedQueryImage, embedImageUrl, embedTextQuery, cosineSim } from './clipEmbed';
import { parseQuery, type PriceIntent } from './localSearch';
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

/**
 * Per-source outcome of a live fetch. A failed source is never skipped
 * silently — the UI shows it as "unavailable (blocked or timed out)".
 */
export interface SourceStatus {
  priceoye: { ok: true; count: number } | { ok: false };
  daraz: { ok: true; count: number } | { ok: false };
}

export const EMPTY_SOURCES: SourceStatus = {
  priceoye: { ok: false },
  daraz: { ok: false },
};

/** "PriceOye: 8 results · Daraz: unavailable (blocked or timed out)" */
export function formatSourceStatus(s: SourceStatus): string {
  const part = (name: string, st: { ok: true; count: number } | { ok: false }) =>
    st.ok
      ? `${name}: ${st.count} result${st.count === 1 ? '' : 's'}`
      : `${name}: unavailable (blocked or timed out)`;
  return `${part('PriceOye', s.priceoye)} · ${part('Daraz', s.daraz)}`;
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

/**
 * Per-site search phrasing, tuned against the real APIs:
 * - PriceOye's suggest endpoint matches product names ("5g mobile" → smartphones,
 *   while "mobile" returns bar phones).
 * - Daraz's catalog search is a normal keyword search ("smartphone" → 40 phones).
 */
const SITE_QUERIES: Record<string, { daraz: string; priceoye: string }> = {
  mobile: { daraz: 'smartphone', priceoye: '5g mobile' },
  shoes: { daraz: 'shoes', priceoye: 'shoes' },
  watch: { daraz: 'watch', priceoye: 'watch' },
  handbag: { daraz: 'handbag', priceoye: 'handbag' },
  earbuds: { daraz: 'earbuds', priceoye: 'earbuds' },
  sunglasses: { daraz: 'sunglasses', priceoye: 'sunglasses' },
  kurta: { daraz: 'kurta', priceoye: 'kurta' },
  tshirt: { daraz: 'tshirt', priceoye: 'tshirt' },
  backpack: { daraz: 'backpack', priceoye: 'backpack' },
  laptop: { daraz: 'laptop', priceoye: 'laptop' },
};

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
export async function fetchLiveListings(
  category: string,
  fallbackQuery: string,
): Promise<{ listings: LiveListing[]; sources: SourceStatus }> {
  const sq = SITE_QUERIES[category] ?? { daraz: fallbackQuery, priceoye: fallbackQuery };
  let d: any;
  try {
    const r = await fetchWithTimeout(
      `/api/live-search?q=${encodeURIComponent(sq.daraz)}&pq=${encodeURIComponent(sq.priceoye)}`,
      LIVE_TIMEOUT_MS,
    );
    if (!r.ok) throw new Error(`live-search ${r.status}`);
    d = await r.json();
  } catch {
    // The function itself failed — both sources are unknown/unavailable.
    return { listings: [], sources: EMPTY_SOURCES };
  }
  const results = (Array.isArray(d?.results) ? d.results : []).slice(
    0,
    MAX_CANDIDATES,
  ) as LiveListing[];
  // /api/live-search reports per-source outcomes as count | 'error'.
  const src = d?.sources ?? {};
  const toStatus = (v: unknown): { ok: true; count: number } | { ok: false } =>
    typeof v === 'number' ? { ok: true, count: v } : { ok: false };
  return {
    listings: results,
    sources: { priceoye: toStatus(src.priceoye), daraz: toStatus(src.daraz) },
  };
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
    cosineSimilarity: score, // raw CLIP cosine, shown only in the detail modal
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

/**
 * Human-readable similarity label replacing the old "NN% match".
 *
 * Thresholds are calibrated on the real CLIP (openai/clip-vit-base-patch32)
 * cosine distribution measured 2026-10-02 over product photos:
 * - image-image: self 1.00, same style/different colourway 0.87,
 *   same category 0.54-0.70, unrelated 0.47-0.57
 * - text-image: relevant matches 0.24-0.29 ("black shoes" -> black shoe 0.285,
 *   "handbag bag bags" -> handbag 0.27-0.29, "watch smartwatch" -> watch 0.256),
 *   irrelevant <= 0.22
 * So >= 0.75 means a near-duplicate visual match, >= 0.55 a same-category
 * visual match; cross-modal text matches honestly land in "Loosely similar"
 * (0.2-0.3 band) even when they are the best available result.
 */
export type SimilarityLabel = 'Very similar' | 'Similar' | 'Loosely similar';

export function similarityLabel(scorePercent: number): SimilarityLabel {
  if (scorePercent >= 75) return 'Very similar';
  if (scorePercent >= 55) return 'Similar';
  return 'Loosely similar';
}

export type LiveProgress =
  | { stage: 'classify' }
  | { stage: 'fetch' }
  | { stage: 'match'; done: number; total: number };

/**
 * Embed every candidate thumbnail (via the /api/img proxy) and cosine-score
 * it against the query vector. Shared by the visual and the text pipelines —
 * only the query vector differs (photo vs CLIP text embedding).
 */
async function scoreThumbnails(
  listings: LiveListing[],
  queryVec: number[],
  onProgress?: (p: LiveProgress | number) => void,
): Promise<{ l: LiveListing; score: number }[]> {
  const deadline = Date.now() + EMBED_TIMEOUT_MS;
  const scored: { l: LiveListing; score: number }[] = [];
  let done = 0;
  const queue = listings.slice();
  const workers = Array.from({ length: 4 }, async () => {
    while (queue.length > 0 && Date.now() < deadline) {
      const l = queue.shift()!;
      try {
        const vec = await embedImageUrl(`/api/img?url=${encodeURIComponent(l.image)}`);
        if (vec.length === queryVec.length) {
          scored.push({ l, score: cosineSim(queryVec, vec) });
        }
      } catch {
        // one bad image must not kill the search
      }
      done++;
      onProgress?.({ stage: 'match', done, total: listings.length });
    }
  });
  await Promise.all(workers);
  return scored;
}

/**
 * Guess a site-query category from mapped English keywords. Returns a
 * SITE_QUERIES key, or '' when nothing matches — then fetchLiveListings
 * uses the mapped English query verbatim for both sources.
 */
function categorizeKeywords(keywords: string[]): string {
  const kw = new Set(keywords);
  const has = (...ws: string[]) => ws.some((w) => kw.has(w));
  if (has('watch', 'watches', 'smartwatch')) return 'watch';
  if (has('handbag', 'bag', 'bags', 'purse', 'clutch', 'tote', 'briefcase')) return 'handbag';
  if (has('backpack', 'luggage')) return 'backpack';
  if (has('earbuds', 'headphones', 'airpods', 'speaker', 'handsfree', 'earphones')) return 'earbuds';
  if (has('sunglasses', 'shades')) return 'sunglasses';
  if (has('laptop', 'macbook', 'notebook')) return 'laptop';
  if (has('kurta', 'shalwar', 'kameez', 'ethnic', 'lawn', 'dupatta', 'abaya', 'saree', 'lehenga', 'sherwani', 'frock')) return 'kurta';
  if (has('tshirt', 'shirt', 'hoodie', 'jacket', 'jeans', 'denim', 'sweater', 'trouser', 'pants', 'shorts', 'coat')) return 'tshirt';
  if (has('shoes', 'sneakers', 'footwear', 'boots', 'heels', 'sandals', 'slippers', 'joggers', 'khussa')) return 'shoes';
  if (has('mobile', 'smartphone', 'phone', 'iphone', 'samsung', 'charger', 'cable', 'tablet', 'ipad')) return 'mobile';
  return '';
}

/**
 * Live text search: Roman Urdu / English / mixed query →
 * mapped English keywords → /api/live-search on both sources →
 * CLIP text-to-image ranking over the thumbnails.
 * Never throws for upstream source problems; only a broken text-embedding
 * (model load failure) still throws.
 */
export async function searchLiveText(
  rawQuery: string,
  onProgress?: (p: LiveProgress | number) => void,
): Promise<{
  products: Product[];
  mappedQuery: string;
  category: string;
  query: string;
  sources: SourceStatus;
  priceSort: PriceIntent;
}> {
  // 1. Roman Urdu → English (word-boundary safe, mixed-language passthrough).
  // Price-intent words ("sasta", "mehnga") are stripped from the mapped query
  // here and applied as a result sort instead.
  const { keywords, priceIntent } = parseQuery(rawQuery);
  const english = keywords.join(' ');
  const category = categorizeKeywords(keywords);

  // 2. live listings from the sites (mapped query when no category matched)
  onProgress?.({ stage: 'fetch' });
  const { listings, sources } = await fetchLiveListings(category, english);
  const empty = {
    products: [] as Product[],
    mappedQuery: english,
    category,
    query: english,
    sources,
    priceSort: priceIntent,
  };
  if (listings.length === 0) return empty;

  // 3. embed the English query with CLIP's text tower (downloads on first use)
  const queryVec = await embedTextQuery(english, (f) =>
    onProgress?.(typeof f === 'number' ? f * 0.5 : f),
  );

  // 4+5. rank thumbnails by text-to-image cosine similarity
  const scored = await scoreThumbnails(listings, queryVec, onProgress);
  if (scored.length === 0) return empty; // thumbnails failed — honest empty, not fake

  // 6. rank; a price intent ("sasta"/"mehnga") overrides CLIP order with a price sort
  scored.sort((a, b) => b.score - a.score);
  let products = scored.slice(0, 12).map(({ l, score }) => toLiveProduct(l, score));
  if (priceIntent === 'asc') products = [...products].sort((a, b) => a.price - b.price);
  else if (priceIntent === 'desc') products = [...products].sort((a, b) => b.price - a.price);
  return {
    products,
    mappedQuery: english,
    category,
    query: english,
    sources,
    priceSort: priceIntent,
  };
}
/**
 * Full live pipeline (visual). Never throws for upstream source problems — it returns
 * whatever it got (possibly zero products) together with the per-source
 * status, so the caller can show an honest error instead of fake results.
 * Only a broken query-image embedding (model load failure) still throws.
 */
export async function searchLive(
  dataUrl: string,
  onProgress?: (p: LiveProgress | number) => void,
): Promise<{ products: Product[]; category: string; query: string; sources: SourceStatus }> {
  // 1. embed the user's photo (downloads the CLIP model on first use)
  const queryVec = await embedQueryImage(dataUrl, (f) =>
    onProgress?.(typeof f === 'number' ? f * 0.5 : f),
  );

  // 2. understand the image → site search query
  onProgress?.({ stage: 'classify' });
  const cls = classifyImage(queryVec);

  // 3. live listings from the sites
  onProgress?.({ stage: 'fetch' });
  const { listings, sources } = await fetchLiveListings(cls.category, cls.query);
  const empty = { products: [] as Product[], category: cls.category, query: cls.query, sources };
  if (listings.length === 0) return empty;

  // 4+5. embed each product image (via proxy) and rank by visual similarity
  const scored = await scoreThumbnails(listings, queryVec, onProgress);
  if (scored.length === 0) return empty; // thumbnails failed — honest empty, not fake

  // 6. rank
  scored.sort((a, b) => b.score - a.score);
  return {
    products: scored.slice(0, 12).map(({ l, score }) => toLiveProduct(l, score)),
    category: cls.category,
    query: cls.query,
    sources,
  };
}
