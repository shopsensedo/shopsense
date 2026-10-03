/**
 * Marketplace query phrases for photo-search zero-shot classification.
 *
 * Instead of classifying into ~80 abstract categories ("dress", "shoes"),
 * the photo is classified directly against these marketplace-realistic
 * query phrases. The winning phrase is sent as the marketplace query.
 *
 * Rationale (Claude consultation 2026-10-02): the "right" category is
 * whichever word retrieves the right listings, not whichever matches the
 * photo abstractly. "women evening gown party wear" retrieves better than
 * "dress" for a Western gown; "women 2pc lawn suit" retrieves better for
 * ethnic wear. Both map to parent category "dress" for source routing.
 *
 * Phrases are written in the vocabulary Daraz/PriceOye sellers use.
 * Each phrase maps to a parent IMAGE_CATEGORIES key for PriceOye
 * routing (skipSource) and UI display.
 */
export interface QueryPhrase {
  /** the exact query string sent to the marketplace */
  phrase: string;
  /** parent category key (must exist in IMAGE_CATEGORIES) */
  category: string;
}

export const QUERY_PHRASES: QueryPhrase[] = [
  // ── Fashion: dresses & gowns ──
  { phrase: 'women evening gown party wear', category: 'dress' },
  { phrase: 'women western maxi dress', category: 'dress' },
  { phrase: 'women 2pc lawn suit', category: 'dress' },
  { phrase: 'women 3pc embroidered suit', category: 'dress' },
  { phrase: 'women kurti lawn', category: 'kurta' },
  { phrase: 'women fancy kurta', category: 'kurta' },
  { phrase: 'women embroidered kurti', category: 'kurta' },
  { phrase: 'ladies stitched suit', category: 'kurta' },
  { phrase: 'women kameez shalwar', category: 'kurta' },
  { phrase: 'men kurta shalwar', category: 'kurta' },
  { phrase: 'men shalwar kameez', category: 'shalwar kameez' },
  { phrase: 'women abaya', category: 'dress' },
  { phrase: 'women saree', category: 'dress' },

  // ── Fashion: shoes ──
  { phrase: 'men running sneakers', category: 'sneakers' },
  { phrase: 'men casual sneakers', category: 'sneakers' },
  { phrase: 'women sneakers', category: 'sneakers' },
  { phrase: 'men leather shoes formal', category: 'shoes' },
  { phrase: 'men sandals', category: 'sandals' },
  { phrase: 'women sandals heels', category: 'sandals' },
  { phrase: 'men slippers', category: 'slippers' },
  { phrase: 'women khussa', category: 'shoes' },
  { phrase: 'men joggers', category: 'sneakers' },
  { phrase: 'women pumps heels', category: 'shoes' },

  // ── Fashion: bags ──
  { phrase: 'women handbag', category: 'handbag' },
  { phrase: 'women clutch purse', category: 'handbag' },
  { phrase: 'clutch wallet women', category: 'handbag' },
  { phrase: 'men leather wallet', category: 'wallet' },
  { phrase: 'women wallet', category: 'wallet' },
  { phrase: 'laptop backpack', category: 'backpack' },
  { phrase: 'school backpack', category: 'backpack' },
  { phrase: 'travel duffel bag', category: 'handbag' },

  // ── Electronics: audio ──
  { phrase: 'wireless over-ear headphones', category: 'headphones' },
  { phrase: 'wireless earbuds', category: 'earbuds' },
  { phrase: 'bluetooth speaker', category: 'speaker' },
  { phrase: 'wired earphones', category: 'earphones' },
  { phrase: 'gaming headset', category: 'headphones' },
  { phrase: 'neckband bluetooth', category: 'earphones' },

  // ── Electronics: mobile & computing ──
  { phrase: '5g smartphone', category: 'mobile' },
  { phrase: 'android mobile', category: 'mobile' },
  { phrase: 'laptop core i5', category: 'laptop' },
  { phrase: 'gaming laptop', category: 'laptop' },
  { phrase: 'tablet', category: 'tablet' },
  { phrase: 'smartwatch', category: 'smartwatch' },
  { phrase: 'fitness band', category: 'fitness band' },
  { phrase: 'wireless mouse', category: 'mouse' },
  { phrase: 'mechanical keyboard', category: 'keyboard' },
  { phrase: 'led monitor', category: 'monitor' },

  // ── Electronics: accessories ──
  { phrase: 'fast charger', category: 'charger' },
  { phrase: 'usb c cable', category: 'cable' },
  { phrase: 'power bank 20000mah', category: 'power bank' },
  { phrase: 'phone cover', category: 'mobile' },
  { phrase: 'tempered glass', category: 'mobile' },

  // ── Electronics: home appliances ──
  { phrase: 'washing machine', category: 'washing machine' },
  { phrase: 'refrigerator', category: 'refrigerator' },
  { phrase: 'microwave oven', category: 'microwave' },
  { phrase: 'air fryer', category: 'air fryer' },
  { phrase: 'electric kettle', category: 'kettle' },
  { phrase: 'ceiling fan', category: 'fan' },
  { phrase: 'table fan', category: 'table fan' },
  { phrase: 'electric iron', category: 'iron' },
  { phrase: 'hair dryer', category: 'hair dryer' },
  { phrase: 'hair trimmer', category: 'trimmer' },

  // ── Watches & jewellery ──
  { phrase: 'men wrist watch', category: 'watch' },
  { phrase: 'women wrist watch', category: 'watch' },
  { phrase: 'smart watch', category: 'smartwatch' },
  { phrase: 'sunglasses men', category: 'sunglasses' },
  { phrase: 'sunglasses women', category: 'sunglasses' },

  // ── Beauty & personal care ──
  { phrase: 'perfume men', category: 'perfume' },
  { phrase: 'perfume women', category: 'perfume' },
  { phrase: 'face wash', category: 'face wash' },
  { phrase: 'shampoo', category: 'shampoo' },
  { phrase: 'lipstick', category: 'lipstick' },
  { phrase: 'foundation makeup', category: 'makeup' },

  // ── Home & kitchen ──
  { phrase: 'bedsheet king size', category: 'bedsheet' },
  { phrase: 'cooking pot set', category: 'cookware' },
  { phrase: 'non stick frying pan', category: 'cookware' },
  { phrase: 'water bottle', category: 'bottle' },
  { phrase: 'lunch box', category: 'lunch box' },

  // ── Sports & fitness ──
  { phrase: 'dumbbells', category: 'dumbbells' },
  { phrase: 'yoga mat', category: 'yoga mat' },
  { phrase: 'football', category: 'football' },
  { phrase: 'cricket bat', category: 'cricket' },

  // ── Baby & kids ──
  { phrase: 'baby diapers', category: 'diapers' },
  { phrase: 'baby wipes', category: 'wipes' },
  { phrase: 'baby milk formula', category: 'baby food' },
  { phrase: 'kids toys', category: 'toys' },

  // ── Grocery & household ──
  { phrase: 'cooking oil', category: 'cooking oil' },
  { phrase: 'detergent', category: 'detergent' },
  { phrase: 'tea', category: 'tea' },
];

/** Prompt templates for ensembling (Claude recommendation). */
export const PHRASE_TEMPLATES = [
  'a product photo of {x}',
  'a {x} for sale online',
  '{x} product listing',
];
