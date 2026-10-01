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
import seedEmbeddings from '../data/seed_embeddings.json';
import seedProducts from '../data/seed_products.json';
import romanUrduMapRaw from '../data/roman_urdu_map.json';

const MODEL_ID = 'Xenova/clip-vit-base-patch32';

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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let extractorPromise: Promise<any> | null = null;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let rawImageCtor: any = null;

async function getExtractor(onProgress?: (fraction: number) => void) {
  if (!extractorPromise) {
    // Dynamic import: keeps the transformers.js bundle out of the initial page load.
    const { pipeline, RawImage } = await import('@huggingface/transformers');
    rawImageCtor = RawImage;
    extractorPromise = pipeline('image-feature-extraction', MODEL_ID, {
      dtype: 'q8', // -> vision_model_quantized.onnx (~90MB); ranking verified vs torch backend
      device: 'wasm',
      progress_callback: (info: { status?: string; progress?: number }) => {
        if (!onProgress) return;
        if (info.status === 'progress' && typeof info.progress === 'number') {
          onProgress(Math.min(0.95, Math.max(0, info.progress / 100)));
        } else if (info.status === 'ready') {
          onProgress(1);
        }
      },
    }).catch((err: unknown) => {
      extractorPromise = null;
      throw err;
    });
  } else if (onProgress) {
    onProgress(1);
  }
  return extractorPromise;
}

function l2normalize(v: ArrayLike<number>): number[] {
  let sum = 0;
  for (let i = 0; i < v.length; i++) sum += v[i] * v[i];
  const norm = Math.sqrt(sum) || 1;
  const out = new Array<number>(v.length);
  for (let i = 0; i < v.length; i++) out[i] = v[i] / norm;
  return out;
}

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
  const extractor = await getExtractor(onProgress);
  const image = await rawImageCtor.fromURL(dataUrl);
  const output = await extractor(image, { pool: true });
  const queryVec = l2normalize(Array.from(output.data as Float32Array));

  const scored = PRODUCTS.map((p) => {
    const ref = EMBEDDINGS[p.id];
    let dot = 0;
    if (ref && ref.length === queryVec.length) {
      for (let i = 0; i < queryVec.length; i++) dot += queryVec[i] * ref[i];
    }
    return { p, score: dot };
  });
  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, topK).map(({ p, score }) => toProduct(p, score));
}

// ---------------------------------------------------------------------------
// Text search (Roman Urdu keyword map — mirrors backend normalize_query)
// ---------------------------------------------------------------------------

export function normalizeQueryLocal(query: string): string[] {
  let q = query.trim().toLowerCase();
  if (!q) return [];
  const keywords: string[] = [];
  for (const phrase of Object.keys(romanUrduMap).sort((a, b) => b.length - a.length)) {
    if (q.includes(phrase)) {
      for (const kw of romanUrduMap[phrase]) {
        if (!keywords.includes(kw)) keywords.push(kw);
      }
      q = q.split(phrase).join(' ');
    }
  }
  for (const word of q.split(/\s+/)) {
    if (word && !keywords.includes(word)) keywords.push(word);
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
