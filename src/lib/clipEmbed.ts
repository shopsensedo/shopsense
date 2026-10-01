/**
 * Shared in-browser CLIP embedding (transformers.js, quantized).
 * Lazy-loaded so the transformers.js chunk stays out of the initial page load.
 */

const MODEL_ID = 'Xenova/clip-vit-base-patch32';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let extractorPromise: Promise<any> | null = null;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let rawImageCtor: any = null;

export async function getClipExtractor(onProgress?: (fraction: number) => void) {
  if (!extractorPromise) {
    // Dynamic import: keeps the transformers.js bundle out of the initial page load.
    const { pipeline, RawImage } = await import('@huggingface/transformers');
    rawImageCtor = RawImage;
    extractorPromise = pipeline('image-feature-extraction', MODEL_ID, {
      dtype: 'q8', // -> vision_model_quantized.onnx (~90MB); ranking verified vs torch backend
      device: 'wasm',
      progress_callback: (info: { status?: string; progress?: number }) => {
        if (!onProgress) return;
        if (info.status === 'progress' && typeof info.progress === 'number') {
          onProgress(Math.min(0.95, Math.max(0, info.progress / 100)));
        } else if (info.status === 'ready') {
          onProgress(1);
        }
      },
    }).catch((err: unknown) => {
      extractorPromise = null;
      throw err;
    });
  } else if (onProgress) {
    onProgress(1);
  }
  return extractorPromise;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function getRawImageCtor(): any {
  return rawImageCtor;
}

export function l2normalize(v: ArrayLike<number>): number[] {
  let sum = 0;
  for (let i = 0; i < v.length; i++) sum += v[i] * v[i];
  const norm = Math.sqrt(sum) || 1;
  const out = new Array<number>(v.length);
  for (let i = 0; i < v.length; i++) out[i] = v[i] / norm;
  return out;
}

/** Embed an image from a data URL / blob URL / remote URL. Returns L2-normalized vector. */
export async function embedImageUrl(
  url: string,
  onProgress?: (fraction: number) => void,
): Promise<number[]> {
  const extractor = await getClipExtractor(onProgress);
  const RawImage = getRawImageCtor();
  const image = await RawImage.fromURL(url);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const output: any = await extractor(image, { pooling: 'mean', normalize: true });
  image.dispose?.();
  return l2normalize(output.data as ArrayLike<number>);
}

/** Embed the user's uploaded photo (data URL). Thin wrapper for clarity. */
export async function embedQueryImage(
  dataUrl: string,
  onProgress?: (fraction: number) => void,
): Promise<number[]> {
  return embedImageUrl(dataUrl, onProgress);
}

export function cosineSim(a: ArrayLike<number>, b: ArrayLike<number>): number {
  let s = 0;
  for (let i = 0; i < a.length; i++) s += a[i] * b[i];
  return s;
}
