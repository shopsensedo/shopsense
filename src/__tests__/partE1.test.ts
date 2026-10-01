/**
 * Part E1-1 tests: thumbnail-failure fallback. All titles are REAL captured
 * Daraz listing titles (query "nike white sneakers", 2026-10-02) — never
 * invented.
 */
import { describe, expect, test } from 'vitest';
import {
  titleMatchScore,
  titleMatchLabel,
  applyRelevanceThenSort,
  nounVariants,
  type TitleTerms,
} from '../lib/liveSearch';
import { liveWasDiscount } from '../lib/liveNormalize';
import type { LiveListing } from '../lib/liveSearch';

// Query "nike white sneakers" -> mapped keywords [white, sneakers, shoes, nike]
const TERMS: TitleTerms = {
  brands: ['nike'],
  nouns: nounVariants('sneakers'), // sneakers + air force, trainers, running shoes, kicks, sports shoes
  colours: ['white'],
  words: ['shoes'],
};

function listing(title: string): LiveListing {
  return {
    title,
    url: 'https://www.daraz.pk/products/x.html',
    image: 'https://pk-live-21.slatic.net/kf/x.jpg',
    price: 1000,
    priceText: 'Rs. 1,000',
    source: 'Daraz',
  };
}

describe('titleMatchScore', () => {
  test('brand + noun + colour title scores Strong (>= 0.66)', () => {
    // Real captured title
    const s = titleMatchScore('Nike Air Force 1 White Sneakers for Men – Premium Quality', TERMS);
    expect(s).toBeGreaterThanOrEqual(0.66);
  });

  test('synonym variant counts for the noun group', () => {
    // "running shoes" is a sneakers synonym; no brand, no colour
    const s = titleMatchScore('Men Running Shoes Sports Joggers Lightweight', {
      brands: [],
      nouns: nounVariants('sneakers'),
      colours: [],
      words: [],
    });
    expect(s).toBe(1); // noun group is the only term and it matched
  });

  test('title without the brand scores lower and gets brand-capped', () => {
    const s = titleMatchScore('Men’s White Sneakers | Stylish Casual & Sports', TERMS);
    expect(s).toBeLessThan(0.66);
    expect(titleMatchLabel(s, 'Men’s White Sneakers | Stylish Casual & Sports', 'sneakers', ['nike'])).toBe(
      'Possible match',
    );
  });

  test('irrelevant title scores 0', () => {
    expect(titleMatchScore('Vivo Y36 Smartphone 8GB RAM 128GB', TERMS)).toBe(0);
  });

  test('empty title scores 0', () => {
    expect(titleMatchScore('', TERMS)).toBe(0);
  });
});

describe('titleMatchLabel', () => {
  test('high title score with brand present -> Strong match', () => {
    expect(
      titleMatchLabel(0.9, 'Nike White Sneakers for Men', 'sneakers', ['nike']),
    ).toBe('Strong match');
  });

  test('mid title score -> Good match', () => {
    expect(titleMatchLabel(0.5, 'White Sneakers for Men', 'sneakers', [])).toBe('Good match');
  });

  test('specific-noun cap applies to title-scored results too', () => {
    // Query noun "smartwatch" (specific) absent from the title -> Possible
    expect(titleMatchLabel(0.9, 'Vivo Y36 Smartphone 8GB', 'smartwatch', [])).toBe(
      'Possible match',
    );
  });
});

describe('applyRelevanceThenSort imageOk ordering', () => {
  test('title-scored ("Image unavailable") ranks below image-scored of the same tier', () => {
    const rows = [
      { l: listing('Nike White Sneakers'), score: 0.9, label: 'Strong match' as const, imageOk: false },
      { l: listing('Nike Air Force 1'), score: 0.3, label: 'Strong match' as const, imageOk: true },
      { l: listing('White Sneakers'), score: 0.25, label: 'Good match' as const, imageOk: true },
    ];
    const out = applyRelevanceThenSort(rows, null);
    expect(out.map((r) => r.l.title)).toEqual([
      'Nike Air Force 1', // Strong + image
      'Nike White Sneakers', // Strong + title-scored (below image-scored Strong)
      'White Sneakers', // Good
    ]);
  });

  test('title-scored "Possible" rows survive the relevance cut when image-scored rows are plentiful', () => {
    // 5 image-scored Strong results trigger the >= 5 relevance cut; the
    // image-scored Possibles are cut, but the title-scored Possibles
    // ("Image unavailable") must NOT be dropped.
    const rows = [
      ...[0, 1, 2, 3, 4].map((i) => ({
        l: listing(`Strong ${i}`),
        score: 0.9 - i * 0.01,
        label: 'Strong match' as const,
        imageOk: true,
      })),
      ...[0, 1, 2].map((i) => ({
        l: listing(`Poss ${i}`),
        score: 0.1,
        label: 'Possible match' as const,
        imageOk: true,
      })),
      ...[0, 1].map((i) => ({
        l: listing(`Title ${i}`),
        score: 0.2,
        label: 'Possible match' as const,
        imageOk: false,
      })),
    ];
    const out = applyRelevanceThenSort(rows, null);
    const titles = out.map((r) => r.l.title);
    expect(titles).toContain('Title 0');
    expect(titles).toContain('Title 1');
    expect(titles).not.toContain('Poss 0');
    expect(titles).not.toContain('Poss 1');
    expect(titles).not.toContain('Poss 2');
    expect(out.imageKept).toBe(5);
  });
});

describe('liveWasDiscount (E1-5)', () => {
  // Real captured Daraz raw fields (query "black shoes", 2026-10-02)
  const TOMS_RAW = {
    price: '189',
    priceShow: 'Rs. 189',
    originalPrice: '999',
    discount: '81% Off',
  };
  const CAMEL_RAW = {
    price: '1967.87',
    priceShow: 'Rs. 1,968',
    originalPrice: '3499',
    discount: '44% Off',
  };

  test('Toms: shows raw "was Rs 999 · 81% off"', () => {
    expect(liveWasDiscount(TOMS_RAW, 189)).toEqual({ was: 'Rs 999', off: '81% off' });
  });

  test('Black Camel: raw original higher than parsed price', () => {
    expect(liveWasDiscount(CAMEL_RAW, 1968)).toEqual({ was: 'Rs 3,499', off: '44% off' });
  });

  test('null when the discount field is missing', () => {
    expect(liveWasDiscount({ originalPrice: '999' }, 189)).toBeNull();
  });

  test('null when the originalPrice field is missing', () => {
    expect(liveWasDiscount({ discount: '81% Off' }, 189)).toBeNull();
  });

  test('null when original is not higher than the current price', () => {
    expect(liveWasDiscount({ originalPrice: '189', discount: '81% Off' }, 189)).toBeNull();
    expect(liveWasDiscount({ originalPrice: '100', discount: '10% Off' }, 189)).toBeNull();
  });

  test('null when rawPrice is absent (e.g. PriceOye items)', () => {
    expect(liveWasDiscount(undefined, 189)).toBeNull();
    expect(liveWasDiscount({ lowest_price: '7649' }, 7649)).toBeNull();
  });
});

describe('toLiveProduct honesty (E1-1 corrections)', () => {
  const listing: LiveListing = {
    source: 'Daraz',
    title: 'Nike Dunk Low Panda',
    price: 5000,
    priceText: 'Rs. 5,000',
    image: 'https://pk-live-21.slatic.net/x.jpg',
    url: 'https://www.daraz.pk/products/x.html',
  };

  test('image-scored product keeps its CLIP cosine', async () => {
    const { toLiveProduct } = await import('../lib/liveSearch');
    const p = toLiveProduct(listing, 0.81, 'Good match', true);
    expect(p.cosineSimilarity).toBe(0.81);
    expect(p.imageUnavailable).toBe(false);
  });

  test('title-scored fallback carries NO CLIP cosine and is marked unavailable', async () => {
    const { toLiveProduct } = await import('../lib/liveSearch');
    const p = toLiveProduct(listing, 0.5, 'Good match', false);
    expect(p.cosineSimilarity).toBeUndefined();
    expect(p.imageUnavailable).toBe(true);
  });
});
