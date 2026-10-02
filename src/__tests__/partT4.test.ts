/**
 * T4 — real accounts + per-user persistence (frontend authClient).
 * fetch is mocked; localStorage is an in-memory stub (vitest runs in node).
 * No network, no invented marketplace data.
 */
import { describe, expect, test, vi, beforeEach } from 'vitest';
import {
  AuthError,
  BackendUnavailableError,
  getStoredUser,
  getToken,
  isLoggedIn,
  login,
  logout,
  register,
  serverGetSaved,
  validateSession,
  productToListing,
  listingToProduct,
} from '../lib/authClient';
import type { Product } from '../types';

const store = new Map<string, string>();
// @ts-expect-error — minimal localStorage stub for node
globalThis.localStorage = {
  getItem: (k: string) => (store.has(k) ? store.get(k)! : null),
  setItem: (k: string, v: string) => void store.set(k, v),
  removeItem: (k: string) => void store.delete(k),
};

function jsonResponse(body: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  } as Response;
}

const USER = { id: 7, email: 'test@shopsense.pk', name: 'Test User' };

beforeEach(() => {
  store.clear();
  vi.unstubAllGlobals();
});

test('login persists token + user, isLoggedIn true', async () => {
  vi.stubGlobal('fetch', vi.fn(async () =>
    jsonResponse({ access_token: 'tok-123', user: USER })
  ));
  const u = await login('test@shopsense.pk', 'pakistan2026');
  expect(u.email).toBe('test@shopsense.pk');
  expect(getToken()).toBe('tok-123');
  expect(getStoredUser()).toEqual(USER);
  expect(isLoggedIn()).toBe(true);
});

test('register posts name and persists the session', async () => {
  const fetchMock = vi.fn(async () =>
    jsonResponse({ access_token: 'tok-abc', user: USER }, 201)
  );
  vi.stubGlobal('fetch', fetchMock);
  await register('test@shopsense.pk', 'pakistan2026', 'Test User');
  const [, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
  expect(JSON.parse(init.body as string)).toMatchObject({ name: 'Test User' });
  expect(getToken()).toBe('tok-abc');
});

test('wrong password surfaces the server message as AuthError', async () => {
  vi.stubGlobal('fetch', vi.fn(async () =>
    jsonResponse({ detail: 'Invalid email or password' }, 401)
  ));
  await expect(login('test@shopsense.pk', 'nope')).rejects.toMatchObject({
    name: 'AuthError',
    status: 401,
    message: 'Invalid email or password',
  });
  expect(isLoggedIn()).toBe(false);
});

test('unreachable backend throws BackendUnavailableError, never a fake user', async () => {
  vi.stubGlobal('fetch', vi.fn(async () => {
    throw new TypeError('fetch failed');
  }));
  await expect(login('a@b.c', 'whatever')).rejects.toBeInstanceOf(BackendUnavailableError);
  expect(getStoredUser()).toBeNull();
});

test('authed calls send the Bearer token', async () => {
  vi.stubGlobal('fetch', vi.fn(async () =>
    jsonResponse({ access_token: 'tok-123', user: USER })
  ));
  await login('test@shopsense.pk', 'pakistan2026');

  const fetchMock = vi.fn(async () => jsonResponse({ items: [] }));
  vi.stubGlobal('fetch', fetchMock);
  await serverGetSaved();
  const [, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
  expect((init.headers as Record<string, string>).Authorization).toBe('Bearer tok-123');
});

test('validateSession clears a rejected token', async () => {
  vi.stubGlobal('fetch', vi.fn(async () =>
    jsonResponse({ access_token: 'stale', user: USER })
  ));
  await login('test@shopsense.pk', 'pakistan2026');
  vi.stubGlobal('fetch', vi.fn(async () => jsonResponse({ detail: 'Invalid token' }, 401)));
  expect(await validateSession()).toBeNull();
  expect(getToken()).toBeNull();
  expect(isLoggedIn()).toBe(false);
});

test('logout clears the session', async () => {
  vi.stubGlobal('fetch', vi.fn(async () =>
    jsonResponse({ access_token: 'tok-123', user: USER })
  ));
  await login('test@shopsense.pk', 'pakistan2026');
  logout();
  expect(isLoggedIn()).toBe(false);
});

const PRODUCT: Product = {
  id: 'live-1',
  title: 'Audionic Airbud 550',
  titleUrdu: '',
  price: 3499,
  originalPrice: 3499,
  currency: 'PKR',
  platform: 'daraz',
  platformUrl: 'https://www.daraz.pk/products/x.html',
  imageUrl: 'https://img.daraz.pk/x.jpg',
  similarityScore: 90,
  rating: 0,
  reviewsCount: 0,
  deliveryTime: '',
  deliveryCost: 0,
  inStock: true,
  seller: 'Daraz',
  category: 'earbuds',
  priceHistory: [],
};

test('productToListing preserves the real listing fields', () => {
  expect(productToListing(PRODUCT)).toEqual({
    title: 'Audionic Airbud 550',
    url: 'https://www.daraz.pk/products/x.html',
    price_pkr: 3499,
    image_url: 'https://img.daraz.pk/x.jpg',
    platform: 'daraz',
  });
});

test('listingToProduct rebuilds from the server snapshot without inventing data', () => {
  const p = listingToProduct({
    id: 42,
    url: 'https://www.daraz.pk/products/x.html',
    title: 'Audionic Airbud 550',
    price_pkr: 3499,
    image_url: 'https://img.daraz.pk/x.jpg',
    platform: 'daraz',
  });
  expect(p.platformUrl).toBe('https://www.daraz.pk/products/x.html');
  expect(p.price).toBe(3499);
  expect(p.imageUrl).toBe('https://img.daraz.pk/x.jpg');
  // Unknowns stay unknown — never fabricated.
  expect(p.rating).toBe(0);
  expect(p.reviewsCount).toBe(0);
  expect(p.priceHistory).toEqual([]);
});
