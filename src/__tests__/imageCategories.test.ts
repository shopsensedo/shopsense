import { describe, expect, it } from 'vitest';
import { IMAGE_CATEGORIES } from '../data/imageCategories';
import { classifyImage, SITE_QUERIES } from '../lib/liveSearch';
import type { CategoryTextEmbedding } from '../lib/clipEmbed';

// ---------- category vocabulary ----------

describe('IMAGE_CATEGORIES', () => {
  it('has a broad vocabulary (panel can test anything)', () => {
    expect(IMAGE_CATEGORIES.length).toBeGreaterThanOrEqual(50);
  });

  it('has unique keys and complete per-source queries', () => {
    const keys = IMAGE_CATEGORIES.map((c) => c.key);
    expect(new Set(keys).size).toBe(keys.length);
    for (const c of IMAGE_CATEGORIES) {
      expect(c.key.trim().length).toBeGreaterThan(0);
      expect(c.label.trim().length).toBeGreaterThan(0);
      expect(c.daraz.trim().length).toBeGreaterThan(0);
      expect(c.priceoye.trim().length).toBeGreaterThan(0);
    }
  });

  it('covers phone accessories (the charger bug)', () => {
    const keys = new Set(IMAGE_CATEGORIES.map((c) => c.key));
    for (const k of ['charger', 'cable', 'power bank', 'headphones', 'earphones']) {
      expect(keys.has(k)).toBe(true);
    }
  });

  it('SITE_QUERIES covers every category key', () => {
    for (const c of IMAGE_CATEGORIES) {
      expect(SITE_QUERIES[c.key]).toBeDefined();
      expect(SITE_QUERIES[c.key].daraz.trim().length).toBeGreaterThan(0);
      expect(SITE_QUERIES[c.key].priceoye.trim().length).toBeGreaterThan(0);
    }
  });
});

// ---------- pure zero-shot classification ----------

// tiny synthetic vocabulary: 3-dim unit vectors
const vocab = (keys: string[]): CategoryTextEmbedding[] =>
  keys.map((key, i) => {
    const v = [0, 0, 0];
    v[i % 3] = 1;
    return { key, embedding: v };
  });

describe('classifyImage', () => {
  it('picks the highest-cosine category', () => {
    const cats = vocab(['charger', 'earbuds', 'mobile']);
    // embedding closest to 'earbuds' (index 1)
    const emb = [0.1, 0.9, 0.2];
    const norm = Math.hypot(...emb);
    const cls = classifyImage(emb.map((x) => x / norm), cats);
    expect(cls.category).toBe('earbuds');
    expect(cls.query).toBe('earbuds');
    expect(cls.score).toBeGreaterThan(0.9);
  });

  it('a charger-like embedding wins over earbuds when charger is in vocab', () => {
    const cats = vocab(['charger', 'earbuds', 'mobile']);
    // closer to index 0 (charger) than index 1 (earbuds)
    const emb = [0.9, 0.3, 0.1];
    const norm = Math.hypot(...emb);
    const cls = classifyImage(emb.map((x) => x / norm), cats);
    expect(cls.category).toBe('charger');
  });

  it('falls back to mobile on empty vocabulary', () => {
    const cls = classifyImage([1, 0, 0], []);
    expect(cls.category).toBe('mobile');
  });
});
