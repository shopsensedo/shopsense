/**
 * Client-side cache of ranked search results (IndexedDB, 30-minute TTL).
 *
 * - Photo searches: key = SHA-256 of the downscaled image, so the same photo
 *   hits the cache even after re-cropping/resizing.
 * - Text searches: key = normalized query + price sort.
 *
 * Falls back to an in-memory Map where IndexedDB is unavailable (tests,
 * private browsing) — same TTL semantics, just lost on reload. A cache hit
 * never fabricates data: only real ranked results are ever stored.
 */
import type { Product } from '../types';
import type { SourceStatus, DescribedImage } from './liveSearch';
import type { FilterFunnel } from './liveNormalize';

const DB_NAME = 'shopsense-cache';
const STORE = 'results';
export const CACHE_TTL_MS = 30 * 60 * 1000;

export interface CachedSearch {
  key: string;
  at: number; // epoch ms when stored
  products: Product[];
  mappedQuery?: string | null;
  marketplaceQuery?: string | null;
  priceSort?: 'asc' | 'desc' | null;
  category?: string;
  sources?: SourceStatus | null;
  /** Results returned by the sources after URL dedupe — the "M" in "Showing N of M". */
  totalCandidates?: number;
  /** Honest per-stage drop counts for the "How results were filtered" line. */
  funnel?: FilterFunnel | null;
  /** T2: the Gemini description that drove this image search (null = basic
   * on-device recognition was used). Restored on cache hits so the
   * "We think this is…" / "Basic recognition used" chip stays honest. */
  described?: DescribedImage | null;
  /** T2: true when the describe request fell back to on-device classification. */
  describeFallback?: boolean;
}

/** "text:black shoes sneakers|sort:asc" — the normalized query plus sort. */
export function cacheKeyForText(normalizedQuery: string, sort: string | null): string {
  return `text:${normalizedQuery.trim().toLowerCase()}|sort:${sort ?? 'none'}`;
}

/** Downscale to a ≤64px JPEG so the hash is stable across crops/resizes. */
export async function downscaleForHash(dataUrl: string): Promise<string> {
  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const el = new Image();
    el.onload = () => resolve(el);
    el.onerror = () => reject(new Error('unreadable image'));
    el.src = dataUrl;
  });
  const s = 64 / Math.max(img.width, img.height, 1);
  const w = Math.max(1, Math.round(img.width * s));
  const h = Math.max(1, Math.round(img.height * s));
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  canvas.getContext('2d')!.drawImage(img, 0, 0, w, h);
  return canvas.toDataURL('image/jpeg', 0.7);
}

export async function sha256Hex(text: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

/** "img:<sha256 of the downscaled image>" */
export async function cacheKeyForImage(dataUrl: string): Promise<string> {
  return `img:${await sha256Hex(await downscaleForHash(dataUrl))}`;
}

const mem = new Map<string, CachedSearch>();

function openDb(): Promise<IDBDatabase | null> {
  return new Promise((resolve) => {
    if (typeof indexedDB === 'undefined') return resolve(null);
    try {
      const req = indexedDB.open(DB_NAME, 1);
      req.onupgradeneeded = () => req.result.createObjectStore(STORE);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

async function withStore(mode: IDBTransactionMode): Promise<IDBObjectStore | null> {
  const db = await openDb();
  if (!db) return null;
  try {
    return db.transaction(STORE, mode).objectStore(STORE);
  } catch {
    return null;
  }
}

/** Returns the entry, or null on miss / expiry (expired entries are deleted). */
export async function getCached(key: string, now: number = Date.now()): Promise<CachedSearch | null> {
  const store = await withStore('readonly');
  let entry: CachedSearch | undefined;
  if (store) {
    entry = await new Promise((resolve) => {
      const r = store.get(key);
      r.onsuccess = () => resolve(r.result as CachedSearch | undefined);
      r.onerror = () => resolve(undefined);
    });
  } else {
    entry = mem.get(key);
  }
  if (!entry) return null;
  if (now - entry.at > CACHE_TTL_MS) {
    await deleteCached(key);
    return null;
  }
  return entry;
}

export async function setCached(entry: CachedSearch): Promise<void> {
  const store = await withStore('readwrite');
  if (store) {
    await new Promise<void>((resolve) => {
      const r = store.put(entry, entry.key);
      r.onsuccess = () => resolve();
      r.onerror = () => resolve();
    });
  } else {
    mem.set(entry.key, entry);
  }
}

export async function deleteCached(key: string): Promise<void> {
  const store = await withStore('readwrite');
  if (store) {
    await new Promise<void>((resolve) => {
      const r = store.delete(key);
      r.onsuccess = () => resolve();
      r.onerror = () => resolve();
    });
  } else {
    mem.delete(key);
  }
}
