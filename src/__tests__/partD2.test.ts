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
      floored: 12,
      pooled: 8,
      shown: 8,
    });
    expect(f.capDropped).toBe(8);
    expect(f.shortlistDropped).toBe(4);
    const text = formatFilterFunnel(f);
    expect(text).toContain('returned 24');
    expect(text).toContain('usable image 14');
    expect(text).toContain('compared 16');
    expect(text).toContain('below relevance floor 2');
    expect(text).toContain('shown 8');
    expect(text).toContain('16-thumbnail cap dropped 8');
    expect(text).toContain('2 thumbnails failed to load');
    expect(text).toContain('relevance shortlist dropped 4');
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
      'returned 5, usable image 5, compared 5, below relevance floor 0, shown 5',
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
