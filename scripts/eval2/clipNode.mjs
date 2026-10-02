#!/usr/bin/env node
/**
 * R3 — CLIP in Node for the eval harness.
 *
 * Runs the SAME model the in-browser pipeline uses (Xenova/clip-vit-base-patch32,
 * q8 quantized — the browser build is the q8 ONNX export of these weights) via
 * @huggingface/transformers in Node.js. This is the closest runnable equivalent
 * of the in-browser visual pipeline: vision tower for image embeddings, text
 * tower for the 80-category classifier and text queries.
 *
 * Stated choice: Node.js + @huggingface/transformers (NOT a headless browser),
 * because the model weights and preprocessing are identical and it runs
 * deterministically in CI-like environments.
 */
import { pipeline, cos_sim, RawImage, AutoTokenizer, CLIPTextModelWithProjection } from '@huggingface/transformers';
import { readFileSync } from 'node:fs';

const MODEL = 'Xenova/clip-vit-base-patch32';
const DTYPE = 'q8';

let vision = null;
let tokenizer = null;
let textModel = null;
let loadMs = 0;

export async function loadClip(onProgress) {
  if (vision && textModel) return { loadMs };
  const t0 = Date.now();
  onProgress?.('loading CLIP vision tower (q8)…');
  vision = await pipeline('image-feature-extraction', MODEL, { dtype: DTYPE });
  onProgress?.('loading CLIP text tower (q8)…');
  tokenizer = await AutoTokenizer.from_pretrained(MODEL);
  textModel = await CLIPTextModelWithProjection.from_pretrained(MODEL, { dtype: DTYPE });
  loadMs = Date.now() - t0;
  return { loadMs };
}

function l2norm(vec) {
  let s = 0;
  for (let i = 0; i < vec.length; i++) s += vec[i] * vec[i];
  return Math.sqrt(s) || 1;
}

function asVec(out) {
  const v = Array.from(out.data);
  const n = Math.sqrt(v.reduce((s, x) => s + x * x, 0)) || 1;
  return v.map((x) => x / n);
}

/** Embed an image file -> L2-normalized 512-dim vector. */
export async function embedImageFile(path) {
  const t0 = Date.now();
  const img = await RawImage.fromBlob(new Blob([readFileSync(path)]));
  const out = await vision(img);
  return { vector: asVec(out), ms: Date.now() - t0 };
}

/** Embed an image buffer (e.g. downloaded thumbnail). */
export async function embedImageBuffer(buf) {
  const t0 = Date.now();
  const img = await RawImage.fromBlob(new Blob([buf]));
  const out = await vision(img);
  return { vector: asVec(out), ms: Date.now() - t0 };
}

/** Embed texts -> L2-normalized vectors (one per text). */
export async function embedTexts(texts) {
  const inputs = await tokenizer(texts, { padding: true, truncation: true });
  const output = await textModel(inputs);
  const embeds = output.text_embeds ?? output[0];
  const data = embeds.data;
  const dim = data.length / texts.length;
  return Array.from({ length: texts.length }, (_, i) =>
    asVec({ data: data.slice(i * dim, (i + 1) * dim) }),
  );
}

export function cosine(a, b) {
  let dot = 0, na = 0, nb = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i]; na += a[i] * a[i]; nb += b[i] * b[i];
  }
  return dot / (Math.sqrt(na) * Math.sqrt(nb) || 1);
}

/**
 * Zero-shot classify an image vector against categories {key, label}.
 * Mirrors the app: category texts are `a photo of ${label}`, embedded once
 * with the text tower; returns the winning KEY (the app's site query).
 */
let catCache = null;
export async function classifyImage(queryVec, categories) {
  if (!catCache) {
    const prompts = categories.map((c) => `a photo of ${c.label}`);
    const vecs = await embedTexts(prompts);
    catCache = categories.map((c, i) => ({ key: c.key, vec: vecs[i] }));
  }
  let best = { category: catCache[0].key, score: -1 };
  for (const { key, vec } of catCache) {
    const s = cosine(queryVec, vec);
    if (s > best.score) best = { category: key, score: s };
  }
  return best;
}

export { cos_sim };
