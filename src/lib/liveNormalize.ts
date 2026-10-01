/**
 * Pure normalization helpers for live marketplace results.
 *
 * Shared by `api/live-search.ts` and unit tests. No network, no secrets,
 * no side effects — every function here is safe to unit-test with captured
 * real API payloads.
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
 * '12,149' -> 12149, '' -> 0.
 */
export function toInt(s: unknown): number {
  const n = Number(String(s ?? '').replace(/[^0-9.]/g, ''));
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
