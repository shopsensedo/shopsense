import { describe, expect, it } from 'vitest';
import {
  applyRelevanceFloor,
  categoryKeyForText,
  formatSourceStatus,
  MIN_TEXT_RESULTS,
  priceOyeSellsCategory,
  TEXT_RELEVANCE_FLOOR,
  type SourceStatus,
} from '../lib/liveSearch';

// ---------- D1-1: source routing by category ----------

describe('D1-1 source routing', () => {
  it('treats electronics/appliances as PriceOye categories', () => {
    for (const k of [
      'smartwatch',
      'mobile',
      'laptop',
      'earbuds',
      'charger',
      'cable',
      'power bank',
      'speaker',
      'camera',
      'iron',
      'table fan',
    ]) {
      expect(priceOyeSellsCategory(k)).toBe(true);
    }
  });

  it('treats fashion/bags/shoes/kids/beauty/home as Daraz-only', () => {
    for (const k of [
      'sneakers',
      'shoes',
      'kurta',
      'handbag',
      'watch',
      'perfume',
      'toys',
      'diapers',
      'chair',
      'kettle',
      'football',
    ]) {
      expect(priceOyeSellsCategory(k)).toBe(false);
    }
  });

  it('is case-insensitive and rejects unknown keys', () => {
    expect(priceOyeSellsCategory('SmartWatch')).toBe(true);
    expect(priceOyeSellsCategory('')).toBe(false);
    expect(priceOyeSellsCategory('not-a-category')).toBe(false);
  });

  it('maps text keywords to the most specific category key', () => {
    // "sasta smartwatch dikhao" -> electronics -> both sources
    expect(categoryKeyForText(['watch', 'smartwatch'])).toBe('smartwatch');
    // "kala joota" -> fashion -> Daraz only
    expect(categoryKeyForText(['black', 'shoes', 'sneakers', 'footwear'])).toBe(
      'sneakers',
    );
    // "nike white sneakers" -> fashion -> Daraz only
    expect(categoryKeyForText(['nike', 'white', 'sneakers'])).toBe('sneakers');
    // charger photo query -> electronics -> both sources
    expect(categoryKeyForText(['charger'])).toBe('charger');
    expect(categoryKeyForText(['power', 'bank'])).toBe('power bank');
  });

  it('returns empty string when no category key matches', () => {
    expect(categoryKeyForText(['sasta', 'dikhao'])).toBe('');
    expect(categoryKeyForText([])).toBe('');
  });

  it('formats a skipped source as "not searched (electronics only)"', () => {
    const s: SourceStatus = {
      priceoye: { ok: false, skipped: true },
      daraz: { ok: true, count: 5 },
    };
    expect(formatSourceStatus(s)).toBe(
      'PriceOye: not searched (electronics only) · Daraz: 5 results',
    );
  });

  it('keeps the old unavailable wording for failed (not skipped) sources', () => {
    const s: SourceStatus = {
      priceoye: { ok: false },
      daraz: { ok: true, count: 1 },
    };
    expect(formatSourceStatus(s)).toBe(
      'PriceOye: unavailable (blocked or timed out) · Daraz: 1 result',
    );
  });
});

// ---------- D1-2: relevance floor ----------

describe('D1-2 relevance floor', () => {
  const scored = (scores: number[]) => scores.map((score, i) => ({ score, i }));

  it('uses 0.22 — the highest score an irrelevant pair ever reached', () => {
    expect(TEXT_RELEVANCE_FLOOR).toBe(0.22);
    expect(MIN_TEXT_RESULTS).toBe(3);
  });

  it('drops candidates below the floor', () => {
    const out = applyRelevanceFloor(scored([0.3, 0.28, 0.25, 0.21, 0.19]), 0.22, 3);
    expect(out.map((r) => r.score)).toEqual([0.3, 0.28, 0.25]);
  });

  it('never drops below the minimum of 3 results', () => {
    const out = applyRelevanceFloor(scored([0.3, 0.21, 0.2, 0.19]), 0.22, 3);
    expect(out.map((r) => r.score)).toEqual([0.3, 0.21, 0.2]);
  });

  it('keeps everything at or above the floor, sorted desc', () => {
    const out = applyRelevanceFloor(scored([0.22, 0.31, 0.24]), 0.22, 3);
    expect(out.map((r) => r.score)).toEqual([0.31, 0.24, 0.22]);
  });

  it('handles an empty input', () => {
    expect(applyRelevanceFloor([], 0.22, 3)).toEqual([]);
  });
});
