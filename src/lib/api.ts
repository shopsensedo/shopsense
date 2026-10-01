import type { PlatformType, Product } from '../types';
import { PLATFORMS_INFO } from './mockData';

/**
 * ShopSense backend API client.
 * Talks to the FastAPI backend (default http://localhost:8000).
 * Override with VITE_API_URL, e.g. VITE_API_URL=http://192.168.1.5:8000
 */

export const API_BASE =
  (import.meta.env.VITE_API_URL as string | undefined) || 'http://localhost:8000';

interface BackendProduct {
  id: string;
  title: string;
  title_urdu?: string;
  price_pkr: number;
  platform: string;
  purchase_link: string;
  image_file: string;
  category: string;
  score: number;
}

function dataUrlToBlob(dataUrl: string): Blob {
  const [header, base64] = dataUrl.split(',');
  const mime = header.match(/data:(.*?);/)?.[1] || 'image/png';
  const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
  return new Blob([bytes], { type: mime });
}

function platformName(p: string): string {
  const info = (PLATFORMS_INFO as Record<string, { name: string }>)[p];
  return info?.name || p;
}

export function mapBackendProduct(item: BackendProduct): Product {
  const price = item.price_pkr;
  return {
    id: `backend-${item.id}`,
    title: item.title,
    titleUrdu: item.title_urdu || '',
    price,
    originalPrice: price,
    currency: 'PKR',
    platform: item.platform as PlatformType,
    platformUrl: item.purchase_link,
    imageUrl: `${API_BASE}/images/${item.image_file}`,
    similarityScore: Math.round(item.score * 100),
    // Not scraped from any store: zero/empty = "not known". The UI hides
    // these fields for live items rather than showing defaults.
    rating: 0,
    reviewsCount: 0,
    deliveryTime: '',
    deliveryCost: 0,
    inStock: true, // seed products are demo data; assumed in stock
    seller: platformName(item.platform),
    category: item.category,
    priceHistory: [],
  };
}

/** Visual search: cropped image data URL -> ranked products from the backend. */
export async function searchByImage(croppedDataUrl: string, topK = 5): Promise<Product[]> {
  const blob = dataUrlToBlob(croppedDataUrl);
  const form = new FormData();
  form.append('file', blob, 'query.png');
  const res = await fetch(`${API_BASE}/search?top_k=${topK}`, {
    method: 'POST',
    body: form,
  });
  if (!res.ok) throw new Error(`backend /search failed: ${res.status}`);
  const data = await res.json();
  return (data.results as BackendProduct[]).map(mapBackendProduct);
}

/** Text search with Roman Urdu support, e.g. "kala joota". */
export async function searchByText(query: string, topK = 5): Promise<Product[]> {
  const res = await fetch(`${API_BASE}/search-text`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, top_k: topK }),
  });
  if (!res.ok) throw new Error(`backend /search-text failed: ${res.status}`);
  const data = await res.json();
  return (data.results as BackendProduct[]).map(mapBackendProduct);
}

/** Quick check whether the backend is reachable. */
export async function isBackendAvailable(): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE}/health`, { signal: AbortSignal.timeout(3000) });
    return res.ok;
  } catch {
    return false;
  }
}
