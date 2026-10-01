/**
 * Demo mode gate.
 *
 * Seed and mock data (SAMPLE_PRODUCTS, the 7 seed products, fake user,
 * fake history/alerts) are ONLY allowed when demo mode is on:
 *   - URL has ?demo=1, OR
 *   - VITE_DEMO_MODE=true at build time.
 *
 * In production (demo mode off) search shows real live listings or an
 * honest error state — never sample data.
 */
export function isDemoMode(): boolean {
  if (typeof window !== 'undefined') {
    try {
      if (new URLSearchParams(window.location.search).get('demo') === '1') return true;
    } catch {
      // ignore malformed URLs
    }
  }
  return (import.meta.env.VITE_DEMO_MODE as string | undefined) === 'true';
}
