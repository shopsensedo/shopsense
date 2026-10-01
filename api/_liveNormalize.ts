/**
 * Pure normalization helpers for live marketplace results.
 *
 * SERVER COPY for the Vercel serverless function (`api/live-search.ts`).
 * Vercel does not bundle `../src/...` imports into serverless functions
 * (FUNCTION_INVOCATION_FAILED), so the API route imports from here instead.
 * Mirrors `src/lib/liveNormalize.ts` — keep the two in sync when the
 * normalization logic changes. No network, no secrets, no side effects.
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
  /** Survivors of the relevance floor. */
  floored: number;
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
    belowFloor: Math.max(0, s.usable - s.floored),
    shortlistDropped: Math.max(0, s.floored - s.pooled),
    shown: s.shown,
  };
}

/**
 * "How results were filtered": returned X, usable image Y, compared Z,
 * below relevance floor W, shown N — plus a parenthetical naming every
 * other drop (16-thumbnail cap, failed thumbnails, relevance shortlist).
 * Nothing is dropped without being counted.
 */
export function formatFilterFunnel(f: FilterFunnel): string {
  const parts = [
    `returned ${f.returned}`,
    `usable image ${f.usableImage}`,
    `compared ${f.compared}`,
    `below relevance floor ${f.belowFloor}`,
    `shown ${f.shown}`,
  ];
  const notes: string[] = [];
  if (f.capDropped > 0) notes.push(`16-thumbnail cap dropped ${f.capDropped}`);
  const thumbFailed = f.compared - f.usableImage;
  if (thumbFailed > 0)
    notes.push(`${thumbFailed} thumbnail${thumbFailed === 1 ? '' : 's'} failed to load`);
  if (f.shortlistDropped > 0) notes.push(`relevance shortlist dropped ${f.shortlistDropped}`);
  return notes.length > 0 ? `${parts.join(', ')} (${notes.join('; ')})` : parts.join(', ');
}
