/**
 * LIVE visual search pipeline (the hybrid design):
 *
 *   user photo → CLIP embed (in-browser)
 *     → zero-shot classify vs category text embeddings (encoded at runtime
 *        by the in-browser text tower from IMAGE_CATEGORIES labels)
 *     → /api/live-search?q=… fetches REAL listings from PriceOye + Daraz
 *     → product images embedded in-browser (via /api/img proxy where needed)
 *     → cosine-ranked vs the user's photo → real products, prices, links
 *
 * No mock data anywhere in this path: every listing comes from a live
 * site API seconds before it is shown.
 */
import type { PlatformType, Product } from '../types';
import {
  embedQueryImage,
  embedImageUrl,
  embedTextQuery,
  cosineSim,
  getCategoryEmbeddings,
  type CategoryTextEmbedding,
} from './clipEmbed';
import { parseQuery, isPriceWord, STOPWORDS, romanUrduMap, type PriceIntent } from './localSearch';
import { IMAGE_CATEGORIES } from '../data/imageCategories';
import brandsRaw from '../data/brands.json';
import coloursRaw from '../data/colours.json';
import categorySourcesRaw from '../data/categorySources.json';
import nounSynonymsRaw from '../data/nounSynonyms.json';
import { buildFilterFunnel, isPriceAvailable, type FilterFunnel } from './liveNormalize';

/** Category keys (IMAGE_CATEGORIES keys) that PriceOye actually sells:
// electronics and appliances only. Everything else is Daraz-only. */
const PRICEOYE_CATEGORIES: Set<string> = new Set(
  ((categorySourcesRaw as { priceOye?: string[] }).priceOye ?? []).map((c) =>
    c.toLowerCase(),
  ),
);

/**
 * True when PriceOye should be queried for this category key.
 * PriceOye sells electronics/appliances only — fashion, bags, shoes, kids,
 * beauty and home items go to Daraz alone, so PriceOye's electronics feed
 * can never leak into e.g. a sneakers search.
 */
export function priceOyeSellsCategory(categoryKey: string): boolean {
  return PRICEOYE_CATEGORIES.has(categoryKey.toLowerCase());
}

/**
 * Map mapped-English keywords onto an IMAGE_CATEGORIES key (for source
 * routing in text search). Longest key first so "smartwatch" beats "watch"
 * and "power bank" beats "bank". Returns '' when nothing matches — the
 * caller then queries both sources (today's behaviour).
 */
export function categoryKeyForText(keywords: string[]): string {
  const kw = new Set(keywords.map((k) => k.toLowerCase()));
  const keys = [...new Set(IMAGE_CATEGORIES.map((c) => c.key))].sort(
    (a, b) => b.length - a.length,
  );
  for (const key of keys) {
    const words = key.toLowerCase().split(' ');
    if (words.every((w) => kw.has(w))) return key;
  }
  return '';
}

/** Brand and colour word lists live in data files (not hardcoded) so they
 *  can grow without touching logic. Used by the short marketplace query
 *  builder and by brand/colour-aware ranking. */
export const BRAND_WORDS: string[] = (brandsRaw as string[]).map((b) => b.toLowerCase());
const COLOUR_WORDS: Set<string> = new Set(
  (coloursRaw as string[]).map((c) => c.toLowerCase()),
);

export interface Classified {
  category: string;
  query: string;
  score: number;
}

/**
 * Zero-shot classification: cosine(image embedding, category text embeddings).
 * Pure function — the category embeddings are supplied by the caller (encoded
 * at runtime via getCategoryEmbeddings), which keeps this unit-testable.
 */
export function classifyImage(
  embedding: number[],
  categories: CategoryTextEmbedding[],
): Classified {
  let best: Classified = { category: 'mobile', query: 'mobile', score: 0 };
  for (const { key, embedding: catVec } of categories) {
    const sim = cosineSim(embedding, catVec);
    if (sim > best.score) best = { category: key, query: key, score: sim };
  }
  return best;
}

export interface LiveListing {
  title: string;
  price: number;
  priceText: string;
  /** Raw price field(s) from the source JSON, kept next to the parsed value. */
  rawPrice?: unknown;
  image: string;
  url: string;
  source: 'PriceOye' | 'Daraz' | 'Telemart';
}

/**
 * Per-source outcome of a live fetch. A failed source is never skipped
 * silently — the UI shows it as "unavailable (blocked or timed out)".
 * A deliberately un-queried source (category routing) is marked
 * `skipped` — the UI shows "not searched (electronics only)".
 */
export interface SourceStatus {
  priceoye: { ok: true; count: number } | { ok: false; skipped?: boolean };
  daraz: { ok: true; count: number } | { ok: false; skipped?: boolean };
  telemart: { ok: true; count: number } | { ok: false; skipped?: boolean };
}

export const EMPTY_SOURCES: SourceStatus = {
  priceoye: { ok: false },
  daraz: { ok: false },
  telemart: { ok: false },
};

type SourceState = { ok: true; count: number } | { ok: false; skipped?: boolean };

/** "PriceOye: 8 results · Daraz: unavailable (blocked or timed out) · Telemart: 5 results" */
export function formatSourceStatus(s: SourceStatus): string {
  const part = (name: string, st: SourceState, skippedNote = 'not searched') =>
    st.ok
      ? `${name}: ${st.count} result${st.count === 1 ? '' : 's'}`
      : st.skipped
        ? `${name}: ${skippedNote}`
        : `${name}: unavailable (blocked or timed out)`;
  return (
    `${part('PriceOye', s.priceoye, 'not searched (electronics only)')}` +
    ` · ${part('Daraz', s.daraz)} · ${part('Telemart', s.telemart)}`
  );
}

const LIVE_TIMEOUT_MS = 12000;
const EMBED_TIMEOUT_MS = 30000;
const MAX_CANDIDATES = 16;

/**
 * Per-site search phrasing, tuned against the real APIs:
 * - PriceOye's suggest endpoint matches product names ("5g mobile" → smartphones,
 *   while "mobile" returns bar phones).
 * - Daraz's catalog search is a normal keyword search ("smartphone" → 40 phones).
 */
export const SITE_QUERIES: Record<string, { daraz: string; priceoye: string }> =
  Object.fromEntries(
    IMAGE_CATEGORIES.map((c) => [c.key, { daraz: c.daraz, priceoye: c.priceoye }]),
  );

async function fetchWithTimeout(url: string, ms: number): Promise<Response> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), ms);
  try {
    return await fetch(url, { signal: ctrl.signal });
  } finally {
    clearTimeout(t);
  }
}

/** Deduplicate live listings by product URL — the same product can appear in
 *  both sources' feeds. Keeps the first occurrence. */
export function dedupeListings(listings: LiveListing[]): LiveListing[] {
  const seen = new Set<string>();
  return listings.filter((l) => {
    const u = (l.url || '').trim();
    if (!u || seen.has(u)) return false;
    seen.add(u);
    return true;
  });
}

/** Real listings from /api/live-search (PriceOye + Daraz, fetched live).
 * When `siteQuery` is given it is sent to BOTH sources verbatim (text search
 * short query); otherwise the tuned per-category SITE_QUERIES are used
 * (image search keeps that behaviour).
 * `skipSource` tells the API not to query that source at all (category
 * routing: PriceOye is electronics/appliances only). The skipped source is
 * reported as `{ ok: false, skipped: true }`, never as a failure. */
export async function fetchLiveListings(
  category: string,
  fallbackQuery: string,
  siteQuery?: string,
  skipSource?: 'priceoye' | 'daraz' | 'telemart',
): Promise<{ listings: LiveListing[]; sources: SourceStatus; returned: number }> {
  const sq = siteQuery
    ? { daraz: siteQuery, priceoye: siteQuery }
    : (SITE_QUERIES[category] ?? { daraz: fallbackQuery, priceoye: fallbackQuery });
  let d: any;
  try {
    const skipParam = skipSource ? `&skip=${skipSource}` : '';
    const r = await fetchWithTimeout(
      `/api/live-search?q=${encodeURIComponent(sq.daraz)}&pq=${encodeURIComponent(sq.priceoye)}${skipParam}`,
      LIVE_TIMEOUT_MS,
    );
    if (!r.ok) throw new Error(`live-search ${r.status}`);
    d = await r.json();
  } catch {
    // The function itself failed — both sources are unknown/unavailable.
    return { listings: [], sources: EMPTY_SOURCES, returned: 0 };
  }
  // `returned` = listings from the sources after URL dedupe, BEFORE the
  // thumbnail cap — this is the honest "M" in "Showing N of M".
  const deduped = dedupeListings(
    (Array.isArray(d?.results) ? d.results : []) as LiveListing[],
  );
  const results = deduped.slice(0, MAX_CANDIDATES);
  // /api/live-search reports per-source outcomes as count | 'error' | 'skipped'.
  const src = d?.sources ?? {};
  const toStatus = (v: unknown): SourceState =>
    typeof v === 'number'
      ? { ok: true, count: v }
      : v === 'skipped'
        ? { ok: false, skipped: true }
        : { ok: false };
  return {
    listings: results,
    sources: {
      priceoye: toStatus(src.priceoye),
      daraz: toStatus(src.daraz),
      telemart: toStatus(src.telemart),
    },
    returned: deduped.length,
  };
}

/** Merge two per-source statuses: ok wins, counts add up. */
function mergeSourceStatus(a: SourceStatus, b: SourceStatus): SourceStatus {
  const merge = (
    x: SourceState,
    y: SourceState,
  ): SourceState =>
    y.ok
      ? { ok: true, count: (x.ok ? x.count : 0) + y.count }
      : x.ok
        ? x
        : y.skipped
          ? { ok: false, skipped: true }
          : x;
  return {
    priceoye: merge(a.priceoye, b.priceoye),
    daraz: merge(a.daraz, b.daraz),
    telemart: merge(a.telemart, b.telemart),
  };
}

/**
 * A server-side Gemini description of the user's photo (T2). When present,
 * its 2-3 queries drive the source fetch instead of the on-device
 * category classification.
 */

/**
 * T2: source routing for a Gemini-described photo. Derives the multiword
 * category key (longest key first, so "power bank" beats "bank") and skips
 * PriceOye unless that key is an electronics/appliances category. Never
 * routes word-by-word: single words miss every multiword electronics key.
 * Exported for unit tests.
 */
export function describedSkipSource(described: DescribedImage): 'priceoye' | undefined {
  const words = `${described.category} ${described.product_type} ${described.queries.join(' ')}`
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter(Boolean);
  const categoryKey = categoryKeyForText(words);
  return categoryKey && priceOyeSellsCategory(categoryKey) ? undefined : 'priceoye';
}
export interface DescribedImage {
  category: string;
  product_type: string;
  brand: string | null;
  queries: string[];
}

/** Exported for unit tests: build a live Product from a listing. */
export function toLiveProduct(
  l: LiveListing,
  score: number,
  textLabel?: TextSimilarityLabel,
  imageOk = true,
): Product {
  const platform = (
    l.source === 'Daraz' ? 'daraz' : l.source === 'Telemart' ? 'telemart' : 'priceoye'
  ) as PlatformType;
  return {
    id: `live-${l.source}-${encodeURIComponent(l.url).slice(-24)}`,
    title: l.title,
    titleUrdu: '',
    price: l.price,
    originalPrice: l.price,
    currency: 'PKR',
    rawPrice: l.rawPrice, // raw source JSON price fields, next to the parsed value
    priceText: l.priceText, // source's own price text ("Rs. 1,968") for display rules
    platform,
    platformUrl: l.url, // REAL product page
    imageUrl: l.image, // REAL product image (<img> needs no CORS)
    /** True when the thumbnail failed to load and the listing was kept via
     *  title-match scoring — the card shows "Image unavailable". */
    imageUnavailable: !imageOk,
    similarityScore: Math.max(1, Math.round(score * 100)),
    // Raw CLIP cosine, shown only in the detail modal — set ONLY for real
    // image-scored results. Title-scored fallbacks (imageOk=false) must not
    // wear a CLIP cosine they never earned.
    ...(imageOk ? { cosineSimilarity: score } : {}),
    textLabel, // brand-aware text label (text search only)
    rating: 0,
    reviewsCount: 0,
    deliveryTime: '',
    deliveryCost: 0,
    inStock: true,
    seller: l.source,
    category: '',
    priceHistory: [],
    isLive: true,
  };
}

/**
 * Human-readable similarity label replacing the old "NN% match".
 *
 * Thresholds are calibrated on the real CLIP (openai/clip-vit-base-patch32)
 * cosine distribution measured 2026-10-02 over product photos:
 * - image-image: self 1.00, same style/different colourway 0.87,
 *   same category 0.54-0.70, unrelated 0.47-0.57
 * - text-image: relevant matches 0.24-0.29 ("black shoes" -> black shoe 0.285,
 *   "handbag bag bags" -> handbag 0.27-0.29, "watch smartwatch" -> watch 0.256),
 *   irrelevant <= 0.22
 * So >= 0.75 means a near-duplicate visual match, >= 0.55 a same-category
 * visual match; cross-modal text matches honestly land in "Loosely similar"
 * (0.2-0.3 band) even when they are the best available result.
 */
export type SimilarityLabel = 'Very similar' | 'Similar' | 'Loosely similar';

export function similarityLabel(scorePercent: number): SimilarityLabel {
  if (scorePercent >= 75) return 'Very similar';
  if (scorePercent >= 55) return 'Similar';
  return 'Loosely similar';
}

/**
 * Labels for TEXT searches. Text-to-image CLIP scores live in a much lower
 * band than image-to-image scores, so the image thresholds would mislabel
 * correct text results as "Loosely similar". Thresholds are calibrated on the
 * real text-to-image distribution measured 2026-10-02 over live Daraz/PriceOye
 * thumbnails (Xenova/clip-vit-base-patch32, same weights as the browser q8):
 * relevant text-image pairs scored 0.24-0.32 (e.g. "black shoes sneakers
 * footwear" -> Black Camel Sneakers 0.300, "watch smartwatch" -> Oraimo Watch
 * Nova 0.302, "leather handbag bag bags" -> Richlook Handbag 0.308),
 * irrelevant pairs <= 0.22. So: >= 0.28 Strong (top of the relevant band),
 * >= 0.24 Good (bottom of the relevant band, clear of the <= 0.22 irrelevant
 * ceiling), below that Possible.
 */
export type TextSimilarityLabel = 'Strong match' | 'Good match' | 'Possible match';

export function textSimilarityLabel(score01: number): TextSimilarityLabel {
  if (score01 >= 0.28) return 'Strong match';
  if (score01 >= 0.24) return 'Good match';
  return 'Possible match';
}

/**
 * Relevance floor for TEXT search — raw text-to-image CLIP cosine.
 *
 * Calibrated on the real text-to-image distribution measured 2026-10-02 over
 * live Daraz/PriceOye thumbnails (Xenova/clip-vit-base-patch32, same weights
 * as the browser q8): relevant pairs scored 0.24-0.32 ("black shoes sneakers
 * footwear" -> Black Camel Sneakers 0.300, "watch smartwatch" -> Oraimo Watch
 * Nova 0.302, "leather handbag bag bags" -> Richlook Handbag 0.308), while
 * irrelevant pairs never exceeded 0.22. The floor is therefore set exactly
 * at 0.22 — the highest score an irrelevant pair ever reached — so nothing
 * observed-relevant is dropped while clear misses are removed. Applied to
 * the raw CLIP score, before the brand/colour/noun boosts.
 */
export const TEXT_RELEVANCE_FLOOR = 0.22;
/** A bad floor must never empty the page: always keep at least this many. */
export const MIN_TEXT_RESULTS = 3;

/**
 * Drop candidates below the relevance floor, but never fewer than `minKeep`
 * (top by score survive). Keeps "Showing N of M" honest: the caller reports
 * the pre-floor count as M.
 */
export function applyRelevanceFloor<T extends { score: number }>(
  scored: T[],
  floor: number,
  minKeep: number,
): T[] {
  const ranked = [...scored].sort((a, b) => b.score - a.score);
  const kept = ranked.filter((r) => r.score >= floor);
  return kept.length >= minKeep
    ? kept
    : ranked.slice(0, Math.min(minKeep, ranked.length));
}

/**
 * Brand/colour awareness — TEXT SEARCH ONLY.
 *
 * If a brand or colour word from the query appears in the result title, the
 * score gets a small +0.02 boost. The boost is deliberately less than half
 * the 0.04 gap between text label tiers (Strong ≥0.28, Good ≥0.24): it can
 * settle near-ties in favour of brand/colour matches, but it can never
 * promote a result across a full label tier on its own — CLIP's judgment
 * stays primary.
 *
 * If the query names a brand the title does not contain, the label is capped
 * at "Possible match" no matter how high the score: asking for "nike" and
 * getting a no-name shoe is a brand miss, not a strong match.
 */
export const BRAND_COLOUR_BOOST = 0.02;

export function brandColourBoostedScore(
  score: number,
  title: string,
  rawQuery: string,
  keywords: string[],
): number {
  const t = title.toLowerCase();
  const words = [...brandsInQuery(rawQuery, keywords), ...coloursInKeywords(keywords)];
  return words.some((w) => t.includes(w)) ? score + BRAND_COLOUR_BOOST : score;
}

export function brandAwareTextLabel(
  score: number,
  title: string,
  rawQuery: string,
  keywords: string[],
): TextSimilarityLabel {
  const brands = brandsInQuery(rawQuery, keywords);
  if (brands.length > 0 && !brands.some((b) => title.toLowerCase().includes(b))) {
    return 'Possible match';
  }
  return textSimilarityLabel(score);
}

/**
 * The query's specific product noun ("sasta smartwatch dikhao" -> "smartwatch",
 * "kala joota" -> "shoes", "nike white sneakers" -> "sneakers").
 * Mirrors the noun rules inside buildMarketplaceQuery (kept as a separate
 * function so the query builder's modifier pass stays untouched):
 * - the user's literal word wins when it is already an English product noun
 *   in its own dictionary mapping (longest literal wins: "watch smartwatch");
 * - otherwise the primary (first) product noun of the token's mapping;
 * - otherwise the category noun, else the last keyword, else ''.
 */
export function extractProductNoun(
  rawQuery: string,
  keywords: string[],
  category: string,
): string {
  const rawTokens = rawQuery
    .trim()
    .toLowerCase()
    .split(/\s+/)
    .filter((t) => t && !STOPWORDS.has(t) && !isPriceWord(t));

  const brand = brandsInQuery(rawQuery, keywords)[0] ?? '';
  const brandTokens = new Set(brand.split(' ').filter(Boolean));
  const colour = coloursInKeywords(keywords)[0] ?? '';

  const mapToken = (tok: string): string[] => {
    const v = romanUrduMap[tok];
    return v && v.length > 0 ? v : [tok];
  };

  let noun = '';
  for (const tok of rawTokens) {
    if (brandTokens.has(tok)) continue;
    const mapped = mapToken(tok);
    if (colour && mapped.includes(colour)) continue;
    if (PRODUCT_NOUNS.has(tok) && mapped.includes(tok)) {
      if (tok.length > noun.length) noun = tok;
      continue;
    }
    const primary = mapped.find((m) => PRODUCT_NOUNS.has(m));
    if (primary && !noun) noun = primary;
  }
  if (!noun) {
    noun = CATEGORY_NOUN[category] ?? keywords[keywords.length - 1] ?? '';
  }
  return noun;
}

/** Product-noun synonyms and the "specific" noun list live in a data file
 *  (nounSynonyms.json), not hardcoded, so they can grow without touching
 *  logic. */
const NOUN_SYNONYMS: Record<string, string[]> = (
  nounSynonymsRaw as { synonyms?: Record<string, string[]> }
).synonyms ?? {};
const SPECIFIC_NOUNS: Set<string> = new Set(
  ((nounSynonymsRaw as { specific?: string[] }).specific ?? []).map((s) =>
    s.toLowerCase(),
  ),
);

export const NOUN_BOOST = 0.02;

/** The noun plus every synonym that counts as a mention of it. */
export function nounVariants(noun: string): string[] {
  const n = noun.toLowerCase();
  return [n, ...((NOUN_SYNONYMS[n] ?? []).map((s) => s.toLowerCase()))];
}

/**
 * Product-noun boost — TEXT SEARCH ONLY. Extends the brand/colour mechanism:
 * if the query's product noun (or a dictionary synonym, e.g. "smartwatch" ->
 * "smart watch", "bt calling", "fitness tracker") appears in the title, the
 * score gets the same small +0.02 boost. Like the brand/colour boost it is
 * less than half a label tier, so CLIP's judgment stays primary.
 */
export function nounBoostedScore(
  score: number,
  title: string,
  noun: string,
): number {
  if (!noun) return score;
  const t = title.toLowerCase();
  return nounVariants(noun).some((v) => v && t.includes(v))
    ? score + NOUN_BOOST
    : score;
}

/**
 * Product-noun label cap — TEXT SEARCH ONLY. If the query names a *specific*
 * product noun (smartwatch, airpods, sneakers, … — see nounSynonyms.json) and
 * neither the noun nor any synonym appears in the title, the label is capped
 * at "Possible match": a phone is not a strong match for a smartwatch query.
 * Generic nouns ("shoes") are never capped — only boosted.
 *
 * The cap is NOT applied when the title contains a brand the user typed:
 * "Nike Air Force 1" is a sneakers-family product even though the word
 * "sneakers" never appears in the title.
 */
export function nounCapTextLabel(
  label: TextSimilarityLabel,
  title: string,
  noun: string,
  queryBrands: string[] = [],
): TextSimilarityLabel {
  if (!noun || !SPECIFIC_NOUNS.has(noun.toLowerCase())) return label;
  const t = title.toLowerCase();
  if (queryBrands.some((b) => b && t.includes(b.toLowerCase()))) return label;
  if (nounVariants(noun).some((v) => v && t.includes(v))) return label;
  return 'Possible match';
}

export type LiveProgress =
  | { stage: 'classify' }
  | { stage: 'fetch' }
  | { stage: 'match'; done: number; total: number };

/**
 * Weighted query terms for title-match scoring (thumbnail-fallback path).
 * A listing whose thumbnail fails to load is never dropped: it is scored
 * against these terms instead of a CLIP image embedding.
 */
export interface TitleTerms {
  /** Typed brands, e.g. ["nike"] — weight 3 each. */
  brands: string[];
  /** Product noun + dictionary synonyms, e.g. ["sneakers","trainers"] —
   *  matched as a group (any variant counts), weight 3. */
  nouns: string[];
  /** Colours from the mapped query, e.g. ["white"] — weight 2 each. */
  colours: string[];
  /** Remaining mapped keywords — weight 1 each. */
  words: string[];
}

/**
 * Title-match score in [0, 1]: the weighted fraction of query terms found in
 * the title (word-boundary match on lowercased alphanumeric tokens).
 * Pure and deterministic — no network, safe to unit-test.
 */
export function titleMatchScore(title: string, terms: TitleTerms): number {
  const tokens = new Set(title.toLowerCase().split(/[^a-z0-9]+/).filter(Boolean));
  if (tokens.size === 0) return 0;
  const hasTerm = (t: string): boolean =>
    t
      .toLowerCase()
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .every((part) => tokens.has(part));
  let matched = 0;
  let total = 0;
  for (const b of terms.brands) {
    if (!b.trim()) continue;
    total += 3;
    if (hasTerm(b)) matched += 3;
  }
  const nounList = terms.nouns.map((n) => n.trim()).filter(Boolean);
  if (nounList.length > 0) {
    total += 3;
    if (nounList.some(hasTerm)) matched += 3;
  }
  for (const c of terms.colours) {
    if (!c.trim()) continue;
    total += 2;
    if (hasTerm(c)) matched += 2;
  }
  for (const w of terms.words) {
    if (!w.trim()) continue;
    total += 1;
    if (hasTerm(w)) matched += 1;
  }
  return total === 0 ? 0 : matched / total;
}

/**
 * Label for a title-scored (thumbnail-failed) listing, on the same
 * Strong/Good/Possible tier scale as image-scored results so the two can be
 * ranked together. Thresholds are on the title-match fraction, NOT on CLIP
 * cosine — the two scales are never mixed. The brand-mismatch and
 * specific-noun caps apply exactly as for image-scored text results.
 */
export function titleMatchLabel(
  titleScore: number,
  title: string,
  noun: string,
  queryBrands: string[],
): TextSimilarityLabel {
  const base: TextSimilarityLabel =
    titleScore >= 0.66 ? 'Strong match' : titleScore >= 0.33 ? 'Good match' : 'Possible match';
  if (queryBrands.length > 0 && !queryBrands.some((b) => title.toLowerCase().includes(b))) {
    return 'Possible match';
  }
  return nounCapTextLabel(base, title, noun, queryBrands);
}

/**
 * Relevance first, then price sort (text searches with a price intent).
 * Results are ordered by label tier first (Strong, Good, Possible), then by
 * image-scored above title-scored ("Image unavailable") inside the same
 * tier, then by score — the two score scales (CLIP cosine vs title-match
 * fraction) are never compared across the imageOk boundary.
 *
 * Title-scored rows are NEVER dropped by the relevance bar: a failed
 * thumbnail keeps its listing. The relevance cut applies to image-scored
 * rows only — Strong/Good if at least 5 qualify, otherwise the top 8 by
 * rank — and the pool is capped at 12 total.
 *
 * Price-intent sorting then applies to the surviving pool only, so a cheap
 * irrelevant listing can never outrank a relevant one. Price-sorted results
 * are NOT tier-ordered: the price intent decides their final order.
 * `imageKept` reports how many pool rows are image-scored, so the funnel
 * counts shortlist drops honestly (the cut never applies to title-scored
 * rows).
 */
/** One row through relevance ranking: the listing, its score on its own
 *  scale (CLIP cosine for image-scored, title-match fraction for
 *  title-scored), its tier label, and whether its thumbnail loaded. */
export type RankedRow = {
  l: LiveListing;
  score: number;
  label: TextSimilarityLabel;
  imageOk: boolean;
};

/**
 * applyRelevanceThenSort's returned pool: the ranked rows, plus `imageKept`
 * (how many rows in the pool are image-scored) so the funnel can count the
 * relevance-shortlist drops honestly — title-scored rows were never subject
 * to that cut.
 */
export type Pooled = RankedRow[] & { imageKept: number };

export function applyRelevanceThenSort(
  scored: { l: LiveListing; score: number; label: TextSimilarityLabel; imageOk?: boolean }[],
  priceIntent: PriceIntent,
): Pooled {
  const tier = (label: TextSimilarityLabel): number =>
    label === 'Strong match' ? 0 : label === 'Good match' ? 1 : 2;
  // Tier first, then image-scored above title-scored ("Image unavailable")
  // inside the same tier, then score — the two score scales (CLIP cosine vs
  // title-match fraction) are never compared across the imageOk boundary.
  const withOk = scored.map((r) => ({ ...r, imageOk: r.imageOk ?? true }));
  const ranked = withOk.sort(
    (a, b) =>
      tier(a.label) - tier(b.label) ||
      (a.imageOk === b.imageOk ? 0 : a.imageOk ? -1 : 1) ||
      b.score - a.score,
  );
  // E1-1: a listing is NEVER excluded solely because its thumbnail failed.
  // Title-scored rows bypass the relevance bar entirely — they were kept
  // deliberately — and keep their ranked position (below image-scored rows
  // of the same tier). The relevance cut applies to image-scored rows only:
  // Strong/Good if there are at least 5, otherwise the top 8 by rank.
  // The pool is still capped at 12 total.
  const imageRanked = ranked.filter((r) => r.imageOk);
  const relevant = imageRanked.filter(
    (r) => r.label === 'Strong match' || r.label === 'Good match',
  );
  const imageKeep = new Set(relevant.length >= 5 ? relevant : imageRanked.slice(0, 8));
  const merged: RankedRow[] = [];
  for (const r of ranked) {
    if (r.imageOk) {
      if (imageKeep.has(r)) merged.push(r);
    } else {
      merged.push(r);
    }
  }
  const pool = merged.slice(0, 12);
  const imageKept = pool.filter((r) => r.imageOk).length;
  // Price-intent sorting: listings with no displayable price ("Price
  // unavailable") always sort after priced listings, in both directions.
  if (priceIntent === 'asc' || priceIntent === 'desc') {
    const avail = (r: { l: LiveListing }): boolean =>
      isPriceAvailable(r.l.price, r.l.priceText);
    return Object.assign(
      [...pool].sort((a, b) => {
        const aa = avail(a);
        const ab = avail(b);
        if (aa !== ab) return aa ? -1 : 1;
        return priceIntent === 'asc' ? a.l.price - b.l.price : b.l.price - a.l.price;
      }),
      { imageKept },
    );
  }
  return Object.assign(pool, { imageKept });
}

/**
 * Embed every candidate thumbnail (via the /api/img proxy) and cosine-score
 * it against the query vector. Shared by the visual and the text pipelines —
 * only the query vector differs (photo vs CLIP text embedding).
 *
 * A listing whose thumbnail fails to load is NOT dropped: it is kept with
 * imageOk=false, scored by title match against `titleTerms`, and the UI
 * marks it "Image unavailable". Callers rank imageOk=false items below
 * image-scored items of the same label tier.
 */
async function scoreThumbnails(
  listings: LiveListing[],
  queryVec: number[],
  titleTerms: TitleTerms,
  onProgress?: (p: LiveProgress | number) => void,
): Promise<{ l: LiveListing; score: number; imageOk: boolean }[]> {
  const deadline = Date.now() + EMBED_TIMEOUT_MS;
  const scored: { l: LiveListing; score: number; imageOk: boolean }[] = [];
  let done = 0;
  const queue = listings.slice();
  const workers = Array.from({ length: 4 }, async () => {
    while (queue.length > 0 && Date.now() < deadline) {
      const l = queue.shift()!;
      try {
        const vec = await embedImageUrl(`/api/img?url=${encodeURIComponent(l.image)}`);
        if (vec.length === queryVec.length) {
          scored.push({ l, score: cosineSim(queryVec, vec), imageOk: true });
        } else {
          scored.push({ l, score: titleMatchScore(l.title, titleTerms), imageOk: false });
        }
      } catch {
        // one bad image must not kill the search — keep the listing and
        // score it by title match instead of dropping it
        scored.push({ l, score: titleMatchScore(l.title, titleTerms), imageOk: false });
      }
      done++;
      onProgress?.({ stage: 'match', done, total: listings.length });
    }
  });
  await Promise.all(workers);
  return scored;
}

/**
 * Guess a site-query category from mapped English keywords. Returns a
 * SITE_QUERIES key, or '' when nothing matches — then fetchLiveListings
 * uses the mapped English query verbatim for both sources.
 */
function categorizeKeywords(keywords: string[]): string {
  const kw = new Set(keywords);
  const has = (...ws: string[]) => ws.some((w) => kw.has(w));
  if (has('watch', 'watches', 'smartwatch')) return 'watch';
  if (has('handbag', 'bag', 'bags', 'purse', 'clutch', 'tote', 'briefcase')) return 'handbag';
  if (has('backpack', 'luggage')) return 'backpack';
  if (has('earbuds', 'headphones', 'airpods', 'speaker', 'handsfree', 'earphones')) return 'earbuds';
  if (has('sunglasses', 'shades')) return 'sunglasses';
  if (has('laptop', 'macbook', 'notebook')) return 'laptop';
  if (has('kurta', 'shalwar', 'kameez', 'ethnic', 'lawn', 'dupatta', 'abaya', 'saree', 'lehenga', 'sherwani', 'frock')) return 'kurta';
  if (has('tshirt', 'shirt', 'hoodie', 'jacket', 'jeans', 'denim', 'sweater', 'trouser', 'pants', 'shorts', 'coat')) return 'tshirt';
  if (has('shoes', 'sneakers', 'footwear', 'boots', 'heels', 'sandals', 'slippers', 'joggers', 'khussa')) return 'shoes';
  if (has('mobile', 'smartphone', 'phone', 'iphone', 'samsung', 'charger', 'cable', 'tablet', 'ipad')) return 'mobile';
  return '';
}

/** Product-type nouns, used to pick the "type" word for a short marketplace query. */
const PRODUCT_NOUNS: Set<string> = new Set(
  'shoes sneakers footwear boots heels sandals slippers joggers khussa pumps loafers wedges watch watches smartwatch kurta shalwar kameez shirt tshirt hoodie jacket jeans bag bags handbag backpack mobile smartphone phone laptop earbuds airpods headphones sunglasses clothes clothing dress suit frock abaya saree gown skirt maxi'.split(
    ' ',
  ),
);

/** Canonical product noun per site-query category (fallback when the mapped
 *  keywords contain no product noun). */
const CATEGORY_NOUN: Record<string, string> = {
  mobile: 'smartphone',
  shoes: 'shoes',
  watch: 'watch',
  handbag: 'handbag',
  earbuds: 'earbuds',
  sunglasses: 'sunglasses',
  kurta: 'kurta',
  tshirt: 'shirt',
  backpack: 'backpack',
  laptop: 'laptop',
};

/**
 * Brands named in a query: single-word brands are found in the mapped
 * keywords ("nike"), multi-word brands ("gul ahmed", "junaid jamshed") are
 * matched against the raw query text since mapping splits them into tokens.
 */
export function brandsInQuery(rawQuery: string, keywords: string[]): string[] {
  const found: string[] = [];
  const raw = rawQuery.toLowerCase();
  for (const b of BRAND_WORDS) {
    if (b.includes(' ') ? raw.includes(b) : keywords.includes(b)) found.push(b);
  }
  return found;
}

/** Colour words present in the mapped (English) keywords. */
export function coloursInKeywords(keywords: string[]): string[] {
  return keywords.filter((k) => COLOUR_WORDS.has(k));
}

/**
 * Short marketplace query: at most 3 words, built from brand + colour +
 * modifiers + the most specific product noun. Daraz and PriceOye do literal
 * keyword matching, so a tight query lands on the right shelf; the longer
 * expanded keyword string stays as the CLIP ranking text, which needs the
 * synonyms ("footwear", "sneakers") to score thumbnails.
 *
 * The noun rule is the important one: a specific noun the user typed (or its
 * dictionary mapping) must never be replaced by a generic hypernym.
 * - The user's literal word wins when it is already an English product noun
 *   (it appears in its own dictionary mapping): "smartwatch" ->
 *   ["watch","smartwatch"] keeps "smartwatch", NOT "watch".
 * - Otherwise the primary (first) product noun of the token's mapping is
 *   used: "joota" -> ["shoes","sneakers","footwear"] gives "shoes".
 * - Longest literal wins when several are typed ("watch smartwatch").
 */
export function buildMarketplaceQuery(
  rawQuery: string,
  keywords: string[],
  category: string,
): string {
  const rawTokens = rawQuery
    .trim()
    .toLowerCase()
    .split(/\s+/)
    .filter((t) => t && !STOPWORDS.has(t) && !isPriceWord(t));

  const brand = brandsInQuery(rawQuery, keywords)[0] ?? '';
  const brandTokens = new Set(brand.split(' ').filter(Boolean));
  const colour = coloursInKeywords(keywords)[0] ?? '';

  const mapToken = (tok: string): string[] => {
    const v = romanUrduMap[tok];
    return v && v.length > 0 ? v : [tok];
  };

  let noun = '';
  const modifiers: string[] = [];
  const seenMod = new Set<string>();
  for (const tok of rawTokens) {
    if (brandTokens.has(tok)) continue;
    const mapped = mapToken(tok);
    if (colour && mapped.includes(colour)) continue;
    if (PRODUCT_NOUNS.has(tok) && mapped.includes(tok)) {
      if (tok.length > noun.length) noun = tok;
      continue;
    }
    const primary = mapped.find((m) => PRODUCT_NOUNS.has(m));
    if (primary && !noun) {
      noun = primary;
      continue;
    }
    const mod = mapped[0] ?? tok;
    if (mod && !PRODUCT_NOUNS.has(mod) && mod !== noun && !seenMod.has(mod)) {
      seenMod.add(mod);
      modifiers.push(mod);
    }
  }
  if (!noun) {
    noun =
      CATEGORY_NOUN[category] ??
      keywords[keywords.length - 1] ??
      '';
  }

  // Assemble: brand + colour + modifiers + noun, at most 3 words.
  // The noun is never dropped; overflow drops modifiers first, then colour
  // (brand + product type win when everything cannot fit).
  const brandWords = brand.split(' ').filter(Boolean);
  const colourWords = colour ? [colour] : [];
  const nounWords = noun ? [noun] : [];
  let words = [...brandWords, ...colourWords, ...modifiers, ...nounWords];
  if (words.length > 3 && modifiers.length > 0) {
    words = [...brandWords, ...colourWords, ...nounWords];
  }
  if (words.length > 3 && colourWords.length > 0) {
    words = [...brandWords, ...nounWords];
  }
  return words.slice(0, 3).join(' ');
}

/**
 * Live text search: Roman Urdu / English / mixed query →
 * mapped English keywords → /api/live-search on both sources →
 * CLIP text-to-image ranking over the thumbnails.
 * Never throws for upstream source problems; only a broken text-embedding
 * (model load failure) still throws.
 */
export async function searchLiveText(
  rawQuery: string,
  onProgress?: (p: LiveProgress | number) => void,
): Promise<{
  products: Product[];
  mappedQuery: string;
  /** Short query actually sent to Daraz/PriceOye (brand + colour + type). */
  marketplaceQuery: string;
  category: string;
  query: string;
  sources: SourceStatus;
  priceSort: PriceIntent;
  /** Results returned by the sources after URL dedupe — the "M" in "Showing N of M". */
  totalCandidates: number;
  /** Honest per-stage drop counts; null when the pipeline produced nothing. */
  funnel: FilterFunnel | null;
}> {
  // 1. Roman Urdu → English (word-boundary safe, mixed-language passthrough).
  // Price-intent words ("sasta", "mehnga") are stripped from the mapped query
  // here and applied as a result sort instead.
  const { keywords, priceIntent } = parseQuery(rawQuery);
  const english = keywords.join(' ');
  const category = categorizeKeywords(keywords);
  // Short query for the marketplaces (brand + colour + product type, ≤3 words);
  // the longer expanded string above stays as the CLIP ranking text.
  const marketplaceQuery = buildMarketplaceQuery(rawQuery, keywords, category) || english;

  // 2. live listings from the sites (short query sent to both sources)
  // Source routing: PriceOye sells electronics/appliances only — a fashion,
  // bags, shoes, kids, beauty or home query goes to Daraz alone.
  onProgress?.({ stage: 'fetch' });
  const skipSource = priceOyeSellsCategory(categoryKeyForText(keywords))
    ? undefined
    : 'priceoye';
  const { listings, sources, returned } = await fetchLiveListings(
    category,
    english,
    marketplaceQuery,
    skipSource,
  );
  const empty = {
    products: [] as Product[],
    mappedQuery: english,
    marketplaceQuery,
    category,
    query: english,
    sources,
    priceSort: priceIntent,
    totalCandidates: 0,
    funnel: null as FilterFunnel | null,
  };
  if (listings.length === 0) return empty;

  // 3. embed the English query with CLIP's text tower (downloads on first use)
  const queryVec = await embedTextQuery(english, (f) =>
    onProgress?.(typeof f === 'number' ? f * 0.5 : f),
  );

  // 4+5. rank thumbnails by text-to-image cosine similarity. Listings whose
  // thumbnail failed keep imageOk=false and carry a title-match score.
  const noun = extractProductNoun(rawQuery, keywords, category);
  const queryBrands = brandsInQuery(rawQuery, keywords);
  const nounVars = noun ? nounVariants(noun) : [];
  const queryColours = coloursInKeywords(keywords);
  const titleTerms: TitleTerms = {
    brands: queryBrands,
    nouns: nounVars,
    colours: queryColours,
    words: keywords.filter(
      (k) => !queryBrands.includes(k) && !nounVars.includes(k) && !queryColours.includes(k),
    ),
  };
  const scored = await scoreThumbnails(listings, queryVec, titleTerms, onProgress);
  if (scored.length === 0) return empty; // no listings at all — honest empty, not fake

  // 5a. relevance floor (text search only): applies to image-scored results
  // only, because it is calibrated on CLIP cosine. Title-scored results skip
  // it — they were kept deliberately — but still pass the label caps and the
  // shortlist below.
  const floored = applyRelevanceFloor(
    scored.filter((s) => s.imageOk),
    TEXT_RELEVANCE_FLOOR,
    MIN_TEXT_RESULTS,
  );

  // 5b. brand/colour + product-noun awareness (text search only): a brand,
  // colour or product-noun word from the query that appears in the title
  // earns a small score boost; the label is computed with the brand-mismatch
  // and specific-noun caps.
  const aware = floored.map(({ l, score }) => {
    const boosted = nounBoostedScore(
      brandColourBoostedScore(score, l.title, rawQuery, keywords),
      l.title,
      noun,
    );
    const label = nounCapTextLabel(
      brandAwareTextLabel(boosted, l.title, rawQuery, keywords),
      l.title,
      noun,
      queryBrands,
    );
    return { l, score: boosted, label, imageOk: true };
  });

  // 5c. thumbnail-failed listings: label from the title-match tier (same
  // Strong/Good/Possible scale), then ranked below image-scored results of
  // the same tier in applyRelevanceThenSort.
  const titleKept = scored
    .filter((s) => !s.imageOk)
    .map(({ l, score }) => ({
      l,
      score,
      label: titleMatchLabel(score, l.title, noun, queryBrands),
      imageOk: false,
    }));

  // 6. relevance first (on the brand-aware label), then an optional price
  // sort over the relevant set only
  const pool = applyRelevanceThenSort([...aware, ...titleKept], priceIntent);
  const products = pool.map(({ l, score, label, imageOk }) =>
    toLiveProduct(l, score, label, imageOk),
  );
  return {
    products,
    mappedQuery: english,
    marketplaceQuery,
    category,
    query: english,
    sources,
    priceSort: priceIntent,
    // M = what the sources returned after URL dedupe — NOT the thumbnail
    // survivors. The funnel below accounts for every later drop.
    totalCandidates: returned,
    funnel: buildFilterFunnel({
      returned,
      cap: MAX_CANDIDATES,
      attempted: listings.length,
      usable: scored.filter((s) => s.imageOk).length,
      titleScored: scored.filter((s) => !s.imageOk).length,
      floored: floored.length,
      pooled: pool.length,
      imageKept: pool.imageKept,
      shown: products.length,
    }),
  };
}
/**
 * Full live pipeline (visual). Never throws for upstream source problems — it returns
 * whatever it got (possibly zero products) together with the per-source
 * status, so the caller can show an honest error instead of fake results.
 * Only a broken query-image embedding (model load failure) still throws.
 */
export async function searchLive(
  dataUrl: string,
  onProgress?: (p: LiveProgress | number) => void,
  described?: DescribedImage | null,
): Promise<{
  products: Product[];
  category: string;
  query: string;
  sources: SourceStatus;
  described: DescribedImage | null;
}> {
  // 1. embed the user's photo (downloads the CLIP model on first use)
  const queryVec = await embedQueryImage(dataUrl, (f) =>
    onProgress?.(typeof f === 'number' ? f * 0.5 : f),
  );

  // 2. understand the image.
  // T2 path: a Gemini description supplies the 1-2 best site queries.
  // Fallback path: the on-device 80-category zero-shot classification.
  onProgress?.({ stage: 'classify' });
  let category: string;
  let siteQueries: string[];
  let skipSource: 'priceoye' | 'daraz' | 'telemart' | undefined;
  const describedOut = described && described.queries.length > 0 ? described : null;
  if (describedOut) {
    const words = `${describedOut.category} ${describedOut.product_type} ${describedOut.queries.join(' ')}`
      .toLowerCase()
      .split(/[^a-z0-9]+/)
      .filter(Boolean);
    // Route on the derived multiword category key (longest key first, so
    // "power bank" beats "bank") — never word-by-word, which misses every
    // multiword electronics category and misroutes "wall charger".
    const categoryKey = categoryKeyForText(words);
    category = categoryKey || describedOut.category;
    siteQueries = describedOut.queries.slice(0, 2);
    skipSource = describedSkipSource(describedOut);
  } else {
    // Category text embeddings are encoded once with the in-browser CLIP
    // text tower (preloaded on home idle).
    const categoryEmbeddings = await getCategoryEmbeddings(IMAGE_CATEGORIES);
    const cls = classifyImage(queryVec, categoryEmbeddings);
    category = cls.category;
    siteQueries = [cls.query];
    // 3. live listings from the sites. Source routing by detected category:
    // PriceOye is queried only for electronics/appliances; everything else is
    // Daraz + Telemart (general stores, incl. fashion).
    skipSource = priceOyeSellsCategory(cls.category) ? undefined : 'priceoye';
  }

  // 3. live listings from the sites — one fetch per query, merged and
  // deduped by URL (the describe path uses up to 2 queries).
  onProgress?.({ stage: 'fetch' });
  const seenUrls = new Set<string>();
  const listings: LiveListing[] = [];
  let sources: SourceStatus = { ...EMPTY_SOURCES };
  for (const q of siteQueries) {
    const r = await fetchLiveListings(category, q, undefined, skipSource);
    sources = mergeSourceStatus(sources, r.sources);
    for (const l of r.listings) {
      if (!seenUrls.has(l.url)) {
        seenUrls.add(l.url);
        listings.push(l);
      }
    }
  }
  const query = siteQueries[0];
  const empty = { products: [] as Product[], category, query, sources, described: describedOut };
  if (listings.length === 0) return empty;

  // 4+5. embed each product image (via proxy) and rank by visual similarity.
  // Listings whose thumbnail failed are kept and scored by title match
  // against the site query, ranked below image-scored items.
  const visualTerms: TitleTerms = {
    brands: [],
    nouns: [],
    colours: [],
    words: query.split(/\s+/).filter(Boolean),
  };
  const scored = await scoreThumbnails(listings, queryVec, visualTerms, onProgress);
  if (scored.length === 0) return empty; // no listings at all — honest empty, not fake

  // 6. rank: image-scored first (visual similarity), then title-scored
  scored.sort((a, b) => (a.imageOk === b.imageOk ? b.score - a.score : a.imageOk ? -1 : 1));
  return {
    products: scored.slice(0, 12).map(({ l, score, imageOk }) =>
      toLiveProduct(
        l,
        score,
        imageOk ? undefined : titleMatchLabel(score, l.title, '', []),
        imageOk,
      ),
    ),
    category,
    query,
    sources,
    described: describedOut,
  };
}
