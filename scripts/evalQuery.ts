/**
 * T5 eval helper: prints the exact marketplace query the app would send to
 * /api/live-search for a raw user query, using the REAL client functions
 * (parseQuery, categorizeKeywords, buildMarketplaceQuery, categoryKeyForText,
 * priceOyeSellsCategory). Bundled with esbuild for node; image-asset imports
 * are stubbed out because only the query logic is used.
 *
 * Usage: node /tmp/evalQuery.mjs "<raw query>"
 * (bundle: npx esbuild scripts/evalQuery.ts --bundle --platform=node
 *   --format=esm --loader:.jpg=empty --loader:.png=empty --loader:.svg=empty
 *   --outfile=/tmp/evalQuery.mjs)
 */
import { parseQuery } from '../src/lib/localSearch';
import {
  buildMarketplaceQuery,
  categorizeKeywords,
  categoryKeyForText,
  priceOyeSellsCategory,
} from '../src/lib/liveSearch';

const raw = process.argv[2] ?? '';
const { keywords, priceIntent } = parseQuery(raw);
const category = categorizeKeywords(keywords);
const marketplaceQuery = buildMarketplaceQuery(raw, keywords, category) || keywords.join(' ');
const skipSource = priceOyeSellsCategory(categoryKeyForText(keywords))
  ? undefined
  : 'priceoye';
console.log(
  JSON.stringify({
    raw,
    english: keywords.join(' '),
    category,
    marketplaceQuery,
    skipSource,
    priceIntent,
  }),
);
