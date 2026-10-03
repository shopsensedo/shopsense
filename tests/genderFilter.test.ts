import { describe, it, expect } from 'vitest';
import {
  detectListingGender,
  detectQueryGender,
  detectPhraseGender,
  filterByGender,
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
  const listings = [
    { title: 'Men Running Sneakers' },
    { title: 'Women Running Sneakers' },
    { title: 'Unisex Sunglasses' },
    { title: 'Wireless Headphones' },
  ];

  it('passes everything for any', () => {
    const r = filterByGender(listings, 'any');
    expect(r.kept.length).toBe(4);
    expect(r.removed).toBe(0);
  });

  it('hard-excludes opposite gender for women preference', () => {
    const r = filterByGender(listings, 'women');
    expect(r.kept.map((l) => l.title)).toContain('Women Running Sneakers');
    expect(r.kept.map((l) => l.title)).toContain('Unisex Sunglasses');
    expect(r.kept.map((l) => l.title)).not.toContain('Men Running Sneakers');
    expect(r.removed).toBe(1);
    // unknown is down-ranked (kept but after confident matches)
    const titles = r.kept.map((l) => l.title);
    expect(titles.indexOf('Wireless Headphones')).toBeGreaterThan(
      titles.indexOf('Women Running Sneakers'),
    );
  });

  it('hard-excludes opposite gender for men preference', () => {
    const r = filterByGender(listings, 'men');
    expect(r.kept.map((l) => l.title)).not.toContain('Women Running Sneakers');
    expect(r.removed).toBe(1);
  });

  it('unisex preference excludes gendered items', () => {
    const r = filterByGender(listings, 'unisex');
    expect(r.kept.map((l) => l.title)).toContain('Unisex Sunglasses');
    expect(r.removed).toBe(2);
  });
});
