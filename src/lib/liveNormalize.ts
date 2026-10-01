/**
 * Pure normalization helpers for live marketplace results.
 *
 * Shared by the client pipeline (`src/lib/liveSearch.ts`) and unit tests.
 * NOTE: `api/_liveNormalize.ts` is a server copy of this file — Vercel
 * serverless functions cannot import from `../src/`. Keep the two in sync.
 * No network, no secrets, no side effects — every function here is safe to
 * unit-test with captured real API payloads.
 */
export type FeedSource = 'PriceOye' | 'Daraz';

/** One normalized marketplace listing. Shared by the API route, the client
 *  pipeline (`LiveListing` is structurally identical) and unit tests. */
export interface LiveItem {
  source: 'PriceOye' | 'Daraz';
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
