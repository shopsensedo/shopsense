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
