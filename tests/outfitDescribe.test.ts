import { describe, it, expect } from 'vitest';
import { validateOutfitDescription } from '../api/describe-image';

describe('validateOutfitDescription', () => {
  it('validates a person outfit with items', () => {
    const raw = {
      photoType: 'person',
      apparentGender: 'men',
      items: [
        {
          type: 'kurta',
          location: 'upper body',
          colours: ['white'],
          attributes: ['embroidered collar'],
          brand: null,
          queries: ['white kurta', 'kurta'],
          confidence: 0.9,
        },
        {
          type: 'wrist watch',
          location: 'left wrist',
          colours: ['gold', 'black'],
          attributes: ['gold dial'],
          brand: null,
          queries: ['gold dial watch', 'wrist watch'],
          confidence: 0.85,
        },
      ],
    };
    const r = validateOutfitDescription(raw);
    expect(r).not.toBeNull();
    expect(r!.photoType).toBe('person');
    expect(r!.apparentGender).toBe('men');
    expect(r!.items.length).toBe(2);
    expect(r!.items[0].type).toBe('kurta');
    expect(r!.items[1].queries).toEqual(['gold dial watch', 'wrist watch']);
  });

  it('handles product-only photos', () => {
    const r = validateOutfitDescription({ photoType: 'product', apparentGender: null, items: [] });
    expect(r).not.toBeNull();
    expect(r!.photoType).toBe('product');
    expect(r!.items.length).toBe(0);
  });

  it('rejects items without queries', () => {
    const r = validateOutfitDescription({
      photoType: 'person',
      apparentGender: null,
      items: [{ type: 'shoes', queries: [] }],
    });
    expect(r!.items.length).toBe(0);
  });

  it('sanitizes brand guesses', () => {
    const r = validateOutfitDescription({
      photoType: 'person',
      apparentGender: null,
      items: [
        { type: 'shirt', queries: ['shirt'], brand: 'Gul Ahmed probably maybe definitely' },
      ],
    });
    // brand with >3 words is rejected → null
    expect(r!.items[0].brand).toBeNull();
  });

  it('validates bounding boxes', () => {
    const r = validateOutfitDescription({
      photoType: 'person',
      apparentGender: null,
      items: [
        { type: 'shoes', queries: ['shoes'], box: { x: 100, y: 200, width: 300, height: 150 } },
        { type: 'watch', queries: ['watch'], box: { x: -10, y: 0, width: 50, height: 50 } }, // invalid → dropped
        { type: 'bag', queries: ['bag'] }, // no box → ok, undefined
      ],
    });
    expect(r!.items[0].box).toEqual({ x: 100, y: 200, width: 300, height: 150 });
    expect(r!.items[1].box).toBeUndefined();
    expect(r!.items[2].box).toBeUndefined();
  });

  it('returns null for garbage', () => {
    expect(validateOutfitDescription(null)).toBeNull();
    expect(validateOutfitDescription('nope')).toBeNull();
  });
});
