import { Product, PlatformInfo, PlatformType, SavedItem, PriceAlert, SearchHistoryItem, User } from '../types';
import sneakerImg from '../assets/images/pakistan_shoes_sneaker_1790799393681.jpg';
import kurtaImg from '../assets/images/pakistan_kurta_dress_1790799410747.jpg';

export const PLATFORMS_INFO: Record<PlatformType, PlatformInfo> = {
  demo: {
    id: 'demo',
    name: 'Demo catalogue',
    color: '#6b7280',
    badgeBg: '#f3f4f6',
    badgeText: '#374151',
    trustedSellerRate: 0,
  },
  daraz: {
    id: 'daraz',
    name: 'Daraz PK',
    color: '#F85606',
    badgeBg: '#FFF0EA',
    badgeText: '#C23D00',
    trustedSellerRate: 94,
  },
  telemart: {
    id: 'telemart',
    name: 'Telemart',
    color: '#0284C7',
    badgeBg: '#F0F9FF',
    badgeText: '#0369A1',
    trustedSellerRate: 91,
  },
  bagallery: {
    id: 'bagallery',
    name: 'Bagallery',
    color: '#E11D48',
    badgeBg: '#FFF1F2',
    badgeText: '#BE123C',
    trustedSellerRate: 96,
  },
  priceoye: {
    id: 'priceoye',
    name: 'PriceOye',
    color: '#7C3AED',
    badgeBg: '#F5F3FF',
    badgeText: '#6D28D9',
    trustedSellerRate: 97,
  },
  elo: {
    id: 'elo',
    name: 'ELO (Export Leftovers)',
    color: '#D97706',
    badgeBg: '#FFFBEB',
    badgeText: '#B45309',
    trustedSellerRate: 89,
  },
  shophive: {
    id: 'shophive',
    name: 'Shophive',
    color: '#059669',
    badgeBg: '#ECFDF5',
    badgeText: '#047857',
    trustedSellerRate: 92,
  },
  gulahmed: {
    id: 'gulahmed',
    name: 'Gul Ahmed Ideas',
    color: '#B91C1C',
    badgeBg: '#FEF2F2',
    badgeText: '#991B1B',
    trustedSellerRate: 99,
  }
};

export const SNEAKER_IMAGE = sneakerImg;
export const KURTA_IMAGE = kurtaImg;

// SVG inline representations for other popular items so zero broken images occur
export const SMARTWATCH_SVG = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="400" height="400" viewBox="0 0 400 400"><rect width="400" height="400" fill="%23F1F5F9"/><circle cx="200" cy="200" r="110" fill="%23FFFFFF" stroke="%23CBD5E1" stroke-width="4"/><rect x="180" y="40" width="40" height="70" rx="10" fill="%23F97316"/><rect x="180" y="290" width="40" height="70" rx="10" fill="%23F97316"/><rect x="130" y="130" width="140" height="140" rx="28" fill="%230F172A"/><circle cx="200" cy="200" r="45" fill="none" stroke="%23F97316" stroke-width="6" stroke-dasharray="180 60"/><text x="200" y="206" fill="%23FFFFFF" font-family="sans-serif" font-size="20" font-weight="bold" text-anchor="middle">10:45</text><text x="200" y="235" fill="%2394A3B8" font-family="sans-serif" font-size="11" text-anchor="middle">7,420 steps</text></svg>`;

export const HANDBAG_SVG = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="400" height="400" viewBox="0 0 400 400"><rect width="400" height="400" fill="%23FAF5F0"/><path d="M140 160 C140 100 260 100 260 160" fill="none" stroke="%239A3412" stroke-width="12" stroke-linecap="round"/><path d="M100 170 L300 170 L280 320 L120 320 Z" fill="%23C2410C" stroke="%239A3412" stroke-width="4"/><path d="M100 170 Q200 210 300 170" fill="none" stroke="%23FED7AA" stroke-width="3"/><rect x="185" y="210" width="30" height="25" rx="4" fill="%23FBBF24"/><text x="200" y="360" fill="%239A3412" font-family="sans-serif" font-size="14" font-weight="600" text-anchor="middle">Leather Tote</text></svg>`;

export const DENIM_SVG = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="400" height="400" viewBox="0 0 400 400"><rect width="400" height="400" fill="%23F8FAFC"/><path d="M130 90 L270 90 L290 350 L220 350 L200 180 L180 350 L110 350 Z" fill="%231E3A8A" stroke="%23172554" stroke-width="4"/><line x1="130" y1="120" x2="270" y2="120" stroke="%23F59E0B" stroke-width="3" stroke-dasharray="6 4"/><rect x="190" y="96" width="20" height="15" rx="3" fill="%2394A3B8"/></svg>`;

export const EARBUDS_SVG = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="400" height="400" viewBox="0 0 400 400"><rect width="400" height="400" fill="%23F1F5F9"/><rect x="120" y="140" width="160" height="120" rx="30" fill="%230F172A"/><circle cx="200" cy="200" r="5" fill="%2322C55E"/><path d="M150 135 C150 90 190 90 190 135" fill="none" stroke="%23334155" stroke-width="8" stroke-linecap="round"/><circle cx="150" cy="110" r="14" fill="%23475569"/><text x="200" y="310" fill="%23475569" font-family="sans-serif" font-size="14" font-weight="bold" text-anchor="middle">ANC Wireless Pods</text></svg>`;

export const SAMPLE_PRODUCTS: Product[] = [
  // 1. Black Sneakers Cluster (Kala Joota query)
  {
    id: 'prod-sneaker-daraz',
    title: 'Men Casual Breathable Black Athletic Sneakers - Lightweight Gym Shoes',
    titleUrdu: 'Mardon ke Halkay Kalay Joggers / Casual Jootay',
    price: 2499,
    originalPrice: 3499,
    currency: 'PKR',
    platform: 'daraz',
    platformUrl: 'https://www.daraz.pk/products/men-sneakers-sample',
    imageUrl: SNEAKER_IMAGE,
    similarityScore: 98,
    rating: 4.6,
    reviewsCount: 428,
    deliveryTime: '2-4 business days',
    deliveryCost: 0,
    inStock: true,
    seller: 'SpeedyFoot Official Store',
    category: 'Footwear',
    hasPriceDrop: true,
    brand: 'SpeedyFoot',
    colorName: 'All Black',
    priceHistory: [
      { date: 'Sep 01', price: 3499 },
      { date: 'Sep 08', price: 3200 },
      { date: 'Sep 15', price: 2999 },
      { date: 'Sep 22', price: 2750 },
      { date: 'Sep 29', price: 2499 },
    ]
  },
  {
    id: 'prod-sneaker-telemart',
    title: 'Urban Black Air-Cushioned Walker Sneakers 2026 Edition',
    titleUrdu: 'Urban Black Cushion Joggers Jootay',
    price: 2850,
    originalPrice: 3600,
    currency: 'PKR',
    platform: 'telemart',
    platformUrl: 'https://www.telemart.pk/products/urban-black-sneakers',
    imageUrl: SNEAKER_IMAGE,
    similarityScore: 94,
    rating: 4.4,
    reviewsCount: 112,
    deliveryTime: '3-5 business days',
    deliveryCost: 150,
    inStock: true,
    seller: 'Telemart Fashion Hub',
    category: 'Footwear',
    hasPriceDrop: false,
    brand: 'UrbanStep',
    colorName: 'Matte Black',
    priceHistory: [
      { date: 'Sep 01', price: 3600 },
      { date: 'Sep 10', price: 3100 },
      { date: 'Sep 20', price: 2900 },
      { date: 'Sep 29', price: 2850 },
    ]
  },
  {
    id: 'prod-sneaker-elo',
    title: 'Export Leftover Knit Sole Black Training Shoes',
    titleUrdu: 'ELO Original Black Knit Shoes',
    price: 2199,
    originalPrice: 2999,
    currency: 'PKR',
    platform: 'elo',
    platformUrl: 'https://www.exportleftovers.com/products/knit-black-shoes',
    imageUrl: SNEAKER_IMAGE,
    similarityScore: 91,
    rating: 4.7,
    reviewsCount: 560,
    deliveryTime: '4-6 business days',
    deliveryCost: 190,
    inStock: true,
    seller: 'ELO Official Warehouse',
    category: 'Footwear',
    hasPriceDrop: true,
    brand: 'Leftover Originals',
    colorName: 'Black',
    priceHistory: [
      { date: 'Sep 01', price: 2999 },
      { date: 'Sep 12', price: 2499 },
      { date: 'Sep 25', price: 2199 },
    ]
  },
  {
    id: 'prod-sneaker-shophive',
    title: 'ActiveSport Pro Breathable Mesh Black Running Shoes',
    titleUrdu: 'ActiveSport Mesh Black Running Jootay',
    price: 3200,
    originalPrice: 3800,
    currency: 'PKR',
    platform: 'shophive',
    platformUrl: 'https://www.shophive.com/products/activesport-black-mesh',
    imageUrl: SNEAKER_IMAGE,
    similarityScore: 88,
    rating: 4.2,
    reviewsCount: 88,
    deliveryTime: '1-2 business days (Lahore Express)',
    deliveryCost: 200,
    inStock: false,
    seller: 'Shophive Sports',
    category: 'Footwear',
    hasPriceDrop: false,
    brand: 'ActiveSport',
    colorName: 'Black Carbon',
    priceHistory: [
      { date: 'Sep 01', price: 3800 },
      { date: 'Sep 15', price: 3400 },
      { date: 'Sep 29', price: 3200 },
    ]
  },

  // 2. Kurta / Pakistani Festive Wear Cluster (Lal Suit / Kurta query)
  {
    id: 'prod-kurta-gulahmed',
    title: 'Emerald & Gold Hand-Embroidered Festive Lawn Stitched Kurta',
    titleUrdu: 'Gul Ahmed Embroidered Festive Lawn Kurta',
    price: 5490,
    originalPrice: 7200,
    currency: 'PKR',
    platform: 'gulahmed',
    platformUrl: 'https://www.gulahmedshop.com/festive-emerald-stitched-kurta',
    imageUrl: KURTA_IMAGE,
    similarityScore: 99,
    rating: 4.9,
    reviewsCount: 310,
    deliveryTime: '2-3 business days',
    deliveryCost: 0,
    inStock: true,
    seller: 'Gul Ahmed Ideas Official',
    category: 'Ethnic Wear',
    hasPriceDrop: true,
    brand: 'Ideas Luxury',
    colorName: 'Emerald Green',
    priceHistory: [
      { date: 'Sep 01', price: 7200 },
      { date: 'Sep 10', price: 6490 },
      { date: 'Sep 20', price: 5990 },
      { date: 'Sep 29', price: 5490 },
    ]
  },
  {
    id: 'prod-kurta-daraz',
    title: 'Designer Cut Luxury Chiffon Embroidered Festive Kurti for Women',
    titleUrdu: 'Designer Chiffon Kadai Wali Kurti',
    price: 4850,
    originalPrice: 6500,
    currency: 'PKR',
    platform: 'daraz',
    platformUrl: 'https://www.daraz.pk/products/festive-chiffon-kurti',
    imageUrl: KURTA_IMAGE,
    similarityScore: 92,
    rating: 4.5,
    reviewsCount: 174,
    deliveryTime: '3-5 business days',
    deliveryCost: 120,
    inStock: true,
    seller: 'Karachi Fashion Mall',
    category: 'Ethnic Wear',
    hasPriceDrop: true,
    brand: 'Karachi Stitches',
    colorName: 'Emerald / Gold',
    priceHistory: [
      { date: 'Sep 01', price: 6500 },
      { date: 'Sep 14', price: 5300 },
      { date: 'Sep 29', price: 4850 },
    ]
  },
  {
    id: 'prod-kurta-bagallery',
    title: 'Pret Collection Embroidered Formal Tunic Kurta',
    titleUrdu: 'Pret Collection Embroidered Kurta Tunic',
    price: 5950,
    originalPrice: 6800,
    currency: 'PKR',
    platform: 'bagallery',
    platformUrl: 'https://bagallery.com/products/pret-embroidered-kurta',
    imageUrl: KURTA_IMAGE,
    similarityScore: 95,
    rating: 4.8,
    reviewsCount: 89,
    deliveryTime: '2-4 business days',
    deliveryCost: 0,
    inStock: true,
    seller: 'Bagallery Pret Lounge',
    category: 'Ethnic Wear',
    hasPriceDrop: false,
    brand: 'Noor Pret',
    colorName: 'Forest Green',
    priceHistory: [
      { date: 'Sep 01', price: 6800 },
      { date: 'Sep 15', price: 6200 },
      { date: 'Sep 29', price: 5950 },
    ]
  },

  // 3. Smartwatch Cluster
  {
    id: 'prod-watch-priceoye',
    title: 'T800 Ultra Smartwatch 1.99" HD Display Bluetooth Calling with Orange Strap',
    titleUrdu: 'T800 Ultra Smartwatch Orange Strap ke sath',
    price: 1849,
    originalPrice: 2799,
    currency: 'PKR',
    platform: 'priceoye',
    platformUrl: 'https://priceoye.pk/smart-watches/t800-ultra-smartwatch',
    imageUrl: SMARTWATCH_SVG,
    similarityScore: 97,
    rating: 4.5,
    reviewsCount: 840,
    deliveryTime: '1-2 business days (Express COD)',
    deliveryCost: 0,
    inStock: true,
    seller: 'PriceOye Certified',
    category: 'Smartwatches',
    hasPriceDrop: true,
    brand: 'OEM Ultra',
    colorName: 'Orange / Titanium Silver',
    priceHistory: [
      { date: 'Sep 01', price: 2799 },
      { date: 'Sep 10', price: 2250 },
      { date: 'Sep 20', price: 1999 },
      { date: 'Sep 29', price: 1849 },
    ]
  },
  {
    id: 'prod-watch-daraz',
    title: 'Ultra 8 Series Smart Watch Wireless Charging Heart Rate Fitness Tracker',
    titleUrdu: 'Ultra 8 Series Smartwatch Fitness Tracker',
    price: 1999,
    originalPrice: 2899,
    currency: 'PKR',
    platform: 'daraz',
    platformUrl: 'https://www.daraz.pk/products/ultra-8-smartwatch',
    imageUrl: SMARTWATCH_SVG,
    similarityScore: 93,
    rating: 4.3,
    reviewsCount: 520,
    deliveryTime: '2-4 business days',
    deliveryCost: 110,
    inStock: true,
    seller: 'Smart Gadget Mart',
    category: 'Smartwatches',
    hasPriceDrop: false,
    brand: 'Ultra Series',
    colorName: 'Orange Strap',
    priceHistory: [
      { date: 'Sep 01', price: 2899 },
      { date: 'Sep 15', price: 2199 },
      { date: 'Sep 29', price: 1999 },
    ]
  },
  {
    id: 'prod-watch-telemart',
    title: 'Smart Band Series 8 Ultra calling Watch with Infinite Display',
    titleUrdu: 'Series 8 Ultra Calling Watch',
    price: 2250,
    originalPrice: 3200,
    currency: 'PKR',
    platform: 'telemart',
    platformUrl: 'https://www.telemart.pk/products/series-8-ultra-watch',
    imageUrl: SMARTWATCH_SVG,
    similarityScore: 89,
    rating: 4.1,
    reviewsCount: 94,
    deliveryTime: '3-4 business days',
    deliveryCost: 150,
    inStock: true,
    seller: 'Telemart Verified Tech',
    category: 'Smartwatches',
    hasPriceDrop: false,
    brand: 'GizmoPro',
    colorName: 'Orange',
    priceHistory: [
      { date: 'Sep 01', price: 3200 },
      { date: 'Sep 12', price: 2600 },
      { date: 'Sep 29', price: 2250 },
    ]
  },

  // 4. Leather Handbag
  {
    id: 'prod-bag-bagallery',
    title: 'Women Quilted Tan Brown Vegan Leather Shoulder Tote Handbag',
    titleUrdu: 'Ladies Tan Brown Leather Shoulder Handbag',
    price: 2999,
    originalPrice: 4200,
    currency: 'PKR',
    platform: 'bagallery',
    platformUrl: 'https://bagallery.com/products/quilted-tan-shoulder-bag',
    imageUrl: HANDBAG_SVG,
    similarityScore: 96,
    rating: 4.7,
    reviewsCount: 210,
    deliveryTime: '2-3 business days',
    deliveryCost: 0,
    inStock: true,
    seller: 'Vogue Essentials PK',
    category: 'Bags & Accessories',
    hasPriceDrop: true,
    brand: 'Vogue Essentials',
    colorName: 'Tan Caramel',
    priceHistory: [
      { date: 'Sep 01', price: 4200 },
      { date: 'Sep 10', price: 3600 },
      { date: 'Sep 20', price: 3200 },
      { date: 'Sep 29', price: 2999 },
    ]
  },
  {
    id: 'prod-bag-daraz',
    title: 'Classic Vintage Crossbody & Shoulder Bag with Gold Chain Accent',
    titleUrdu: 'Classic Vintage Crossbody Bag Sone ki Chain ke sath',
    price: 3450,
    originalPrice: 4500,
    currency: 'PKR',
    platform: 'daraz',
    platformUrl: 'https://www.daraz.pk/products/vintage-crossbody-bag',
    imageUrl: HANDBAG_SVG,
    similarityScore: 91,
    rating: 4.4,
    reviewsCount: 165,
    deliveryTime: '3-5 business days',
    deliveryCost: 150,
    inStock: true,
    seller: 'Karachi Leather Works',
    category: 'Bags & Accessories',
    hasPriceDrop: false,
    brand: 'Karachi Leather',
    colorName: 'Tan Brown',
    priceHistory: [
      { date: 'Sep 01', price: 4500 },
      { date: 'Sep 18', price: 3800 },
      { date: 'Sep 29', price: 3450 },
    ]
  }
];

export const MOCK_USER: User = {
  id: 'usr-pakistan-92',
  name: 'Hamza Farooq',
  email: 'hamza.f@example.com',
  phone: '+92 300 1234567',
  isGuest: false,
  preferredLanguage: 'en',
  avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=120&h=120&q=80',
};

export const INITIAL_SAVED_ITEMS: SavedItem[] = [
  {
    id: 'save-1',
    product: SAMPLE_PRODUCTS[0], // Black sneakers on Daraz
    savedAt: '2 days ago',
    initialPrice: 2850,
    currentPrice: 2499,
    priceChange: -351,
  },
  {
    id: 'save-2',
    product: SAMPLE_PRODUCTS[4], // Kurta on Gul Ahmed
    savedAt: '5 days ago',
    initialPrice: 5990,
    currentPrice: 5490,
    priceChange: -500,
  },
  {
    id: 'save-3',
    product: SAMPLE_PRODUCTS[7], // Smartwatch on PriceOye
    savedAt: '1 week ago',
    initialPrice: 1999,
    currentPrice: 1849,
    priceChange: -150,
  }
];

export const INITIAL_PRICE_ALERTS: PriceAlert[] = [
  {
    id: 'alert-1',
    product: SAMPLE_PRODUCTS[0],
    targetPrice: 2200,
    currentPrice: 2499,
    enabled: true,
    createdAt: 'Sep 20, 2026',
    notificationsSent: 1,
  },
  {
    id: 'alert-2',
    product: SAMPLE_PRODUCTS[7],
    targetPrice: 1700,
    currentPrice: 1849,
    enabled: true,
    createdAt: 'Sep 25, 2026',
    notificationsSent: 0,
  },
  {
    id: 'alert-3',
    product: SAMPLE_PRODUCTS[10], // Handbag
    targetPrice: 2500,
    currentPrice: 2999,
    enabled: false,
    createdAt: 'Sep 28, 2026',
    notificationsSent: 2,
  }
];

export const INITIAL_SEARCH_HISTORY: SearchHistoryItem[] = [
  {
    id: 'hist-1',
    queryImage: SNEAKER_IMAGE,
    queryText: 'kala joota joggers',
    timestamp: 'Today, 2:15 PM',
    resultsCount: 4,
    category: 'Footwear',
  },
  {
    id: 'hist-2',
    queryImage: KURTA_IMAGE,
    queryText: 'emerald stitched festive kurta',
    timestamp: 'Yesterday, 8:40 PM',
    resultsCount: 3,
    category: 'Ethnic Wear',
  },
  {
    id: 'hist-3',
    queryImage: SMARTWATCH_SVG,
    queryText: 't800 ultra orange strap',
    timestamp: 'Sep 26, 2026',
    resultsCount: 3,
    category: 'Smartwatches',
  }
];

export const SAMPLE_POPULAR_SEARCHES = [
  {
    label: 'Kala Joota (Black Sneakers)',
    labelUrdu: 'کالا جوتا',
    query: 'kala joota',
    image: SNEAKER_IMAGE,
    category: 'Footwear',
  },
  {
    label: 'Emerald Lawn Kurta (Suit)',
    labelUrdu: 'لان کرتا سوٹ',
    query: 'lawn kurta',
    image: KURTA_IMAGE,
    category: 'Ethnic Wear',
  },
  {
    label: 'T800 Ultra Smartwatch',
    labelUrdu: 'ٹی 800 سمارٹ واچ',
    query: 'smartwatch',
    image: SMARTWATCH_SVG,
    category: 'Smartwatches',
  },
  {
    label: 'Tan Leather Handbag',
    labelUrdu: 'چمڑے کا بیگ',
    query: 'handbag',
    image: HANDBAG_SVG,
    category: 'Bags',
  }
];
