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

## Results (2026-10-02 — three runs: cold cache, warm cache with the R6 fix, warm cache with R7+R8)

| Set | n | mean P@5 (CLIP-ranked) | mean P@5 (marketplace order, baseline) | mean CLIP gain | mean P@10 |
|---|---|---|---|---|---|
| Photo | 30 | 0.82 | 0.84 | −0.02 | 0.83 |
| Text | 30 | 0.88 | 0.87 | +0.01 | 0.87 |

**What this proves — and what it doesn't.** The baseline is the
marketplace's original per-source order (PriceOye, then Daraz, then
Telemart — the order `/api/live-search` returns before any CLIP
re-ranking). On the title-keyword rubric, CLIP re-ranking moves mean P@5
by −0.02 (photo) and +0.01 (text): essentially nothing. This does **not**
mean CLIP adds no value — it means the rubric cannot see CLIP's value.
The rubric judges **titles only**; CLIP re-ranks by **visual similarity
to the query photo**. A visually perfect match with a keyword-poor title
scores 0 under the rubric, and a keyword-stuffed title scores 1 even if
the photo looks nothing like the query. **The user's hand labels are the
real visual-relevance test** — the rubric is a cheap proxy for
regression detection only.

**Hand-labelling page.** `public/eval-label.html` (noindex, not linked
from the app) shows the 12 sampled queries with their query photo/text,
the top-5 results (thumbnail via `/api/img`, title, price) and
yes/partly/no buttons. Guide on the page: *yes* = same product type and
similar look; *partly* = same type but different look, or an accessory;
*no* = anything else. Labels persist in the browser's localStorage; a CSV
download button exports them for merging into the eval report.

Run 1 (35 live requests): cold cache, pre-fix marketplace queries.
Run 2 (3 live requests): warm cache + R6 de-duplication fix
(`audionic` → `audionic`, not `audionic audionic`; same for `power bank`,
`perfume`). Precision unchanged by the fix — the sites ignore the
duplicate token, as predicted in T5.
Run 3 (1 live request): warm cache + R7 query-building fix
(`baby diapers pack` → `baby diapers`, not `pack`) + R8 baseline
reporting. Photo mean P@5 0.82, text 0.88.

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
Re-checked 2026-10-02 after the R7 fix: `baby diapers pack` → marketplace
query `baby diapers` (was `pack`), top-5 all baby diapers — fixed.
`laptop` → `laptop`, top-5 all laptops/Chromebooks (the earlier P@5 0.4
was a rubric artifact: titles say "Chromebook", not "laptop").
`khussa` → `khussa`, top-5 all khussa (earlier P@5 0.5 was the same title
artifact). The remaining "weak spots" were the rubric's, not the
pipeline's.


## Hand-labelled P@5 (2026-10-02 — user labelled 12 queries × 5 results)

The user hand-labelled the 12 sampled queries on the production labelling
page (`/eval-label.html`). Labels: **yes** = same product type and similar
look; **partly** = same type but different look, or an accessory;
**no** = anything else. The displayed results were in **CLIP-ranked order**
(decreasing CLIP score), so this measures CLIP-ranked P@5.

| query | kind | P@5 (strict: yes only) | P@5 (lenient: yes+partly) |
|-------|------|------------------------|---------------------------|
| handbag_3.jpg | photo | 0.60 | 1.00 |
| sunglasses_1.jpg | photo | 0.80 | 1.00 |
| backpack_1.jpg | photo | 0.00 | 1.00 |
| backpack_3.jpg | photo | 0.00 | 1.00 |
| dress_3.jpg | photo | 0.00 | 0.00 |
| sneakers_1.jpg | photo | 0.00 | 1.00 |
| safaid kurta | text | 1.00 | 1.00 |
| sasti ghari | text | 1.00 | 1.00 |
| sunehri watch | text | 0.40 | 1.00 |
| adidas running shoes | text | 0.40 | 1.00 |
| haier washing machine | text | 0.20 | 0.20 |
| kurti lawn | text | 1.00 | 1.00 |
| **Mean (n=12)** | | **0.45** | **0.85** |
| **Photo mean (n=6)** | | **0.23** | **0.83** |
| **Text mean (n=6)** | | **0.67** | **0.87** |

**Honest reading:** CLIP re-ranking puts *at least partly relevant* results
in the top 5 most of the time (lenient 0.85), but exact matches (strict)
are much rarer (0.45 overall, 0.23 for photos). The `dress_3.jpg` query
failed completely (all 5 labelled "no"). The title-rubric P@5 from the
automated eval (photo 0.82, text 0.87) substantially overstates relevance
compared to human judgement — the rubric counts title keyword matches,
not visual correctness.

**Limitation:** baseline (marketplace-order) P@5 cannot be computed from
these labels because the labelling page displayed results in CLIP-ranked
order only; the baseline order was not preserved. A baseline-vs-CLIP
comparison on hand labels would require re-running the labelling with
both orders displayed.

## Limitations

1. **Labels are agent-made** (keyword rubric on titles) until the user
   spot-checks the CSV sample or uses the hand-labelling page.
   **The title-keyword rubric judges titles only; the user's hand labels
   are the real visual-relevance test.** Title wording can undercount
   visually correct matches, and the baseline-vs-CLIP comparison above
   shows the rubric cannot measure CLIP's visual re-ranking value.
2. Node CLIP ≠ browser CLIP byte-for-byte (same weights, standard
   preprocessing; the browser's exact image pipeline isn't reproduced).
3. Latency is VM-local (model cached, no real network variance for
   embeddings); production user latency will differ.
4. The 30 photos are a convenience sample, not a representative product
   distribution.
5. **describe-image evaluation: PENDING.** `scripts/eval2/describeEval.mjs`
   evaluates the 30 photos through production `/api/describe-image`
   (7 s spacing, respecting the 10 req/min limit) and compares the
   described category with the zero-shot classifier. Production returns
   503 (no `GEMINI_API_KEY` configured), so the run is marked PENDING;
   the script is ready to re-run when the key is set.

**Hand-label sample.** Each run writes `eval2/sample-<ts>.csv`: a random
20% of queries (12, seeded RNG for reproducibility) × top-5 results with the
agent label and a blank `hand_label` column for manual labelling. The
same 12 queries are shown on the `public/eval-label.html` labelling page.
