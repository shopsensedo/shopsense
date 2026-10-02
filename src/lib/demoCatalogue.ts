/**
 * R9: Demo catalogue loader.
 *
 * A hand-curated catalogue is a JSON file the user fills in themselves
 * (see the CSV template + guide in HUMAN_TODO.md). It is NEVER mixed
 * silently with live results: demo items are shown on their own screen
 * with a visible "Demo catalogue" badge.
 *
 * This module does NOT invent products — it only validates and loads a
 * file the user provides.
 */
import type { Product } from '../types';

/** One row of a demo catalogue. */
export interface DemoItem {
  id: string;
  title: string;
  /** PKR price. Omit when unknown — the UI shows "Price unavailable". */
  price?: number;
  /** Direct image URL (must be a photo you own or have permission to use). */
  image: string;
  /** Link to the store page (or '#' when there is none). */
  url: string;
  /** Free-form category label, e.g. "shoes". */
  category?: string;
}

export interface DemoCatalogue {
  name: string;
  items: DemoItem[];
}

/** Validate an unknown value as a DemoCatalogue. Returns an error string, or null when valid. */
export function validateDemoCatalogue(v: unknown): string | null {
  if (typeof v !== 'object' || v === null) return 'catalogue must be an object';
  const o = v as Record<string, unknown>;
  if (typeof o.name !== 'string' || o.name.trim().length === 0) return 'catalogue.name must be a non-empty string';
  if (!Array.isArray(o.items)) return 'catalogue.items must be an array';
  if (o.items.length === 0) return 'catalogue.items must not be empty';
  const seen = new Set<string>();
  for (const [i, it] of o.items.entries()) {
    if (typeof it !== 'object' || it === null) return `items[${i}] must be an object`;
    const r = it as Record<string, unknown>;
    if (typeof r.id !== 'string' || !r.id.trim()) return `items[${i}].id must be a non-empty string`;
    if (seen.has(r.id)) return `items[${i}].id "${r.id}" is duplicated`;
    seen.add(r.id);
    if (typeof r.title !== 'string' || !r.title.trim()) return `items[${i}].title must be a non-empty string`;
    if (r.price !== undefined && (typeof r.price !== 'number' || r.price < 0)) return `items[${i}].price must be a non-negative number`;
    if (typeof r.image !== 'string' || !r.image.trim()) return `items[${i}].image must be a non-empty URL`;
    if (typeof r.url !== 'string' || !r.url.trim()) return `items[${i}].url must be a non-empty URL`;
    if (r.category !== undefined && typeof r.category !== 'string') return `items[${i}].category must be a string`;
  }
  return null;
}

/** Parse + validate a JSON string. Throws on invalid. */
export function parseDemoCatalogue(json: string): DemoCatalogue {
  let v: unknown;
  try {
    v = JSON.parse(json);
  } catch {
    throw new Error('demo catalogue is not valid JSON');
  }
  const err = validateDemoCatalogue(v);
  if (err) throw new Error(`demo catalogue invalid: ${err}`);
  return v as DemoCatalogue;
}

/** Load from a File (file picker). */
export async function loadDemoCatalogueFile(file: File): Promise<DemoCatalogue> {
  return parseDemoCatalogue(await file.text());
}

/** Convert demo items to Products for display. Always flagged demo:true. */
export function demoItemsToProducts(cat: DemoCatalogue): (Product & { demo: true })[] {
  return cat.items.map((it) => ({
    id: `demo-${it.id}`,
    title: it.title,
    titleUrdu: it.title,
    price: it.price ?? 0,
    originalPrice: it.price ?? 0,
    currency: 'PKR',
    platform: 'demo' as Product['platform'],
    platformUrl: it.url,
    imageUrl: it.image,
    similarityScore: 0,
    // Honest defaults: no invented ratings, reviews, or stock claims.
    rating: 0,
    reviewsCount: 0,
    deliveryTime: '',
    deliveryCost: 0,
    inStock: true,
    seller: cat.name,
    category: it.category ?? '',
    priceHistory: [],
    demo: true as const,
  }));
}
