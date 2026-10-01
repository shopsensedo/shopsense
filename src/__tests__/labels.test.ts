import { describe, it, expect } from 'vitest';
import { textSimilarityLabel, similarityLabel } from '../lib/liveSearch';

describe('text-search labels (B2 item 3)', () => {
  // Calibrated on the real text-to-image distribution measured 2026-10-02:
  // relevant 0.24-0.32, irrelevant <= 0.22.
  it('scores >= 0.28 are a Strong match', () => {
    expect(textSimilarityLabel(0.32)).toBe('Strong match');
    expect(textSimilarityLabel(0.30)).toBe('Strong match');
    expect(textSimilarityLabel(0.28)).toBe('Strong match');
  });

  it('scores 0.24-0.28 are a Good match', () => {
    expect(textSimilarityLabel(0.279)).toBe('Good match');
    expect(textSimilarityLabel(0.25)).toBe('Good match');
    expect(textSimilarityLabel(0.24)).toBe('Good match');
  });

  it('scores below 0.24 are a Possible match', () => {
    expect(textSimilarityLabel(0.239)).toBe('Possible match');
    expect(textSimilarityLabel(0.22)).toBe('Possible match');
    expect(textSimilarityLabel(0.1)).toBe('Possible match');
    expect(textSimilarityLabel(0)).toBe('Possible match');
  });
});

describe('image-search labels unchanged', () => {
  it('keeps the Very similar / Similar / Loosely similar bands', () => {
    expect(similarityLabel(100)).toBe('Very similar');
    expect(similarityLabel(75)).toBe('Very similar');
    expect(similarityLabel(74)).toBe('Similar');
    expect(similarityLabel(55)).toBe('Similar');
    expect(similarityLabel(54)).toBe('Loosely similar');
    expect(similarityLabel(0)).toBe('Loosely similar');
  });
});
