import { describe, expect, it } from 'vitest';
import {
  applyRelevanceThenSort,
  buildMarketplaceQuery,
  brandAwareTextLabel,
  brandColourBoostedScore,
  dedupeListings,
  type LiveListing,
} from '../lib/liveSearch';
import {
  cacheKeyForText,
  getCached,
  setCached,
  CACHE_TTL_MS,
} from '../lib/searchCache';
import { parseQuery } from '../lib/localSearch';

const listing = (url: string, price: number, title = 'x'): LiveListing => ({
  title,
  price,
  priceText: `Rs ${price}`,
  image: 'img',
  url,
  source: 'Daraz',
});

// ---------- C1: relevance first, then price sort ----------

describe('applyRelevanceThenSort', () => {
  it('keeps only Good-or-better when 5+ qualify, then sorts by price asc', () => {
    const scored = [
      { l: listing('u1', 900), score: 0.31, label: 'Strong match' as const }, // would be 2nd by price
      { l: listing('u2', 500), score: 0.26, label: 'Good match' as const }, // cheapest, relevant
      { l: listing('u3', 700), score: 0.27, label: 'Good match' as const },
      { l: listing('u4', 300), score: 0.20, label: 'Possible match' as const }, // cheapest overall but irrelevant
      { l: listing('u5', 400), score: 0.21, label: 'Possible match' as const }, // irrelevant
      { l: listing('u6', 800), score: 0.29, label: 'Strong match' as const },
      { l: listing('u7', 600), score: 0.25, label: 'Good match' as const },
    ];
    const out = applyRelevanceThenSort(scored, 'asc');
    // irrelevant u4/u5 excluded even though cheaper
    expect(out.map((r) => r.l.url)).toEqual(['u2', 'u7', 'u3', 'u6', 'u1']);
    expect(out.every((r) => r.label !== 'Possible match')).toBe(true);
  });

  it('falls back to top 8 by similarity when fewer than 5 are Good-or-better', () => {
    const scored = Array.from({ length: 10 }, (_, i) => ({
      l: listing(`u${i}`, 1000 - i * 10),
      score: 0.30 - i * 0.02, // 0.30, 0.28, 0.26, 0.24, 0.22, ...
      label: (i < 4 ? 'Good match' : 'Possible match') as 'Good match' | 'Possible match',
    }));
    const out = applyRelevanceThenSort(scored, 'desc');
    expect(out).toHaveLength(8); // top 8 by similarity, not just the 4 relevant
    const prices = out.map((r) => r.l.price);
    expect([...prices].sort((a, b) => b - a)).toEqual(prices); // then price-sorted desc
  });

  it('keeps CLIP order (top 12) when there is no price intent', () => {
    const scored = Array.from({ length: 14 }, (_, i) => ({
      l: listing(`u${i}`, 500 + i),
      score: 0.35 - i * 0.01,
      label: 'Good match' as const,
    }));
    const out = applyRelevanceThenSort(scored, null);
    expect(out).toHaveLength(12);
    expect(out[0].score).toBeGreaterThan(out[11].score); // CLIP order preserved
  });
});

// ---------- C2: short marketplace query ----------

describe('buildMarketplaceQuery', () => {
  const q = (raw: string) => {
    const { keywords } = parseQuery(raw);
    return { keywords, category: '' as string };
  };

  it('"mujhe kala joota chahiye" -> "black shoes"', () => {
    const { keywords } = q('mujhe kala joota chahiye');
    expect(buildMarketplaceQuery('mujhe kala joota chahiye', keywords, '')).toBe('black shoes');
  });

  it('"nike white sneakers" -> "nike white sneakers"', () => {
    const { keywords } = q('nike white sneakers');
    expect(buildMarketplaceQuery('nike white sneakers', keywords, '')).toBe('nike white sneakers');
  });

  it('"sasta smartwatch dikhao" -> "smartwatch" (specific noun kept, never replaced by generic "watch")', () => {
    const { keywords } = q('sasta smartwatch dikhao');
    expect(keywords).toEqual(['watch', 'smartwatch']);
    expect(buildMarketplaceQuery('sasta smartwatch dikhao', keywords, 'watch')).toBe('smartwatch');
  });

  it('never exceeds 3 words; brand + product type win over colour', () => {
    const { keywords } = q('gul ahmed ka kala lawn suit');
    const short = buildMarketplaceQuery('gul ahmed ka kala lawn suit', keywords, 'kurta');
    expect(short.split(' ').length).toBeLessThanOrEqual(3);
    expect(short).toBe('gul ahmed suit');
  });
});

// ---------- C2-2: most-specific noun kept in the short query ----------

describe('buildMarketplaceQuery: most-specific noun', () => {
  const q = (raw: string) => {
    const { keywords } = parseQuery(raw);
    return { keywords, category: '' as string };
  };
  const short = (raw: string) => {
    const { keywords } = q(raw);
    return buildMarketplaceQuery(raw, keywords, '');
  };

  it('"kala joota" -> "black shoes"', () => {
    expect(short('kala joota')).toBe('black shoes');
  });

  it('"airpods" -> "airpods" (specific product noun, not generic "earbuds")', () => {
    expect(short('airpods')).toBe('airpods');
  });

  it('"wireless earbuds" -> "wireless earbuds" (meaningful modifier kept)', () => {
    expect(short('wireless earbuds')).toBe('wireless earbuds');
  });

  it('"ghari" -> "watch" (generic stays generic, nothing invented)', () => {
    expect(short('ghari')).toBe('watch');
  });

  it('"safaid kurta" -> "white kurta"', () => {
    expect(short('safaid kurta')).toBe('white kurta');
  });

  it('"adidas running shoes" -> "adidas running shoes" (brand + modifier + noun)', () => {
    expect(short('adidas running shoes')).toBe('adidas running shoes');
  });

  it('"bata black shoes" -> "bata black shoes"', () => {
    expect(short('bata black shoes')).toBe('bata black shoes');
  });

  it('"mehnga leather handbag" -> "leather handbag" (price word stripped)', () => {
    expect(short('mehnga leather handbag')).toBe('leather handbag');
  });
});

// ---------- C3: brand/colour boost and brand-mismatch cap ----------

describe('brand/colour awareness', () => {
  const kws = ['white', 'sneakers', 'shoes', 'nike'];

  it('adds +0.02 when the brand appears in the title', () => {
    expect(brandColourBoostedScore(0.25, 'Nike Air Zoom Pegasus', 'nike white sneakers', kws)).toBeCloseTo(0.27, 10);
  });

  it('adds +0.02 when the colour appears in the title', () => {
    expect(brandColourBoostedScore(0.25, 'White Running Shoes', 'safaid joota', ['white', 'shoes'])).toBeCloseTo(0.27, 10);
  });

  it('adds no boost when neither brand nor colour appears', () => {
    expect(brandColourBoostedScore(0.25, 'Generic Running Shoes', 'nike white sneakers', kws)).toBe(0.25);
  });

  it('caps the label at Possible match when the query brand is missing from the title', () => {
    expect(brandAwareTextLabel(0.30, 'Generic Sports Shoes', 'nike white sneakers', kws)).toBe('Possible match');
  });

  it('keeps the normal label when the brand is in the title', () => {
    expect(brandAwareTextLabel(0.30, 'Nike Revolution 7', 'nike white sneakers', kws)).toBe('Strong match');
  });

  it('applies no cap when the query names no brand', () => {
    expect(brandAwareTextLabel(0.25, 'Black Camel Sneakers', 'kala joota', ['black', 'shoes'])).toBe('Good match');
  });
});

// ---------- C5: cache key / hit / miss / expiry ----------

describe('searchCache', () => {
  it('derives the same key for the same normalized query + sort', () => {
    expect(cacheKeyForText('black shoes', 'asc')).toBe(cacheKeyForText('Black Shoes ', 'asc'));
  });

  it('derives different keys for different sorts', () => {
    expect(cacheKeyForText('black shoes', 'asc')).not.toBe(cacheKeyForText('black shoes', 'desc'));
    expect(cacheKeyForText('black shoes', null)).not.toBe(cacheKeyForText('black shoes', 'asc'));
  });

  it('misses on an unknown key', async () => {
    await expect(getCached('text:nope|sort:none', 1_000_000)).resolves.toBeNull();
  });

  it('hits after set, and expires after the TTL', async () => {
    const key = 'text:ttl-test|sort:none';
    await setCached({ key, at: 1_000_000, products: [] });
    await expect(getCached(key, 1_000_000 + CACHE_TTL_MS - 1)).resolves.not.toBeNull();
    await expect(getCached(key, 1_000_000 + CACHE_TTL_MS + 1)).resolves.toBeNull();
    // expired entry is gone for good
    await expect(getCached(key, 1_000_000 + CACHE_TTL_MS + 2)).resolves.toBeNull();
  });
});

// ---------- C5: URL dedupe ----------

describe('dedupeListings', () => {
  it('drops duplicate and empty URLs, keeping the first occurrence', () => {
    const a = listing('https://x/1', 100, 'first');
    const b = listing('https://x/1', 120, 'second');
    const c = listing('https://x/2', 130, 'third');
    const d = listing('', 140, 'no-url');
    expect(dedupeListings([a, b, c, d])).toEqual([a, c]);
  });
});
