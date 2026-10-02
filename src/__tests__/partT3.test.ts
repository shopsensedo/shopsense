/**
 * T3 — fashion source (Telemart/telex.pk) + cross-platform grouping.
 * The Telemart sample is a REAL captured suggest-API product
 * (query "nike shoes", 2026-10-02) — never invented. All grouping tests use
 * hand-written fixture titles clearly marked as such; no test fabricates
 * marketplace data.
 */
import { describe, expect, test } from 'vitest';
import {
  normalizeTelemartItem,
  sourceForUrl,
  titleTokens,
  titleOverlap,
  groupByTitle,
  distinctPlatforms,
  bestAvailablePrice,
} from '../lib/liveNormalize';
import { formatSourceStatus, type SourceStatus } from '../lib/liveSearch';

// Real captured Telemart (telex.pk Shopify suggest API) product.
const REAL_TELEMART_ITEM = {
  title: 'Milli Legacy 11004 Sneaker For Women',
  price: '2499.00',
  url: '/products/milli-legacy-11004-sneaker-for-women?_pos=1&_psq=nike+shoes&_psid=33ded35a8&_ss=e',
  image:
    'https://cdn.shopify.com/s/files/1/0830/0897/9164/files/Untitleddesign-2026-07-14T163851.521.jpg?v=17',
};

describe('normalizeTelemartItem', () => {
  test('normalizes the real captured suggest-API product', () => {
    const n = normalizeTelemartItem(REAL_TELEMART_ITEM);
    expect(n.source).toBe('Telemart');
    expect(n.title).toBe('Milli Legacy 11004 Sneaker For Women');
    expect(n.price).toBe(2499);
    // priceText carries the Rs marker so the "Price unavailable" display rule
    // treats it like the other sources.
    expect(n.priceText).toBe('Rs 2499.00');
    expect(n.rawPrice).toEqual({ price: '2499.00' });
    // Tracking query params are stripped; host is telex.pk.
    expect(n.url).toBe(
      'https://www.telex.pk/products/milli-legacy-11004-sneaker-for-women',
    );
    expect(n.image).toBe(REAL_TELEMART_ITEM.image);
  });

  test('missing price keeps the listing but shows as unavailable downstream', () => {
    const n = normalizeTelemartItem({ title: 'X', url: '/products/x' });
    expect(n.price).toBe(0);
    expect(n.source).toBe('Telemart');
  });

  test('absolute URL passes through unchanged', () => {
    const n = normalizeTelemartItem({
      ...REAL_TELEMART_ITEM,
      url: 'https://www.telex.pk/products/abc?x=1',
    });
    expect(n.url).toBe('https://www.telex.pk/products/abc?x=1');
  });
});

describe('sourceForUrl — Telemart', () => {
  test('telex.pk URLs are labelled Telemart', () => {
    expect(sourceForUrl('https://www.telex.pk/products/abc', 'Daraz')).toBe('Telemart');
  });
  test('lookalike host does not match (end-anchored)', () => {
    expect(sourceForUrl('https://telex.pk.evil.com/products/abc', 'Daraz')).toBe('Daraz');
  });
});

describe('titleTokens', () => {
  test('lowercases, stems plurals, drops filler', () => {
    expect(titleTokens('Nike Air Force 1 Sneakers New')).toEqual([
      'nike',
      'air',
      'force',
      '1',
      'sneaker',
    ]);
  });
  test('keeps distinguishing words (men/women)', () => {
    expect(titleTokens('Shoes for Women')).toEqual(['shoe', 'women']);
  });
  test('conservative stemming keeps wireless/plus/glass intact', () => {
    expect(titleTokens('Wireless Plus Glass')).toEqual(['wireless', 'plus', 'glass']);
    expect(titleTokens('Sneakers Earbuds Headphones')).toEqual(['sneaker', 'earbud', 'headphone']);
  });
  test('empty / filler-only titles yield no tokens', () => {
    expect(titleTokens('')).toEqual([]);
    expect(titleTokens('New Original Sale')).toEqual([]);
  });
});

describe('titleOverlap', () => {
  test('containment scores 1', () => {
    expect(titleOverlap(titleTokens('Nike Air Force 1'), titleTokens("Nike Air Force 1 '07 White"))).toBe(1);
  });
  test('disjoint titles score 0', () => {
    expect(titleOverlap(titleTokens('Nike shoes'), titleTokens('Samsung charger'))).toBe(0);
  });
  test('differing model numbers veto the match', () => {
    expect(
      titleOverlap(
        titleTokens('Milli Legacy 11004 Sneaker For Women'),
        titleTokens('Milli Legacy 11037 Sneakers For Women'),
      ),
    ).toBe(0);
  });
  test('same model number does not veto', () => {
    const sim = titleOverlap(
      titleTokens('Milli Legacy 11004 Sneaker For Women'),
      titleTokens('Milli Legacy 11004 Sneaker'),
    );
    expect(sim).toBe(1);
  });
  test('single-digit model numbers also veto', () => {
    expect(
      titleOverlap(titleTokens('Nike Air Force 1'), titleTokens('Nike Air Force 2')),
    ).toBe(0);
  });
  test('empty token list scores 0', () => {
    expect(titleOverlap([], titleTokens('Nike'))).toBe(0);
  });
  // --- Real-data false positives (query "audionic", 2026-10-02) ---
  test('repeated words in a long title do not inflate the score', () => {
    // "wireless" appears twice in the Daraz title; dedupe keeps this at 0.5.
    const sim = titleOverlap(
      titleTokens('Audionic Hammer Wireless Headphone'),
      titleTokens('Audionic Airbud 730 Quad Mic ENC Wireless Earbuds, Gaming Mode Low Latency TWS Earbuds Upto 45 Hour Playtime IPX5 Water Proof Wireless Earphone'),
    );
    expect(sim).toBeLessThan(0.6);
  });
  test('same model number, different product line stays separate', () => {
    // "550" matches but earbuds vs speaker: descriptive tokens differ.
    expect(
      titleOverlap(
        titleTokens('Audionic Airbud 550'),
        titleTokens('Audionic Max 550 BT Plus'),
      ),
    ).toBe(0);
  });
  test('short titles need a perfect match', () => {
    expect(
      titleOverlap(
        titleTokens('Audionic Hammer Wireless Headphone'),
        titleTokens('Audionic Trance 100 ANC Wireless Headphone'),
      ),
    ).toBe(0);
  });
  test('true cross-platform pair still groups', () => {
    const sim = titleOverlap(
      titleTokens('Audionic Max-230 Bluetooth Speaker'),
      titleTokens('Audionic Max-230 2.1 Channel Bluetooth Speaker | 16W Multi'),
    );
    expect(sim).toBeGreaterThanOrEqual(0.6);
  });
});

describe('groupByTitle', () => {
  // Fixture titles (hand-written for grouping logic, not marketplace data).
  const items = [
    { title: 'Nike Air Force 1', platform: 'daraz' },
    { title: "Nike Air Force 1 '07 White Sneakers", platform: 'telemart' },
    { title: 'Adidas Samba OG', platform: 'daraz' },
    { title: 'Milli Legacy 11004 Sneaker For Women', platform: 'telemart' },
    { title: 'Milli Legacy 11037 Sneakers For Women', platform: 'daraz' },
  ];

  test('same product across platforms forms one group; order preserved', () => {
    const groups = groupByTitle(items);
    expect(groups).toHaveLength(4);
    expect(groups[0].map((m) => m.platform)).toEqual(['daraz', 'telemart']);
    expect(groups[1]).toHaveLength(1);
  });

  test('model-number variants stay separate', () => {
    const groups = groupByTitle(items);
    const milli = groups.filter((g) => g[0].title.startsWith('Milli'));
    expect(milli).toHaveLength(2);
  });

  test('empty input and singletons', () => {
    expect(groupByTitle([])).toEqual([]);
    expect(groupByTitle([{ title: 'x' }])).toHaveLength(1);
  });

  test('stricter threshold splits looser matches', () => {
    const pair = [
      { title: 'Nike running shoes' },
      { title: 'Nike running shoes for men' },
    ];
    expect(groupByTitle(pair, 0.6)).toHaveLength(1);
    // Overlap is exactly 1.0 here (containment), so even 0.99 keeps it.
    expect(groupByTitle(pair, 1.01)).toHaveLength(2);
  });

  test('greedy: item joins the MOST similar group', () => {
    const triple = [
      { title: 'Nike Air Force 1' },
      { title: 'Adidas Superstar' },
      { title: 'Nike Air Force 1 white' },
    ];
    const groups = groupByTitle(triple);
    expect(groups[0].map((m) => m.title)).toEqual([
      'Nike Air Force 1',
      'Nike Air Force 1 white',
    ]);
  });
});

describe('group summary helpers', () => {
  const members = [
    { platform: 'daraz', price: 4999, priceText: 'Rs. 4,999' },
    { platform: 'telemart', price: 4799, priceText: 'Rs 4799.00' },
    { platform: 'daraz', price: 0, priceText: '' },
  ];

  test('distinctPlatforms in ranked order', () => {
    expect(distinctPlatforms(members)).toEqual(['daraz', 'telemart']);
  });

  test('bestAvailablePrice is the lowest displayable price', () => {
    expect(bestAvailablePrice(members)).toBe(4799);
  });

  test('bestAvailablePrice is null when nothing is displayable', () => {
    expect(bestAvailablePrice([{ price: 0, priceText: '' }])).toBeNull();
    // No currency marker → not displayable (D2-4 rule).
    expect(bestAvailablePrice([{ price: 5000, priceText: '5000' }])).toBeNull();
  });
});

describe('formatSourceStatus — Telemart', () => {
  test('telemart part is included', () => {
    const s: SourceStatus = {
      priceoye: { ok: false, skipped: true },
      daraz: { ok: true, count: 8 },
      telemart: { ok: true, count: 5 },
    };
    expect(formatSourceStatus(s)).toBe(
      'PriceOye: not searched (electronics only) · Daraz: 8 results · Telemart: 5 results',
    );
  });

  test('failed telemart is reported, not hidden', () => {
    const s: SourceStatus = {
      priceoye: { ok: true, count: 3 },
      daraz: { ok: true, count: 4 },
      telemart: { ok: false },
    };
    expect(formatSourceStatus(s)).toContain('Telemart: unavailable (blocked or timed out)');
  });
});
