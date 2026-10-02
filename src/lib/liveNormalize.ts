/**
 * Pure normalization helpers for live marketplace results.
 *
 * Shared by the client pipeline (`src/lib/liveSearch.ts`) and unit tests.
 * NOTE: `api/_liveNormalize.ts` is a server copy of this file — Vercel
 * serverless functions cannot import from `../src/`. Keep the two in sync.
 * No network, no secrets, no side effects — every function here is safe to
 * unit-test with captured real API payloads.
 */
export type FeedSource = 'PriceOye' | 'Daraz' | 'Telemart';

/** One normalized marketplace listing. Shared by the API route, the client
 *  pipeline (`LiveListing` is structurally identical) and unit tests. */
export interface LiveItem {
  source: 'PriceOye' | 'Daraz' | 'Telemart';
  title: string;
  price: number;
  priceText: string;
  /** Raw price field(s) from the source JSON, kept next to the parsed value. */
  rawPrice?: unknown;
  image: string;
  url: string;
}

/** Hostname of a URL, lowercased; '' when the URL is unparseable. Handles
 *  protocol-relative URLs (Daraz `itemUrl` starts with `//`). */
export function hostnameOf(url: string): string {
  try {
    const u = url.startsWith('//') ? `https:${url}` : url;
    return new URL(u).hostname.toLowerCase();
  } catch {
    return '';
  }
}

/**
 * Host-validated source for one normalized listing.
 *
 * The source badge, the "Open on …" link label and the record's `source`
 * field all derive from this single value, so they can never disagree: if a
 * feed ever returns a foreign-host URL (PriceOye is an aggregator and carries
 * a `productUrl` fallback beside the typo'd `prodcutUrl`), the item is
 * relabelled to the host's owner instead of wearing the wrong badge.
 * Unknown or unparseable hosts keep the feed they came from.
 */
export function sourceForUrl(url: string, feedSource: FeedSource): FeedSource {
  const h = hostnameOf(url);
  // End-anchored: "daraz.pk.evil.com" must NOT match.
  if (/(^|\.)daraz\.[a-z]+$/.test(h)) return 'Daraz';
  if (/(^|\.)priceoye\.[a-z]+$/.test(h)) return 'PriceOye';
  // T3: Telemart rebranded to telex.pk (Shopify storefront); the suggest-API
  // URLs are telex.pk/products/… — the badge must say Telemart.
  if (/(^|\.)telex\.pk$/.test(h)) return 'Telemart';
  return feedSource;
}

/**
 * Parse a price value that may be a number or a string with commas,
 * decimals or currency text: 'Rs. 1,968' -> 1968, '1967.87' -> 1968,
 * '12,149' -> 12149, '' -> 0. Commas are always thousand separators in
 * these feeds; the first decimal number wins.
 */
export function toInt(s: unknown): number {
  const t = String(s ?? '').replace(/,/g, '');
  const m = t.match(/\d+(?:\.\d+)?/);
  if (!m) return 0;
  const n = Number(m[0]);
  return Number.isFinite(n) ? Math.round(n) : 0;
}

const CURRENCY_RE = /(rs\.?|pkr|₨)/i;

/**
 * Display rule for a parsed live price. Returns the formatted string, or
 * null when no number may be shown: missing/zero, below Rs 50, or source
 * text with no currency marker. The UI renders "Price unavailable" for null.
 */
export function formatPriceOrUnavailable(price: number, priceText?: string): string | null {
  if (!(price >= 50)) return null;
  if (priceText !== undefined && priceText.trim() !== '' && !CURRENCY_RE.test(priceText)) return null;
  return `Rs. ${price.toLocaleString('en-PK')}`;
}

/** True when the price may be displayed as a number — the same rule as
 *  formatPriceOrUnavailable. Used for price sorting (unavailable last). */
export function isPriceAvailable(price: number, priceText?: string): boolean {
  return formatPriceOrUnavailable(price, priceText) !== null;
}

/**
 * "was Rs 999 · 81% off" for live cards and the detail modal — from RAW
 * source fields only. Returns null unless the source sent both a raw
 * originalPrice and a raw discount string AND the parsed original is higher
 * than the current price. Nothing is calculated or invented: the original
 * price and the discount text are the source's own values (digits grouped
 * for readability).
 */
export function liveWasDiscount(
  rawPrice: unknown,
  price: number,
): { was: string; off: string } | null {
  const rp =
    rawPrice !== null && typeof rawPrice === 'object'
      ? (rawPrice as { originalPrice?: unknown; discount?: unknown })
      : null;
  const orig = toInt(rp?.originalPrice);
  const disc = String(rp?.discount ?? '').trim();
  if (!orig || !disc || orig <= price) return null;
  return {
    was: `Rs ${orig.toLocaleString('en-PK')}`,
    off: disc.replace(/off/i, 'off'),
  };
}

/** Normalize one raw PriceOye suggest-API item. Never drops; the client-side
 *  `isValid` filter decides what is usable, so API result counts are unchanged. */
export function normalizePriceOyeItem(it: any): LiveItem {
  const url = String(it?.prodcutUrl ?? it?.productUrl ?? '');
  return {
    source: sourceForUrl(url, 'PriceOye'),
    title: String(it?.title ?? ''),
    price: toInt(it?.lowest_price),
    priceText: `Rs ${String(it?.lowest_price ?? '').trim()}`,
    rawPrice: { lowest_price: it?.lowest_price ?? null },
    image: String(it?.image ?? ''),
    url,
  };
}

/** Normalize one raw Daraz catalog-AJAX item. Never drops; see above. */
export function normalizeDarazItem(it: any): LiveItem {
  const link = String(it?.itemUrl ?? '');
  const url = link.startsWith('http') ? link : `https:${link}`;
  const priceText = String(it?.priceShow ?? '');
  const price =
    typeof it?.price === 'number' && it.price > 0
      ? Math.round(it.price)
      : toInt(priceText) || toInt(it?.price);
  return {
    source: sourceForUrl(url, 'Daraz'),
    title: String(it?.name ?? ''),
    price,
    priceText,
    rawPrice: {
      price: it?.price ?? null,
      priceShow: it?.priceShow ?? null,
      originalPrice: it?.originalPrice ?? null,
      discount: it?.discount ?? null,
    },
    image: String(it?.image ?? ''),
    url,
  };
}

/**
 * Normalize one raw Telemart (telex.pk, Shopify) search-suggest product.
 * The suggest API returns { title, price: "2499.00", url: "/products/…?…",
 * image: "https://cdn.shopify.com/…" }. Prices are PKR (verified against
 * /cart.js → currency PKR); priceText carries the "Rs" marker so the
 * "Price unavailable" display rule treats it like the other sources.
 * Never drops; the client-side `isValid` filter decides what is usable.
 */
export function normalizeTelemartItem(it: any): LiveItem {
  const rawUrl = String(it?.url ?? '');
  const url = rawUrl.startsWith('http')
    ? rawUrl
    : `https://www.telex.pk${rawUrl.split('?')[0]}`;
  const priceText = `Rs ${String(it?.price ?? '').trim()}`;
  return {
    source: sourceForUrl(url, 'Telemart'),
    title: String(it?.title ?? ''),
    price: toInt(it?.price),
    priceText,
    rawPrice: { price: it?.price ?? null },
    image: String(it?.image ?? ''),
    url,
  };
}

// ---------------------------------------------------------------------------
// Cross-platform grouping (T3): cluster same-product listings from different
// sources by normalized-title overlap so the UI can show one product with
// per-platform prices instead of near-duplicate cards.
// ---------------------------------------------------------------------------

/** Filler words that carry no product identity ("Nike Shoes New 2024" ≡
 *  "Nike Shoes"). Gender/audience words (men/women/kids) are deliberately
 *  kept — they distinguish products. */
const GROUP_FILLER = new Set([
  'new', 'original', 'pakistan', 'pakistani', 'online', 'shopping', 'sale',
  'buy', 'best', 'hot', 'deal', 'deals', 'shop', 'store', 'official',
  'genuine', 'latest', 'branded', 'quality', 'premium', 'classic',
  'for', 'with', 'and', 'the', 'of', 'in', 'on', 'at', 'to', 'by', 'from',
]);

/** Lowercase alphanumeric tokens, filler dropped. Plurals are stemmed ONLY by
 *  a conservative rule (trailing "s" after a non-sibilant ending, length > 4)
 *  so "sneakers"→"sneaker" but "wireless", "plus" and "glass" survive intact.
 *  Single-character tokens survive only when they carry a digit
 *  ("Air Force 1" vs "Air Force 2" must stay distinct).
 *  Applied identically to both sides. */
export function titleTokens(title: string): string[] {
  // Decimals ("2.1") stay one token so spec measurements survive intact.
  const raw = String(title ?? '').toLowerCase().match(/\d+\.\d+|[a-z0-9]+/g) ?? [];
  return raw
    .map((w) =>
      w.length > 4 && w.endsWith('s') && !/(ss|us|is)$/.test(w) ? w.slice(0, -1) : w,
    )
    .filter((w) => (w.length > 1 || /\d/.test(w)) && !GROUP_FILLER.has(w));
}

/** Tokens carrying digits that look like model numbers ("11004", "s680",
 *  "550"). Pure decimal measurements ("2.1", "5.4") are specs, not models,
 *  and are excluded — otherwise "2.1 Channel" on two different speakers
 *  looks like a shared model number. */
function modelTokens(tokens: string[]): Set<string> {
  return new Set(tokens.filter((t) => /\d/.test(t) && !/^\d+(\.\d+)+$/.test(t)));
}

/**
 * Similarity in [0, 1] between two token lists. Rules, in order:
 *  1. Either side empty → 0.
 *  2. Conflicting model-number tokens ("11004" vs "11037") → 0. A
 *     more-specific designation ("1" vs "1 '07") does NOT veto.
 *  3. Overlap coefficient over DEDUPED tokens (a repeated word in a long
 *     title must not inflate the score).
 *  4. Short titles (≤ 4 tokens on the shorter side): only a perfect 1.0
 *     groups — with so few words anything less is a different product
 *     ("Hammer Wireless Headphone" vs "Trance 100 ANC Wireless Headphone").
 *  5. Longer titles sharing a model line additionally need their descriptive
 *     (non-model) tokens to agree — "Airbud 550" (earbuds) never merges
 *     into "Max 550 BT Plus" (speaker).
 *  6. Longer titles with no model numbers on either side need strong
 *     agreement (≥ 0.8).
 */
export function titleOverlap(a: string[], b: string[]): number {
  const ua = [...new Set(a)];
  const ub = [...new Set(b)];
  if (ua.length === 0 || ub.length === 0) return 0;
  const ma = modelTokens(ua);
  const mb = modelTokens(ub);
  let sharedModel = false;
  if (ma.size > 0 && mb.size > 0) {
    const aInB = [...ma].every((t) => mb.has(t));
    const bInA = [...mb].every((t) => ma.has(t));
    if (!aInB && !bInA) return 0;
    sharedModel = true;
  }
  const setB = new Set(ub);
  const sim = ua.filter((w) => setB.has(w)).length / Math.min(ua.length, ub.length);
  if (Math.min(ua.length, ub.length) <= 4) return sim === 1 ? 1 : 0;
  if (sharedModel) {
    const da = ua.filter((w) => !ma.has(w));
    const db = ub.filter((w) => !mb.has(w));
    if (da.length > 0 && db.length > 0) {
      const setDb = new Set(db);
      const dSim =
        da.filter((w) => setDb.has(w)).length / Math.min(da.length, db.length);
      if (dSim < 0.6) return 0;
    }
    return sim;
  }
  return sim >= 0.8 ? sim : 0;
}

/** Greedy clustering in ranked order: each item joins the most similar
 *  existing group at or above `threshold` (default 0.6), else starts a new
 *  group. titleOverlap itself returns 0 for empty sides, conflicting model
 *  numbers, and short-title near-misses, so those never group regardless of
 *  the threshold. Order of groups and of members follows the input ranking. */
export function groupByTitle<T extends { title: string }>(
  items: T[],
  threshold = 0.6,
): T[][] {
  const groups: { tokens: string[]; members: T[] }[] = [];
  for (const item of items) {
    const tokens = titleTokens(item.title);
    let best: (typeof groups)[number] | null = null;
    let bestSim = threshold;
    for (const g of groups) {
      const sim = titleOverlap(tokens, g.tokens);
      if (sim > 0 && sim >= bestSim) {
        bestSim = sim;
        best = g;
      }
    }
    if (best) best.members.push(item);
    else groups.push({ tokens, members: [item] });
  }
  return groups.map((g) => g.members);
}

/**
 * Client-only group-summary helpers for the GroupCard comparison UI.
 * (Like liveWasDiscount below: presentation helpers live in this copy only —
 * the server bundle never renders cards.)
 */

/** Distinct platform ids in ranked-member order. */
export function distinctPlatforms<T extends { platform: string }>(members: T[]): string[] {
  const seen = new Set<string>();
  for (const m of members) {
    if (!seen.has(m.platform)) seen.add(m.platform);
  }
  return [...seen];
}

/** `isPriceAvailable` for a grouped member — mirrors the card's price rule. */
function groupPriceAvailable(price: number, priceText?: string): boolean {
  return formatPriceOrUnavailable(price, priceText) !== null;
}

/** Lowest displayable price across members, or null when no member has a
 *  displayable price (missing / < Rs 50 / no currency marker). */
export function bestAvailablePrice<T extends { price: number; priceText?: string }>(
  members: T[],
): number | null {
  let best: number | null = null;
  for (const m of members) {
    if (!groupPriceAvailable(m.price, m.priceText)) continue;
    if (best === null || m.price < best) best = m.price;
  }
  return best;
}

// ---------------------------------------------------------------------------
// Honest result funnel (D2-2): every dropped listing is counted somewhere.
// ---------------------------------------------------------------------------

/** Raw stage counts observed while running the text-search pipeline. */
export interface FunnelStages {
  /** Listings returned by the sources after URL dedupe — the "M". */
  returned: number;
  /** Thumbnail cap (16): at most this many listings are compared. */
  cap: number;
  /** Thumbnails actually attempted (= min(returned, cap)). */
  attempted: number;
  /** Thumbnails that embedded OK and entered ranking. */
  usable: number;
  /** Listings whose thumbnail failed but were kept and scored by title match. */
  titleScored?: number;
  /** Survivors of the relevance floor. */
  floored: number;
  /** Image-scored survivors of the relevance shortlist. When absent, the
   *  shortlist-drop count falls back to the whole pool size. */
  imageKept?: number;
  /** Survivors of the relevance shortlist (top-8 / 12-cap). */
  pooled: number;
  /** Final products handed to the UI. */
  shown: number;
}

/** Per-stage drop counts derived from the raw stages. */
export interface FilterFunnel {
  returned: number;
  capDropped: number;
  compared: number;
  usableImage: number;
  /** Kept despite a failed thumbnail; scored by title match, marked
   *  "Image unavailable" in the UI. */
  titleScored: number;
  belowFloor: number;
  shortlistDropped: number;
  shown: number;
}

export function buildFilterFunnel(s: FunnelStages): FilterFunnel {
  return {
    returned: s.returned,
    capDropped: Math.max(0, s.returned - s.cap),
    compared: s.attempted,
    usableImage: s.usable,
    titleScored: s.titleScored ?? 0,
    belowFloor: Math.max(0, s.usable - s.floored),
    // The relevance cut applies to image-scored rows only — title-scored
    // rows bypass it (E1-1) — so shortlist drops are counted against the
    // image-scored survivors, not the whole pool.
    shortlistDropped: Math.max(0, s.floored - (s.imageKept ?? s.pooled)),
    shown: s.shown,
  };
}

/**
 * "How results were filtered": returned X, usable image Y, compared Z,
 * below relevance floor W, shown N — plus a parenthetical naming every
 * other drop (16-thumbnail cap, failed thumbnails, relevance shortlist).
 * Nothing is dropped without being counted.
 */
/**
 * One consistent chain, e.g.:
 *   returned 12 → images loaded 8 → title-scored 4 → below relevance floor 1 → shown 7
 * The "title-scored" step appears only when thumbnails failed and were kept
 * via title-match scoring ("Image unavailable"). Cap/shortlist drops ride in
 * the parenthetical notes.
 */
export function formatFilterFunnel(f: FilterFunnel): string {
  const chain = [
    `returned ${f.returned}`,
    `images loaded ${f.usableImage}`,
    ...(f.titleScored > 0 ? [`title-scored ${f.titleScored}`] : []),
    `below relevance floor ${f.belowFloor}`,
    `shown ${f.shown}`,
  ].join(' → ');
  const notes: string[] = [];
  if (f.capDropped > 0) notes.push(`${f.capDropped} dropped by the 16-thumbnail cap`);
  if (f.titleScored > 0)
    notes.push(`${f.titleScored} kept with "Image unavailable" (scored by title match)`);
  if (f.shortlistDropped > 0)
    notes.push(`${f.shortlistDropped} dropped by the relevance shortlist`);
  return notes.length > 0 ? `${chain} (${notes.join('; ')})` : chain;
}
