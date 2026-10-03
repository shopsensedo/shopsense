import { describe, it, expect } from 'vitest';
import {
  detectListingGender,
  detectQueryGender,
  detectPhraseGender,
  filterByGender,
  biasQueryForGender,
} from '../src/lib/genderFilter';

describe('detectListingGender', () => {
  it('detects men from title tokens', () => {
    expect(detectListingGender('Men Running Sneakers')).toBe('men');
    expect(detectListingGender("Men's Wrist Watch")).toBe('men');
    expect(detectListingGender('Gents Kurta Shalwar')).toBe('men');
  });
  it('detects women from title tokens', () => {
    expect(detectListingGender('Women Evening Gown')).toBe('women');
    expect(detectListingGender('Ladies Handbag')).toBe('women');
    expect(detectListingGender('Female Perfume')).toBe('women');
  });
  it('detects unisex', () => {
    expect(detectListingGender('Unisex Sunglasses')).toBe('unisex');
    expect(detectListingGender('Kids Shoes')).toBe('unisex');
  });
  it('returns unknown when no gender tokens', () => {
    expect(detectListingGender('Wireless Headphones')).toBe('unknown');
    expect(detectListingGender('')).toBe('unknown');
  });
  it('returns unknown when both men and women tokens present', () => {
    expect(detectListingGender('Men and Women Watch Set')).toBe('unknown');
  });
});

describe('detectQueryGender', () => {
  it('detects from English terms', () => {
    expect(detectQueryGender('ladies handbag')).toBe('women');
    expect(detectQueryGender('gents shoes')).toBe('men');
  });
  it('detects from Roman Urdu terms', () => {
    expect(detectQueryGender('zanana suit')).toBe('women');
    expect(detectQueryGender('mardana kurta')).toBe('men');
    expect(detectQueryGender('bachon ke kapray')).toBe(null); // kids → null (not men/women)
  });
  it('returns null when no gender intent', () => {
    expect(detectQueryGender('black shoes')).toBe(null);
    expect(detectQueryGender('')).toBe(null);
  });
});

describe('detectPhraseGender', () => {
  it('detects from phrase', () => {
    expect(detectPhraseGender('men running sneakers')).toBe('men');
    expect(detectPhraseGender('women sneakers')).toBe('women');
    expect(detectPhraseGender('wireless headphones')).toBe(null);
  });
});

describe('filterByGender', () => {
  // 12 listings so the safety valve (<8) doesn't trigger on hard filter
  const listings = [
    { title: 'Men Running Sneakers' },
    { title: 'Women Running Sneakers' },
    { title: 'Unisex Sunglasses' },
    { title: 'Wireless Headphones' },
    { title: 'Men Leather Wallet' },
    { title: 'Women Handbag' },
    { title: 'Men T-Shirt' },
    { title: 'Women Dress' },
    { title: 'Unisex Cap' },
    { title: 'Bluetooth Speaker' },
    { title: 'Women Sandals' },
    { title: 'Men Belt' },
  ];

  it('passes everything for any', () => {
    const r = filterByGender(listings, 'any');
    expect(r.kept.length).toBe(12);
    expect(r.removed).toBe(0);
  });

  it('hard-excludes opposite gender for women preference (hard strength)', () => {
    const r = filterByGender(listings, 'women', 'hard');
    expect(r.kept.map((l) => l.title)).toContain('Women Running Sneakers');
    expect(r.kept.map((l) => l.title)).toContain('Unisex Sunglasses');
    expect(r.kept.map((l) => l.title)).not.toContain('Men Running Sneakers');
    expect(r.removed).toBe(4); // 4 men's items removed
    // unknown is down-ranked (kept but after confident matches)
    const titles = r.kept.map((l) => l.title);
    expect(titles.indexOf('Wireless Headphones')).toBeGreaterThan(
      titles.indexOf('Women Running Sneakers'),
    );
  });

  it('soft strength penalizes but does not exclude opposite gender', () => {
    const r = filterByGender(listings, 'women', 'soft');
    expect(r.removed).toBe(0); // nothing removed
    expect(r.kept.length).toBe(12); // all kept
    // opposite-gender ranked last
    const titles = r.kept.map((l) => l.title);
    const menIdx = titles.map((t, i) => t.includes('Men') ? i : -1).filter((i) => i >= 0);
    const womenIdx = titles.indexOf('Women Running Sneakers');
    expect(Math.min(...menIdx)).toBeGreaterThan(womenIdx);
  });

  it('safety valve relaxes when hard filtering leaves <8', () => {
    const few = [{ title: 'Men Kurta' }, { title: 'Men Shoes' }];
    const r = filterByGender(few, 'women', 'hard');
    expect(r.relaxed).toBe(true);
    expect(r.kept.length).toBe(2); // restored via soft
  });

  it('hard-excludes opposite gender for men preference', () => {
    const r = filterByGender(listings, 'men', 'hard');
    expect(r.kept.map((l) => l.title)).not.toContain('Women Running Sneakers');
    expect(r.removed).toBe(4); // 4 women's items removed
  });

  it('unisex preference excludes gendered items', () => {
    const r = filterByGender(listings, 'unisex', 'hard');
    expect(r.kept.map((l) => l.title)).toContain('Unisex Sunglasses');
    expect(r.removed).toBe(8); // 4 men + 4 women removed
  });
});

describe('biasQueryForGender', () => {
  it('rewrites kurta to kurti for women', () => {
    const r = biasQueryForGender('embroidered kurta', 'women');
    expect(r).toBe('women embroidered kurti');
  });

  it('strips pajama/shalwar for women kurta queries', () => {
    const r = biasQueryForGender('kurta pajama', 'women');
    expect(r).toBe('women kurti');
  });

  it('adds men prefix for men kurta queries without men', () => {
    const r = biasQueryForGender('kurta', 'men');
    expect(r).toBe('men kurta');
  });

  it('returns null for non-kurta queries', () => {
    expect(biasQueryForGender('running shoes', 'women')).toBe(null);
  });

  it('returns null for any/unisex preference', () => {
    expect(biasQueryForGender('kurta', 'any')).toBe(null);
  });
});
