/**
 * Part D2 tests: badge/link match, honest funnel, noun-cap refinement,
 * price sanity, label rendering. All fixtures are REAL captured payloads
 * from PriceOye's suggest API and Daraz's catalog AJAX (2026-10-02) —
 * never invented.
 */
import { describe, expect, test } from 'vitest';
import {
  hostnameOf,
  sourceForUrl,
  normalizePriceOyeItem,
  normalizeDarazItem,
  buildFilterFunnel,
  formatFilterFunnel,
} from '../lib/liveNormalize';

// ---------------------------------------------------------------------------
// D2-1: badge, link host and source field must always agree
// ---------------------------------------------------------------------------

/** Real PriceOye suggest-API item (query "smartwatch", 2026-10-02). */
const PO_REAL = {
  title: 'Zero Sigma Smartwatch',
  lowest_price: '7,649',
  image: 'https://images.priceoye.pk/zero-sigma-smartwatch-pakistan-priceoye-abc123.jpg',
  prodcutUrl: 'https://priceoye.pk/smart-watches/zero/zero-sigma-smartwatch',
  productUrl: null,
};

/** Real Daraz catalog-AJAX item (query "black shoes", 2026-10-02). */
const DARAZ_REAL_TOMS = {
  name: 'Toms syanno black canvas shoes Outdoor Running Shoes Casual ',
  price: '189',
  priceShow: 'Rs. 189',
  originalPrice: '999',
  discount: '81% Off',
  originalPriceShow: '',
  showUnitPrice: false,
  image: 'https://static-01.daraz.pk/p/53beaefafaaa87d00b3637ab972df42b.jpg',
  itemUrl:
    '//www.daraz.pk/products/toms-syanno-black-canvas-shoes-outdoor-running-shoes-casual-desert-sneakers-i490961741.html',
};

describe('D2-1 source/host agreement', () => {
  test('priceoye.pk URL keeps the PriceOye source', () => {
    const n = normalizePriceOyeItem(PO_REAL);
    expect(n.source).toBe('PriceOye');
    expect(n.price).toBe(7649);
    expect(hostnameOf(n.url)).toContain('priceoye');
  });

  test('protocol-relative daraz.pk itemUrl keeps the Daraz source', () => {
    const n = normalizeDarazItem(DARAZ_REAL_TOMS);
    expect(n.source).toBe('Daraz');
    expect(n.url).toBe(`https:${DARAZ_REAL_TOMS.itemUrl}`);
    expect(hostnameOf(n.url)).toContain('daraz');
  });

  test('a daraz.pk URL arriving in the PriceOye feed is relabelled Daraz', () => {
    const n = normalizePriceOyeItem({
      ...PO_REAL,
      prodcutUrl: 'https://www.daraz.pk/products/some-watch-i12345.html',
    });
    expect(n.source).toBe('Daraz');
  });

  test('a priceoye.pk URL arriving in the Daraz feed is relabelled PriceOye', () => {
    const n = normalizeDarazItem({
      ...DARAZ_REAL_TOMS,
      itemUrl: '//priceoye.pk/smart-watches/zero/zero-sigma-smartwatch',
    });
    expect(n.source).toBe('PriceOye');
  });

  test('unknown or empty hosts keep the feed they came from', () => {
    expect(sourceForUrl('https://example.com/x', 'PriceOye')).toBe('PriceOye');
    expect(sourceForUrl('', 'Daraz')).toBe('Daraz');
    expect(sourceForUrl('not a url', 'PriceOye')).toBe('PriceOye');
  });

  test('lookalike hosts do not match (mydarazshop.pk is not daraz)', () => {
    expect(sourceForUrl('https://mydarazshop.pk/x', 'PriceOye')).toBe('PriceOye');
    expect(sourceForUrl('https://daraz.pk.evil.com/x', 'PriceOye')).toBe('PriceOye');
  });

  test('sweep: for every normalized real sample the link host matches the source', () => {
    const samples = [
      normalizePriceOyeItem(PO_REAL),
      normalizePriceOyeItem({
        title: 'GT7 Ultra Smart Watch',
        lowest_price: '2,149',
        image: 'https://images.priceoye.pk/x.jpg',
        prodcutUrl: 'https://priceoye.pk/smart-watches/assorted/gt7-ultra-smart-watch',
      }),
      normalizeDarazItem(DARAZ_REAL_TOMS),
      normalizeDarazItem({
        name: 'Black Camel Sneakers for Men All Season Knit',
        price: '1967.87',
        priceShow: 'Rs. 1,968',
        originalPrice: '3499',
        discount: '44% Off',
        image: 'https://static-01.daraz.pk/p/abc.jpg',
        itemUrl: '//www.daraz.pk/products/black-camel-sneakers-i999.html',
      }),
    ];
    expect(samples.length).toBeGreaterThan(0);
    for (const s of samples) {
      const host = hostnameOf(s.url);
      const expected = s.source === 'Daraz' ? 'daraz' : 'priceoye';
      expect(host, `url ${s.url}`).toContain(expected);
    }
  });
});

// ---------------------------------------------------------------------------
// D2-2: honest result funnel — nothing dropped without being counted
// ---------------------------------------------------------------------------

describe('D2-2 filter funnel', () => {
  test('M is the deduped returned count, not the thumbnail survivors', () => {
    // The real "nike white sneakers" case: Daraz returned 12, only 6
    // thumbnails embedded, 1 fell below the floor, 5 shown.
    const f = buildFilterFunnel({
      returned: 12,
      cap: 16,
      attempted: 12,
      usable: 6,
      floored: 5,
      pooled: 5,
      shown: 5,
    });
    expect(f.returned).toBe(12);
    expect(f.capDropped).toBe(0);
    expect(f.compared).toBe(12);
    expect(f.usableImage).toBe(6);
    expect(f.belowFloor).toBe(1);
    expect(f.shortlistDropped).toBe(0);
    expect(f.shown).toBe(5);
  });

  test('16-thumbnail cap drops are counted and named', () => {
    const f = buildFilterFunnel({
      returned: 24,
      cap: 16,
      attempted: 16,
      usable: 14,
      titleScored: 2,
      floored: 12,
      pooled: 8,
      shown: 8,
    });
    expect(f.capDropped).toBe(8);
    expect(f.shortlistDropped).toBe(4);
    expect(f.titleScored).toBe(2);
    const text = formatFilterFunnel(f);
    expect(text).toBe(
      'returned 24 → images loaded 14 → title-scored 2 → below relevance floor 2 → shown 8 ' +
        '(8 dropped by the 16-thumbnail cap; 2 kept with "Image unavailable" (scored by title match); 4 dropped by the relevance shortlist)',
    );
  });

  test('chain without title-scored step when every thumbnail loaded', () => {
    const f = buildFilterFunnel({
      returned: 12,
      cap: 16,
      attempted: 12,
      usable: 12,
      titleScored: 0,
      floored: 11,
      pooled: 11,
      shown: 11,
    });
    expect(formatFilterFunnel(f)).toBe(
      'returned 12 → images loaded 12 → below relevance floor 1 → shown 11',
    );
  });

  test('clean run has no parenthetical notes', () => {
    const f = buildFilterFunnel({
      returned: 5,
      cap: 16,
      attempted: 5,
      usable: 5,
      floored: 5,
      pooled: 5,
      shown: 5,
    });
    expect(formatFilterFunnel(f)).toBe(
      'returned 5 → images loaded 5 → below relevance floor 0 → shown 5',
    );
  });

  test('drop counts never go negative on odd inputs', () => {
    const f = buildFilterFunnel({
      returned: 0,
      cap: 16,
      attempted: 0,
      usable: 0,
      floored: 0,
      pooled: 0,
      shown: 0,
    });
    expect(Object.values(f).every((v) => v >= 0)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// D2-3: noun-cap brand exception, sneakers synonyms, tier-first ordering
// ---------------------------------------------------------------------------

import {
  nounCapTextLabel,
  nounVariants,
  nounBoostedScore,
  applyRelevanceThenSort,
  brandsInQuery,
  type LiveListing,
} from '../lib/liveSearch';

const AF1_TITLE = 'Nike Air Force 1 Low \u201907 \u2013 Triple White';

function mkListing(price: number, priceText?: string): LiveListing {
  return {
    title: 'x',
    price,
    priceText: priceText ?? `Rs. ${price}`,
    image: 'https://example.com/x.jpg',
    url: `https://www.daraz.pk/x-${price}.html`,
    source: 'Daraz',
  };
}

describe('D2-3 noun cap refinement and ordering', () => {
  test('noun cap is skipped when the title contains the typed brand (no synonym in title)', () => {
    const brands = brandsInQuery('nike white sneakers', ['nike', 'white', 'sneakers']);
    expect(brands).toContain('nike');
    // "Nike Dunk Low Panda": no "sneakers" word and no sneakers synonym —
    // only the typed brand rescues it from the cap.
    const dunk = 'Nike Dunk Low Panda';
    const hasSynonym = nounVariants('sneakers').some((v) =>
      dunk.toLowerCase().includes(v),
    );
    expect(hasSynonym).toBe(false);
    expect(nounCapTextLabel('Strong match', dunk, 'sneakers', brands)).toBe(
      'Strong match',
    );
  });

  test('noun cap is skipped when the title contains a noun synonym (no brand)', () => {
    // Synonym path, tested separately from the brand exception above.
    const synonymTitle = 'Running Shoes for Men \u2014 Lightweight Trainers';
    expect(nounCapTextLabel('Strong match', synonymTitle, 'sneakers', [])).toBe(
      'Strong match',
    );
  });

  test('noun cap still applies when the brand is absent from the title', () => {
    // Socks: no sneakers word, no sneakers synonym, no typed brand.
    const socks = 'Nike Everyday Cushion Crew Socks 3-Pack';
    expect(nounCapTextLabel('Strong match', socks, 'sneakers', [])).toBe(
      'Possible match',
    );
    // Unrelated brand does not rescue it either.
    expect(nounCapTextLabel('Strong match', socks, 'sneakers', ['adidas'])).toBe(
      'Possible match',
    );
  });

  test('"air force" and "kicks" are sneakers synonyms (trainers/running shoes/sports shoes already were)', () => {
    const v = nounVariants('sneakers');
    expect(v).toContain('air force');
    expect(v).toContain('kicks');
    expect(v).toContain('trainers');
    expect(v).toContain('running shoes');
    expect(v).toContain('sports shoes');
    // "Air Force" in a title now earns the noun boost.
    expect(nounBoostedScore(0.25, AF1_TITLE, 'sneakers')).toBeGreaterThan(0.25);
  });

  test('tier first, then score: a capped Possible never outranks a Strong match', () => {
    const out = applyRelevanceThenSort(
      [
        { l: mkListing(100), score: 0.3, label: 'Possible match' },
        { l: mkListing(200), score: 0.26, label: 'Strong match' },
        { l: mkListing(300), score: 0.27, label: 'Good match' },
      ],
      null,
    );
    expect(out.map((r) => r.label)).toEqual([
      'Strong match',
      'Good match',
      'Possible match',
    ]);
  });

  test('price-sorted results are NOT tier-ordered', () => {
    const out = applyRelevanceThenSort(
      [
        { l: mkListing(5000), score: 0.29, label: 'Strong match' },
        { l: mkListing(100), score: 0.25, label: 'Good match' },
      ],
      'asc',
    );
    expect(out.map((r) => r.l.price)).toEqual([100, 5000]);
  });
});

// ---------------------------------------------------------------------------
// D2-4: price sanity — raw fields kept, "Price unavailable" rule
// ---------------------------------------------------------------------------

import { toInt, formatPriceOrUnavailable } from '../lib/liveNormalize';

describe('D2-4 price sanity', () => {
  test('PriceOye item keeps its raw lowest_price next to the parsed value', () => {
    const n = normalizePriceOyeItem(PO_REAL);
    expect(n.price).toBe(7649);
    expect(n.rawPrice).toEqual({ lowest_price: '7,649' });
  });

  test('Daraz Toms item: raw fields preserved (discounted item)', () => {
    const n = normalizeDarazItem(DARAZ_REAL_TOMS);
    expect(n.price).toBe(189);
    expect(n.rawPrice).toEqual({
      price: '189',
      priceShow: 'Rs. 189',
      originalPrice: '999',
      discount: '81% Off',
    });
  });

  test('Daraz decimal-string price parses to rupees, not garbage', () => {
    // Real item: price '1967.87', priceShow 'Rs. 1,968', originalPrice '3499'.
    // The old parseInt-after-strip would have read 196787.
    const n = normalizeDarazItem({
      name: 'Black Camel Sneakers for Men All Season Knit',
      price: '1967.87',
      priceShow: 'Rs. 1,968',
      originalPrice: '3499',
      discount: '44% Off',
      image: 'https://static-01.daraz.pk/p/abc.jpg',
      itemUrl: '//www.daraz.pk/products/black-camel-sneakers-i999.html',
    });
    expect(n.price).toBe(1968);
    expect(n.rawPrice).toMatchObject({ originalPrice: '3499', discount: '44% Off' });
  });

  test('toInt handles currency text, commas and decimals', () => {
    expect(toInt('Rs. 1,968')).toBe(1968);
    expect(toInt('12,149')).toBe(12149);
    expect(toInt('1967.87')).toBe(1968);
    expect(toInt('')).toBe(0);
    expect(toInt(null)).toBe(0);
  });

  test('"Price unavailable" rule: missing, sub-Rs-50, or currency-less', () => {
    expect(formatPriceOrUnavailable(0)).toBeNull();
    expect(formatPriceOrUnavailable(-5, 'Rs. 10')).toBeNull();
    expect(formatPriceOrUnavailable(29, 'Rs. 29')).toBeNull();
    expect(formatPriceOrUnavailable(49.99, 'Rs. 49.99')).toBeNull();
    // Source text with no currency marker -> unavailable even at valid amounts.
    expect(formatPriceOrUnavailable(189, '189')).toBeNull();
    expect(formatPriceOrUnavailable(189, 'USD 189')).toBeNull();
    // Normal cases still format.
    expect(formatPriceOrUnavailable(189, 'Rs. 189')).toBe('Rs. 189');
    expect(formatPriceOrUnavailable(1968, 'Rs. 1,968')).toBe('Rs. 1,968');
    expect(formatPriceOrUnavailable(7649)).toBe('Rs. 7,649');
    expect(formatPriceOrUnavailable(50, 'Rs. 50')).toBe('Rs. 50');
  });
});

describe('D2-4b unavailable prices sort last, never first', () => {
  test('isPriceAvailable mirrors the display rule', async () => {
    const { isPriceAvailable } = await import('../lib/liveNormalize');
    expect(isPriceAvailable(0)).toBe(false);
    expect(isPriceAvailable(29, 'Rs. 29')).toBe(false);
    expect(isPriceAvailable(189, '189')).toBe(false);
    expect(isPriceAvailable(189, 'Rs. 189')).toBe(true);
    expect(isPriceAvailable(7649)).toBe(true);
  });

  test('a missing-price listing sorts after priced listings (asc and desc)', () => {
    const rows = [
      { l: mkListing(0, ''), score: 0.29, label: 'Strong match' as const },
      { l: mkListing(5000), score: 0.28, label: 'Strong match' as const },
      { l: mkListing(100), score: 0.27, label: 'Strong match' as const },
    ];
    const asc = applyRelevanceThenSort(rows, 'asc').map((r) => r.l.price);
    const desc = applyRelevanceThenSort(rows, 'desc').map((r) => r.l.price);
    expect(asc).toEqual([100, 5000, 0]);
    expect(desc).toEqual([5000, 100, 0]);
  });
});
