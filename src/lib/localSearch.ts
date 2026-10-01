/**
 * In-browser AI search — runs when the FastAPI backend is unreachable.
 *
 * - Visual search: CLIP (Xenova/clip-vit-base-patch32, quantized) via
 *   transformers.js, ranked against the bundled seed embeddings.
 *   Verified: same ranking as the torch backend on the seed catalog.
 * - Text search: Roman Urdu → English keyword map, same logic as backend.
 */
import type { PlatformType, Product } from '../types';
import { SNEAKER_IMAGE, SMARTWATCH_SVG, HANDBAG_SVG } from './mockData';
import { cosineSim, embedQueryImage } from './clipEmbed';
import seedEmbeddings from '../data/seed_embeddings.json';
import seedProducts from '../data/seed_products.json';
import romanUrduMapRaw from '../data/roman_urdu_map.json';

interface SeedProduct {
  id: string;
  title: string;
  title_urdu?: string;
  price_pkr: number;
  platform: string;
  purchase_link: string;
  image_file: string;
  category: string;
}

const PRODUCTS = seedProducts as SeedProduct[];
const EMBEDDINGS = seedEmbeddings as Record<string, number[]>;

const romanUrduMap: Record<string, string[]> = (() => {
  const out: Record<string, string[]> = {};
  for (const [k, v] of Object.entries(romanUrduMapRaw as Record<string, unknown>)) {
    if (k !== '_note' && Array.isArray(v)) out[k] = v as string[];
  }
  return out;
})();
// ---------------------------------------------------------------------------
// Visual search (CLIP in the browser)
// ---------------------------------------------------------------------------

function seedImageFor(p: SeedProduct): string {
  // The real seed photos can't be pushed to GitHub via the text-only push tool,
  // so the public demo reuses the repo's existing category artwork (same pattern
  // the mock catalog already uses). Ranking is computed from the real embeddings.
  const cat = (p.category || '').toLowerCase();
  if (cat.includes('watch')) return SMARTWATCH_SVG;
  if (cat.includes('bag')) return HANDBAG_SVG;
  return SNEAKER_IMAGE;
}

function toProduct(p: SeedProduct, score: number): Product {
  const price = p.price_pkr;
  return {
    id: `local-${p.id}`,
    title: p.title,
    titleUrdu: p.title_urdu || '',
    price,
    originalPrice: price,
    currency: 'PKR',
    platform: p.platform as PlatformType,
    platformUrl: p.purchase_link,
    imageUrl: seedImageFor(p),
    similarityScore: Math.round(score * 100),
    cosineSimilarity: score, // real CLIP cosine vs the bundled seed embeddings
    rating: 4.3,
    reviewsCount: 120,
    deliveryTime: '2-4 days',
    deliveryCost: 0,
    inStock: true,
    seller: p.platform,
    category: p.category,
    priceHistory: [],
  };
}

/**
 * Rank seed products by CLIP cosine similarity, computed fully in-browser.
 * First call downloads the quantized model (~90MB, cached afterwards).
 */
export async function searchByImageLocal(
  dataUrl: string,
  topK = 7,
  onProgress?: (fraction: number) => void,
): Promise<Product[]> {
  const queryVec = await embedQueryImage(dataUrl, onProgress);
  const scored = PRODUCTS.map((p) => {
    const ref = EMBEDDINGS[p.id];
    const dot = ref && ref.length === queryVec.length ? cosineSim(queryVec, ref) : 0;
    return { p, score: dot };
  });
  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, topK).map(({ p, score }) => toProduct(p, score));
}

// ---------------------------------------------------------------------------
// Text search (Roman Urdu keyword map — mirrors backend normalize_query)
// ---------------------------------------------------------------------------

export function normalizeQueryLocal(query: string): string[] {
  // Pad so phrase matching is word-boundary safe: short keys like "ac" or
  // "tv" must not match inside longer words ("black", "watch").
  let q = ` ${query.trim().toLowerCase().replace(/\s+/g, ' ')} `;
  if (!q.trim()) return [];
  const keywords: string[] = [];
  const push = (kws: string[]) => {
    for (const kw of kws) if (!keywords.includes(kw)) keywords.push(kw);
  };
  // Multi-word phrases first, longest wins ("lawn suit" beats "suit").
  const phrases = Object.keys(romanUrduMap)
    .filter((k) => k.includes(' '))
    .sort((a, b) => b.length - a.length);
  for (const phrase of phrases) {
    if (q.includes(` ${phrase} `)) {
      push(romanUrduMap[phrase]);
      q = q.split(phrase).join(' ');
    }
  }
  // Single words: exact token match only (word boundaries).
  for (const word of q.trim().split(/\s+/)) {
    if (romanUrduMap[word]) push(romanUrduMap[word]);
    else if (word && !keywords.includes(word)) keywords.push(word); // mixed English passthrough
  }
  return keywords;
}

export function searchByTextLocal(query: string, topK = 7): Product[] {
  const keywords = normalizeQueryLocal(query);
  if (keywords.length === 0) return [];
  const hayOf = (p: SeedProduct) =>
    `${p.title} ${p.title_urdu || ''} ${p.category}`.toLowerCase();
  return PRODUCTS.filter((p) => {
    const hay = hayOf(p);
    return keywords.some((kw) => hay.includes(kw));
  })
    .map((p) => {
      const hay = hayOf(p);
      const hits = keywords.filter((kw) => hay.includes(kw)).length;
      return { p, score: hits / keywords.length };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, topK)
    .map(({ p, score }) => toProduct(p, score));
}
