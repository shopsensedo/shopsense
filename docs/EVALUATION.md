# ShopSense — Search Quality Evaluation (R3)

`npm run eval2` — 60 queries (30 photo + 30 text) through the real pipeline
against the real API handlers, with real CLIP re-ranking.

## Method

**Which CLIP.** Node.js via `@huggingface/transformers` (v4.3.0),
`Xenova/clip-vit-base-patch32`, q8 quantized — the same weights as the
in-browser build (the browser loads the q8 ONNX export of these weights).
NOT a headless browser: preprocessing is the library's standard CLIP
pipeline, which is the closest runnable equivalent of the in-browser path.
Stated here so the numbers are read for what they are.

**Photo queries (30).** Each photo is embedded with the CLIP vision tower,
classified zero-shot into the app's 80 categories (category texts
`a photo of <label>`, embedded once with the CLIP text tower — exactly like
the app), and the winning category key becomes the marketplace query via the
real client pipeline (`planPhotoQuery`, same source-routing rule as the
app: PriceOye only for electronics/appliance keys). Live listings come from
the real `/api/live-search` handler (spawned locally); thumbnails are
downloaded via the real `/api/img` proxy (fallback: direct fetch), embedded
with the vision tower, and ranked by cosine similarity — the same re-rank
the browser performs.

**Text queries (30).** English, Roman Urdu and mixed. Each goes through the
real client pipeline (`parseQuery` → `categorizeKeywords` →
`buildMarketplaceQuery` → `priceOyeSellsCategory` routing), then live
listings, then the same thumbnail embed + cosine rank using the CLIP text
tower embedding of the marketplace query.

**Photos and licences.** 24 images from Wikimedia Commons (all freely
licensed: CC0, CC BY 2.0/4.0, CC BY-SA 2.0/4.0 — author, licence and file
URL per image in `eval2/photos/manifest.json`) + 6 of the project owner's
own product photos (FYP seed set). No image is used without a recorded
licence/source.

**Metrics per query.** Results returned and shown (top 10 after CLIP rank);
Precision@5 and Precision@10 under the written rubric below; latency
(cold = first query incl. model load, warm = rest); per-source success;
thumbnail failure rate.

**Rubric (agent-made).** Applied to result *titles*:
- `yes` (1.0): title contains a same-product-type keyword for the query
  subject (per-query keyword sets in `scripts/eval2/queries.mjs`).
- `partly` (0.5): title is a related category or accessory.
- `no` (0.0): otherwise.
- Precision@k = mean score over the top k.

**"Title keyword coverage"** is the old T5 keyword score renamed: the
fraction of the top-8 titles containing a query content token. It is
reported as what it is — keyword overlap — and never as relevance or
precision.

**Budget.** ≤100 marketplace requests, ≥2s apart. Raw live-search responses
and thumbnails are cached under `eval2/cache/`; reruns cost zero live
requests. `npm run eval2` works from a clean checkout (photos + manifest
are committed; the CLIP weights download once from HuggingFace).

**Hand-label sample.** Each run writes `eval2/sample-<ts>.csv`: a random
20% of queries (12, seeded RNG for reproducibility) × top-5 results with the
agent label and a blank `hand_label` column for manual labelling.

## Results (2026-10-02 — two runs: cold cache, then warm cache with the R6 fix)

| Set | n | mean P@5 | mean P@10 | mean latency (cold cache) | mean latency (warm cache) |
|---|---|---|---|---|---|
| Photo | 30 | 0.82 | 0.83 | ~9.5 s | ~2.0 s |
| Text | 30 | 0.87 | 0.87 | ~14 s | ~3.1 s |

Run 1 (35 live requests): cold cache, pre-fix marketplace queries.
Run 2 (3 live requests): warm cache + R6 de-duplication fix
(`audionic` → `audionic`, not `audionic audionic`; same for `power bank`,
`perfume`). Precision unchanged by the fix — the sites ignore the
duplicate token, as predicted in T5.

- Source success: PriceOye 1.00, Daraz 1.00 (no query had a source in
  `error` state; Telemart reports `skipped` — flag OFF).
- Thumbnail failure rate: 3/787 ≈ 0.004.
- Live requests used: well under the 100 budget (cache makes reruns free).
- CLIP load (cold): ~2 s warm start; first-run weight download is one-off.

**Photo failures (honest).** 4 of 30 photos misclassified, which drove
their P@5 to ~0: `headphones_1.jpg` → "laptop", `backpack_2.jpg` →
"bottle", `dress_2.jpg` → "sweater", `sneakers_2.jpg` → "sandals".
The classifier — not the ranking — is the weak link for these.

**Text notes.** Roman Urdu queries map correctly (`kala joota` →
`black shoes`, P@5 0.8; `sasta smartwatch dikhao` → `smartwatch`, P@5 1.0).
Weak spots: `laptop` (P@5 0.4 — generic query, mixed titles), `khussa`
(P@5 0.5 — niche product, thin results), `baby diapers pack` → marketplace
query collapsed to `pack` (P@5 0.5 — query-building weakness, worth a
follow-up).

## Limitations

1. **Labels are agent-made** (keyword rubric on titles) until the user
   spot-checks the CSV sample. Title wording can undercount visually
   correct matches.
2. The rubric judges titles, not images — a visually perfect result with a
   bad title scores 0.
3. Node CLIP ≠ browser CLIP byte-for-byte (same weights, standard
   preprocessing; the browser's exact image pipeline isn't reproduced).
4. Latency is VM-local (model cached, no real network variance for
   embeddings); production user latency will differ.
5. The 30 photos are a convenience sample, not a representative product
   distribution.
