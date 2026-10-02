/**
 * R3 eval2: bundles the REAL client query pipeline for node.
 * Bundled with esbuild at eval startup; image assets stubbed.
 */
import { parseQuery } from '../../src/lib/localSearch';
import {
  buildMarketplaceQuery,
  categorizeKeywords,
  categoryKeyForText,
  priceOyeSellsCategory,
} from '../../src/lib/liveSearch';
import { IMAGE_CATEGORIES } from '../../src/data/imageCategories';

export interface TextPlan {
  english: string;
  category: string;
  marketplaceQuery: string;
  skipSource: 'priceoye' | undefined;
  priceIntent: 'asc' | 'desc' | null;
}

export function planTextQuery(raw: string): TextPlan {
  const { keywords, priceIntent } = parseQuery(raw);
  const category = categorizeKeywords(keywords);
  const marketplaceQuery =
    buildMarketplaceQuery(raw, keywords, category) || keywords.join(' ');
  const skipSource = priceOyeSellsCategory(categoryKeyForText(keywords))
    ? undefined
    : 'priceoye';
  return {
    english: keywords.join(' '),
    category,
    marketplaceQuery,
    skipSource,
    priceIntent,
  };
}

export function planPhotoQuery(categoryKey: string): {
  marketplaceQuery: string;
  skipSource: 'priceoye' | undefined;
} {
  // Mirrors the app's classify path: the winning category KEY is the site
  // query; PriceOye is queried only for electronics/appliance keys.
  const skipSource = priceOyeSellsCategory(categoryKey) ? undefined : 'priceoye';
  return { marketplaceQuery: categoryKey, skipSource };
}

export { IMAGE_CATEGORIES };
