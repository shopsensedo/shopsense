/**
 * R9 tests: LIVE_SOURCES_ENABLED kill switch + demo catalogue loader.
 * The 3-row demo fixture below is synthetic test data, clearly marked —
 * it is NOT shipped to production.
 */
import { describe, expect, test, vi, beforeEach, afterEach } from 'vitest';
import handler, { isLiveSourcesEnabled } from '../../api/live-search';
import { formatSourceStatus } from '../lib/liveSearch';
import {
  validateDemoCatalogue,
  parseDemoCatalogue,
  demoItemsToProducts,
} from '../lib/demoCatalogue';

describe('isLiveSourcesEnabled (R9 kill switch)', () => {
  test('defaults to ON when the env var is absent', () => {
    expect(isLiveSourcesEnabled({})).toBe(true);
  });
  test('stays ON for any value other than "0"', () => {
    expect(isLiveSourcesEnabled({ LIVE_SOURCES_ENABLED: '1' })).toBe(true);
    expect(isLiveSourcesEnabled({ LIVE_SOURCES_ENABLED: '' })).toBe(true);
  });
  test('is OFF only for exactly "0"', () => {
    expect(isLiveSourcesEnabled({ LIVE_SOURCES_ENABLED: '0' })).toBe(false);
  });
});

function mockRes() {
  const res: any = { statusCode: 0, body: null, headers: {} };
  res.status = (c: number) => { res.statusCode = c; return res; };
  res.json = (b: any) => { res.body = b; return res; };
  res.setHeader = (k: string, v: string) => { res.headers[k] = v; };
  return res;
}

describe('live-search handler with the kill switch OFF', () => {
  const origEnv = process.env.LIVE_SOURCES_ENABLED;
  beforeEach(() => {
    process.env.LIVE_SOURCES_ENABLED = '0';
    vi.stubGlobal('fetch', vi.fn(() => Promise.reject(new Error('should not be called'))));
  });
  afterEach(() => {
    if (origEnv === undefined) delete process.env.LIVE_SOURCES_ENABLED;
    else process.env.LIVE_SOURCES_ENABLED = origEnv;
    vi.unstubAllGlobals();
  });

  test('returns a clean disabled state without contacting any store', async () => {
    const res = mockRes();
    await handler({ query: { q: 'sneakers' } }, res);
    expect(res.statusCode).toBe(200);
    expect(res.body.liveSourcesEnabled).toBe(false);
    expect(res.body.results).toEqual([]);
    expect(res.body.count).toBe(0);
    expect(res.body.sources).toEqual({
      priceoye: 'disabled', daraz: 'disabled', telemart: 'disabled',
    });
    // Proof: fetch was never called — no store was contacted.
    expect(fetch).not.toHaveBeenCalled();
  });

  test('still 400s on a missing query', async () => {
    const res = mockRes();
    await handler({ query: {} }, res);
    expect(res.statusCode).toBe(400);
  });
});

describe('formatSourceStatus with disabled sources', () => {
  test('renders "disabled by site setting"', () => {
    const s = formatSourceStatus({
      priceoye: { ok: false, disabled: true },
      daraz: { ok: false, disabled: true },
      telemart: { ok: false, disabled: true },
    });
    expect(s).toContain('disabled by site setting');
  });
});

/** Synthetic 3-row FIXTURE for the loader test — not real products, not shipped. */
const FIXTURE = {
  name: 'R9 test fixture (synthetic)',
  items: [
    { id: 'f1', title: 'Fixture Sneaker One', price: 1999, image: 'https://example.com/f1.jpg', url: 'https://example.com/f1', category: 'shoes' },
    { id: 'f2', title: 'Fixture Watch Two', image: 'https://example.com/f2.jpg', url: 'https://example.com/f2', category: 'watch' },
    { id: 'f3', title: 'Fixture Bag Three', price: 0, image: 'https://example.com/f3.jpg', url: 'https://example.com/f3' },
  ],
};

describe('demo catalogue loader (R9)', () => {
  test('accepts the 3-row fixture', () => {
    expect(validateDemoCatalogue(FIXTURE)).toBeNull();
    const cat = parseDemoCatalogue(JSON.stringify(FIXTURE));
    expect(cat.items).toHaveLength(3);
  });
  test('converts to flagged demo products', () => {
    const ps = demoItemsToProducts(parseDemoCatalogue(JSON.stringify(FIXTURE)));
    expect(ps).toHaveLength(3);
    expect(ps.every((p) => p.demo === true)).toBe(true);
    expect(ps.every((p) => p.platform === 'demo')).toBe(true);
    expect(ps[0].id).toBe('demo-f1');
  });
  test('rejects missing name', () => {
    expect(validateDemoCatalogue({ items: FIXTURE.items })).toContain('name');
  });
  test('rejects duplicated ids', () => {
    const bad = { ...FIXTURE, items: [FIXTURE.items[0], FIXTURE.items[0]] };
    expect(validateDemoCatalogue(bad)).toContain('duplicated');
  });
  test('rejects negative price', () => {
    const bad = { ...FIXTURE, items: [{ ...FIXTURE.items[0], price: -5 }] };
    expect(validateDemoCatalogue(bad)).toContain('price');
  });
  test('rejects invalid JSON', () => {
    expect(() => parseDemoCatalogue('not json')).toThrow();
  });
});
