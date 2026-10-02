import { describe, expect, it } from 'vitest';
import {
  applyRelevanceFloor,
  categoryKeyForText,
  extractProductNoun,
  formatSourceStatus,
  MIN_TEXT_RESULTS,
  nounBoostedScore,
  nounCapTextLabel,
  nounVariants,
  describedSkipSource,
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
      telemart: { ok: true, count: 2 },
    };
    expect(formatSourceStatus(s)).toBe(
      'PriceOye: not searched (electronics only) · Daraz: 5 results · Telemart: 2 results',
    );
  });

  it('keeps the old unavailable wording for failed (not skipped) sources', () => {
    const s: SourceStatus = {
      priceoye: { ok: false },
      daraz: { ok: true, count: 1 },
      telemart: { ok: false },
    };
    expect(formatSourceStatus(s)).toBe(
      'PriceOye: unavailable (blocked or timed out) · Daraz: 1 result · Telemart: unavailable (blocked or timed out)',
    );
  });

  it('routes described photos on the multiword category key, never word-by-word', () => {
    // "power bank": the old word-by-word check saw ["power","bank"] and
    // skipped PriceOye for an electronics item; the key check keeps it.
    expect(
      describedSkipSource({
        category: 'Mobile accessories',
        product_type: 'power bank',
        brand: null,
        queries: ['power bank 10000mah', 'power bank'],
      }),
    ).toBeUndefined();
    // "wall charger" — key "charger" is electronics → both sources
    expect(
      describedSkipSource({
        category: 'Mobile accessories',
        product_type: 'wall charger',
        brand: null,
        queries: ['wall charger usb-c', 'mobile charger'],
      }),
    ).toBeUndefined();
    // fashion photo → PriceOye skipped (Daraz only)
    expect(
      describedSkipSource({
        category: 'Footwear',
        product_type: 'running shoes',
        brand: 'Nike',
        queries: ['nike running shoes', 'running shoes'],
      }),
    ).toBe('priceoye');
    // unrecognized category → conservative: skip PriceOye
    expect(
      describedSkipSource({
        category: 'Mystery',
        product_type: 'unknown gizmo',
        brand: null,
        queries: ['gizmo thing', 'gizmo'],
      }),
    ).toBe('priceoye');
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

// ---------- D1-3: product-noun boost and label cap ----------

describe('D1-3 product-noun boost and label cap', () => {
  it('extracts the most specific product noun from the query', () => {
    // "sasta smartwatch dikhao" -> smartwatch, never the generic "watch"
    expect(extractProductNoun('sasta smartwatch dikhao', ['watch', 'smartwatch'], 'watch')).toBe(
      'smartwatch',
    );
    expect(extractProductNoun('kala joota', ['black', 'shoes', 'sneakers', 'footwear'], 'shoes')).toBe(
      'shoes',
    );
    expect(extractProductNoun('nike white sneakers', ['nike', 'white', 'sneakers'], 'shoes')).toBe(
      'sneakers',
    );
  });

  it('falls back to the category noun when the query has no noun', () => {
    expect(extractProductNoun('sasta dikhao', ['cheap'], '')).toBe('cheap');
  });

  it('boosts the score when a synonym of the noun appears in the title', () => {
    // "bt calling" is a smartwatch synonym in nounSynonyms.json
    expect(nounBoostedScore(0.25, 'HainoTeko BT Calling Smart Watch', 'smartwatch')).toBeCloseTo(
      0.27,
      10,
    );
    // literal noun also counts
    expect(nounBoostedScore(0.25, 'Amazfit Smartwatch GTS 4', 'smartwatch')).toBeCloseTo(0.27, 10);
  });

  it('does not boost when neither the noun nor a synonym is in the title', () => {
    expect(nounBoostedScore(0.25, 'Vivo Y28 Mobile Phone', 'smartwatch')).toBe(0.25);
    expect(nounBoostedScore(0.25, 'Anything', '')).toBe(0.25);
  });

  it('caps the label at Possible match when a specific noun is missing', () => {
    expect(nounCapTextLabel('Strong match', 'Vivo Y28 Mobile Phone', 'smartwatch')).toBe(
      'Possible match',
    );
    expect(nounCapTextLabel('Good match', 'HP Laptop Charger', 'airpods')).toBe('Possible match');
  });

  it('keeps the label when a synonym of the specific noun is in the title', () => {
    // "smart watch" is a synonym of smartwatch
    expect(nounCapTextLabel('Strong match', 'Amazfit GTS 4 Smart Watch', 'smartwatch')).toBe(
      'Strong match',
    );
    // "tws"/"earbuds" are airpods synonyms
    expect(nounCapTextLabel('Good match', 'Boat Airdopes TWS Earbuds', 'airpods')).toBe(
      'Good match',
    );
  });

  it('never caps a generic noun', () => {
    expect(nounCapTextLabel('Good match', 'Red Tape Shoes', 'shoes')).toBe('Good match');
    expect(nounCapTextLabel('Strong match', 'Anything', '')).toBe('Strong match');
  });

  it('exposes the noun plus synonyms as variants', () => {
    const v = nounVariants('smartwatch');
    expect(v).toContain('smartwatch');
    expect(v).toContain('bt calling');
    expect(v).toContain('fitness tracker');
  });
});
