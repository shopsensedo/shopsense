import type { TextSimilarityLabel } from '../lib/liveSearch';

export type PlatformType = 'daraz' | 'telemart' | 'bagallery' | 'priceoye' | 'elo' | 'shophive' | 'gulahmed';

export interface PlatformInfo {
  id: PlatformType;
  name: string;
  color: string;
  badgeBg: string;
  badgeText: string;
  trustedSellerRate: number;
}

export interface PricePoint {
  date: string;
  price: number;
}

export interface Product {
  id: string;
  title: string;
  titleUrdu: string;
  price: number;
  originalPrice: number;
  currency: string;
  platform: PlatformType;
  platformUrl: string;
  imageUrl: string;
  similarityScore: number; // 0 - 100
  /** Raw CLIP cosine similarity (unrounded). Set only when the score is a real
   *  CLIP measurement (live search); mock/demo-heuristic products leave it undefined
   *  so the UI never presents a fabricated cosine value. */
  cosineSimilarity?: number;
  /** Brand-aware text-search label (Strong/Good/Possible match), computed with
   *  the query in context (brand-mismatch cap). Set only for live text search;
   *  when absent the card falls back to the plain score-band label. */
  textLabel?: TextSimilarityLabel;
  /** Raw price field(s) from the source JSON (live items only), kept next to
   *  the parsed price for auditability — e.g. Daraz's {price, priceShow,
   *  originalPrice, discount}. */
  rawPrice?: unknown;
  /** The source's own price text, e.g. "Rs. 1,968" (live items only). Used
   *  for the "Price unavailable" display rule. */
  priceText?: string;
  /** True when the live thumbnail failed to load and the listing was kept via
   *  title-match scoring — the card shows "Image unavailable" instead of a
   *  broken image, and the match pill uses the title-derived label. */
  imageUnavailable?: boolean;
  rating: number;
  reviewsCount: number;
  deliveryTime: string;
  deliveryCost: number; // 0 = free
  inStock: boolean;
  seller: string;
  category: string;
  priceHistory: PricePoint[];
  hasPriceDrop?: boolean;
  brand?: string;
  colorName?: string;
  isLive?: boolean; // true when scraped live from a real store (PriceOye/Daraz)
}

export interface SearchResult {
  queryImage?: string;
  queryText?: string;
  detectedCategory: string;
  detectedAttributes: string[];
  totalFound: number;
  processingTimeMs: number;
  products: Product[];
}

export interface User {
  id: string;
  name: string;
  email: string;
  phone?: string;
  isGuest: boolean;
  avatarUrl?: string;
  preferredLanguage: 'en' | 'ur';
}

export interface SavedItem {
  id: string;
  product: Product;
  savedAt: string;
  initialPrice: number;
  currentPrice: number;
  priceChange: number; // e.g., -350 means 350 PKR cheaper
}

export interface PriceAlert {
  id: string;
  product: Product;
  targetPrice: number;
  currentPrice: number;
  enabled: boolean;
  createdAt: string;
  notificationsSent: number;
}

export interface SearchHistoryItem {
  id: string;
  queryImage?: string;
  queryText?: string;
  timestamp: string;
  resultsCount: number;
  category: string;
}

export interface FilterOptions {
  minPrice: number;
  maxPrice: number;
  platforms: PlatformType[];
  minSimilarity: number;
  inStockOnly: boolean;
  sortBy: 'relevance' | 'price_low' | 'price_high' | 'similarity' | 'rating';
  /** Text search only: the 40%-style percentage floor was designed for
   *  image-to-image cosine scores and hides every text result (text scores
   *  live in the 0.24-0.32 band), so text searches filter by match label
   *  instead. 'all' = show all (default), 'good' = Good match and better,
   *  'strong' = Strong match only. */
  textLabelFilter: 'all' | 'good' | 'strong';
}

export type ViewportMode = 'responsive' | 'desktop' | 'tablet' | 'mobile';
export type AppScreen =
  | 'home'
  | 'crop'
  | 'search_loading'
  | 'results'
  | 'comparison'
  | 'saved'
  | 'tracking'
  | 'history'
  | 'profile'
  | 'flutter_handoff';
