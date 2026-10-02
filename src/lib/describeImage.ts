/**
 * Client for /api/describe-image (T2 any-image understanding).
 * The photo never leaves the device except as a downscaled (max 768 px)
 * JPEG sent to the describe endpoint; the endpoint forwards it to a Gemini
 * Flash vision model and returns strict JSON. Any failure — missing key,
 * timeout, bad output — falls back to the on-device 80-category
 * classification ("Basic recognition used").
 */

export interface ImageDescription {
  category: string;
  product_type: string;
  brand: string | null;
  colours: string[];
  attributes: string[];
  condition: string;
  queries: string[];
  confidence: number;
}

export type DescribeResult =
  | { ok: true; description: ImageDescription }
  | { ok: false; reason: string };

const NOTICE_KEY = 'shopsense-describe-notice-seen';

/** Downscale any image data URL to a JPEG data URL, longest side ≤ maxDim. */
export function downscaleToJpeg(dataUrl: string, maxDim = 768): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      try {
        const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
        const w = Math.max(1, Math.round(img.width * scale));
        const h = Math.max(1, Math.round(img.height * scale));
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        if (!ctx) throw new Error('no 2d context');
        ctx.drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL('image/jpeg', 0.85));
      } catch (e) {
        reject(e);
      }
    };
    img.onerror = () => reject(new Error('could not decode image'));
    img.src = dataUrl;
  });
}

/** Ask the server to describe the photo. Never throws — returns fallback. */
export async function describeImage(jpegDataUrl: string): Promise<DescribeResult> {
  try {
    const r = await fetch('/api/describe-image', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ image: jpegDataUrl }),
    });
    const j = (await r.json().catch(() => null)) as {
      description?: ImageDescription;
      error?: string;
    } | null;
    if (r.ok && j?.description && Array.isArray(j.description.queries) && j.description.queries.length > 0) {
      return { ok: true, description: j.description };
    }
    return { ok: false, reason: j?.error ?? `http ${r.status}` };
  } catch (e) {
    return { ok: false, reason: e instanceof Error ? e.message : 'network failed' };
  }
}

/** One-time privacy notice bookkeeping. */
export function describeNoticeSeen(): boolean {
  try {
    return localStorage.getItem(NOTICE_KEY) === '1';
  } catch {
    return false;
  }
}

export function markDescribeNoticeSeen(): void {
  try {
    localStorage.setItem(NOTICE_KEY, '1');
  } catch {
    /* private mode — the notice will simply show again */
  }
}
