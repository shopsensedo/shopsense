import { describe, it, expect } from 'vitest';
import {
  normalizeQueryLocal,
  parseQuery,
  detectPriceIntent,
} from '../lib/localSearch';

describe('stopwords (B2 item 1)', () => {
  it('strips Roman Urdu filler: "mujhe kala joota chahiye"', () => {
    expect(normalizeQueryLocal('mujhe kala joota chahiye')).toEqual([
      'black',
      'shoes',
      'sneakers',
      'footwear',
    ]);
  });

  it('"red kurta wali" keeps red kurta terms, drops "wali"', () => {
    const kws = normalizeQueryLocal('red kurta wali');
    expect(kws).toContain('red');
    expect(kws).toContain('kurta');
    expect(kws).not.toContain('wali');
  });

  it('"sasta smartwatch dikhao" maps to watch terms only', () => {
    expect(normalizeQueryLocal('sasta smartwatch dikhao')).toEqual([
      'watch',
      'smartwatch',
    ]);
  });

  it('handles mixed English filler: "please mujhe nike ke white sneakers dikhao"', () => {
    const kws = normalizeQueryLocal('please mujhe nike ke white sneakers dikhao');
    expect(kws).toContain('nike');
    expect(kws).toContain('white');
    expect(kws).toContain('sneakers');
    for (const filler of ['please', 'mujhe', 'ke', 'dikhao'])
      expect(kws).not.toContain(filler);
  });

  it('a query of only filler maps to nothing', () => {
    expect(normalizeQueryLocal('mujhe chahiye')).toEqual([]);
    expect(normalizeQueryLocal('   ')).toEqual([]);
  });

  it('"bachon ke kapray" keeps the meaning, drops "ke"', () => {
    const kws = normalizeQueryLocal('bachon ke kapray');
    expect(kws).toContain('kids');
    expect(kws).toContain('clothes');
    expect(kws).not.toContain('ke');
  });
});

describe('price intent (B2 item 2)', () => {
  it('detects asc for sasta/cheap/affordable', () => {
    expect(detectPriceIntent(['sasta', 'mobile'])).toBe('asc');
    expect(detectPriceIntent(['cheap', 'shoes'])).toBe('asc');
    expect(detectPriceIntent(['sastay', 'kapray'])).toBe('asc');
  });

  it('detects desc for mehnga/expensive', () => {
    expect(detectPriceIntent(['mehnga', 'watch'])).toBe('desc');
    expect(detectPriceIntent(['expensive', 'laptop'])).toBe('desc');
  });

  it('discount/sale set no sort intent', () => {
    expect(detectPriceIntent(['discount', 'shoes'])).toBeNull();
    expect(detectPriceIntent(['sale', 'kurta'])).toBeNull();
  });

  it('no price words -> null intent', () => {
    expect(detectPriceIntent(['kala', 'joota'])).toBeNull();
  });

  it('price words never enter the mapped query', () => {
    const { keywords, priceIntent } = parseQuery('sasta smartwatch dikhao');
    expect(priceIntent).toBe('asc');
    expect(keywords).toEqual(['watch', 'smartwatch']);
    const d = parseQuery('mehnga mobile chahiye');
    expect(d.priceIntent).toBe('desc');
    expect(d.keywords).not.toContain('expensive');
    const n = parseQuery('discount wali shirt dikhao');
    expect(n.priceIntent).toBeNull();
    expect(n.keywords).not.toContain('discount');
    expect(n.keywords).not.toContain('sale');
  });
});
