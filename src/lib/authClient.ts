/**
 * Real account client for the ShopSense FastAPI backend (T4).
 *
 * Talks to {API_BASE}/auth/* and /me/* with a JWT in the Authorization
 * header. The token + basic profile are kept in localStorage so a reload
 * stays signed in; the token itself is never logged.
 *
 * When the backend is unreachable (local dev without uvicorn running, or no
 * public deployment yet) every call throws BackendUnavailableError with a
 * human-readable message — the UI must surface that instead of inventing a
 * fake signed-in user.
 */
import { API_BASE } from './api';
import type { PlatformType, Product } from '../types';

const TOKEN_KEY = 'shopsense_jwt_v1';
const USER_KEY = 'shopsense_user_v1';

export interface BackendUser {
  id: number;
  email: string;
  name: string;
}

export class BackendUnavailableError extends Error {
  constructor() {
    super('Account server is unreachable. Saved items stay on this device only.');
    this.name = 'BackendUnavailableError';
  }
}

export class AuthError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.name = 'AuthError';
    this.status = status;
  }
}

function readLS(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeLS(key: string, value: string | null): void {
  try {
    if (value === null) localStorage.removeItem(key);
    else localStorage.setItem(key, value);
  } catch {
    // private mode — session-only, non-fatal
  }
}

export function getToken(): string | null {
  return readLS(TOKEN_KEY);
}

export function getStoredUser(): BackendUser | null {
  const raw = readLS(USER_KEY);
  if (!raw) return null;
  try {
    const u = JSON.parse(raw) as BackendUser;
    return typeof u?.id === 'number' && typeof u?.email === 'string' ? u : null;
  } catch {
    return null;
  }
}

export function isLoggedIn(): boolean {
  return getToken() !== null && getStoredUser() !== null;
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${API_BASE}${path}`, {
      ...init,
      headers: { 'Content-Type': 'application/json', ...(init.headers || {}) },
    });
  } catch {
    throw new BackendUnavailableError();
  }
  if (!res.ok) {
    let detail = `Request failed (${res.status})`;
    try {
      const body = (await res.json()) as { detail?: unknown };
      if (typeof body.detail === 'string') detail = body.detail;
    } catch {
      // keep default
    }
    throw new AuthError(res.status, detail);
  }
  return (await res.json()) as T;
}

async function authed<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = getToken();
  if (!token) throw new AuthError(401, 'Not signed in');
  return request<T>(path, {
    ...init,
    headers: { Authorization: `Bearer ${token}`, ...(init.headers || {}) },
  });
}

interface TokenPayload {
  access_token: string;
  user: BackendUser;
}

function persistSession(payload: TokenPayload): BackendUser {
  writeLS(TOKEN_KEY, payload.access_token);
  writeLS(USER_KEY, JSON.stringify(payload.user));
  return payload.user;
}

export async function register(
  email: string, password: string, name: string
): Promise<BackendUser> {
  const payload = await request<TokenPayload>('/auth/register', {
    method: 'POST',
    body: JSON.stringify({ email, password, name }),
  });
  return persistSession(payload);
}

export async function login(email: string, password: string): Promise<BackendUser> {
  const payload = await request<TokenPayload>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
  return persistSession(payload);
}

/** Validate the stored token; clears the session when it is rejected. */
export async function validateSession(): Promise<BackendUser | null> {
  const token = getToken();
  if (!token) return null;
  try {
    const data = await authed<{ user: BackendUser }>('/auth/me');
    writeLS(USER_KEY, JSON.stringify(data.user));
    return data.user;
  } catch {
    logout();
    return null;
  }
}

export function logout(): void {
  writeLS(TOKEN_KEY, null);
  writeLS(USER_KEY, null);
}

// ---------------------------------------------------------------------------
// Per-user persistence (server is the source of truth when signed in)
// ---------------------------------------------------------------------------

export interface ServerListing {
  id: number;
  url: string;
  title: string;
  price_pkr: number;
  image_url: string;
  platform: string;
  saved_at?: number;
}

export interface ServerAlert extends ServerListing {
  // alert row id (distinct from listing id)
  alert_id: number;
  target_pkr: number;
  channel: string;
  contact: string;
  is_active: number;
  created_at: number;
}

export interface ServerHistoryItem {
  id: number;
  query_text: string;
  created_at: number;
}

export function productToListing(p: Product): {
  title: string; url: string; price_pkr: number; image_url: string; platform: string;
} {
  return {
    title: p.title,
    url: p.platformUrl,
    price_pkr: Math.max(0, Math.round(p.price)),
    image_url: p.imageUrl,
    platform: p.platform as string,
  };
}

/** Rebuild a minimal Product from a saved server listing snapshot. */
export function listingToProduct(l: ServerListing): Product {
  return {
    id: `server-${l.id}`,
    title: l.title,
    titleUrdu: '',
    price: l.price_pkr,
    originalPrice: l.price_pkr,
    currency: 'PKR',
    platform: (l.platform || 'daraz') as PlatformType,
    platformUrl: l.url,
    imageUrl: l.image_url,
    similarityScore: 0,
    rating: 0,
    reviewsCount: 0,
    deliveryTime: '',
    deliveryCost: 0,
    inStock: true,
    seller: l.platform,
    category: '',
    priceHistory: [],
  };
}

export async function serverSaveItem(p: Product): Promise<ServerListing> {
  const data = await authed<{ listing_id: number; saved: boolean }>(
    '/me/saved-items', { method: 'POST', body: JSON.stringify(productToListing(p)) }
  );
  const items = await serverGetSaved();
  const found = items.find((i) => i.id === data.listing_id);
  if (!found) throw new AuthError(500, 'Save did not stick on the server');
  return found;
}

export async function serverGetSaved(): Promise<ServerListing[]> {
  const data = await authed<{ items: ServerListing[] }>('/me/saved-items');
  return data.items;
}

export async function serverDeleteSaved(listingId: number): Promise<void> {
  await authed(`/me/saved-items/${listingId}`, { method: 'DELETE' });
}

export async function serverAddHistory(queryText: string): Promise<void> {
  await authed('/me/history', {
    method: 'POST', body: JSON.stringify({ query_text: queryText }),
  });
}

export async function serverGetHistory(): Promise<ServerHistoryItem[]> {
  const data = await authed<{ items: ServerHistoryItem[] }>('/me/history?limit=30');
  return data.items;
}

export async function serverAddAlert(
  p: Product, targetPkr: number, channel: string, contact: string
): Promise<ServerAlert> {
  const data = await authed<{ id: number; listing_id: number }>(
    '/me/alerts',
    {
      method: 'POST',
      body: JSON.stringify({
        ...productToListing(p), target_pkr: targetPkr, channel, contact,
      }),
    }
  );
  const alerts = await serverGetAlerts();
  const found = alerts.find((a) => a.alert_id === data.id);
  if (!found) throw new AuthError(500, 'Alert did not stick on the server');
  return found;
}

export async function serverGetAlerts(): Promise<ServerAlert[]> {
  const raw = await authed<{ items: Array<ServerListing & {
    id: number; target_pkr: number; channel: string; contact: string;
    is_active: number; created_at: number;
  }> }>('/me/alerts');
  return raw.items.map((a) => ({ ...a, alert_id: a.id }));
}

export async function serverDeleteAlert(alertId: number): Promise<void> {
  await authed(`/me/alerts/${alertId}`, { method: 'DELETE' });
}
