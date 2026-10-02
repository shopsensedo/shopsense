# ShopSense Photo Search Precision — Method & Evaluation (Draft)

## Method

### Pipeline Overview

ShopSense photo search follows a three-stage pipeline:

1. **Classification**: The uploaded photo is classified against ~90 marketplace query phrases (e.g., "women evening gown party wear", "men running sneakers") using CLIP zero-shot classification with prompt ensembling (3 templates averaged per phrase). The winning phrase becomes the marketplace query; its parent category controls source routing.

2. **Retrieval**: The marketplace query is sent to live sources (Daraz, PriceOye, Telemart via telex.pk). Each source returns candidate listings with titles, prices, URLs, and thumbnail images.

3. **Re-ranking**: Candidates are re-ranked using a fused score:
   - `1.0 * z(image cosine)` — CLIP image-to-image similarity between query photo and listing thumbnail
   - `0.5 * z(title-image cosine)` — CLIP text-to-image similarity between listing title and thumbnail
   - `0.5 * z(colour similarity)` — colour match via 12 CLIP colour prompts (disabled for electronics)
   
   All signals are z-normalized within each query's candidate pool.

### Baseline

The baseline ("marketplace order") is the ranking returned by the marketplace sources without CLIP re-ranking. This represents what users would see from the source sites directly.

## Evaluation

### Proxy Metric Ceiling Effect

Initial evaluation used agent-made title labels (keyword matching in listing titles). Results:
- Photo P@5: 0.81 (fused) vs 0.82 (baseline) — no measurable difference
- Text P@5: 0.88 (fused) vs 0.87 (baseline)

This proxy measures category words in titles, not visual colour/style/exact-type similarity. The 0.82 vs 0.81 finding demonstrates a ceiling effect: both arms retrieve the right categories, but the proxy cannot distinguish visual precision. **We do not tune against this proxy.**

### Hand-Labelling Protocol

To measure true visual precision, we conduct blind human labelling:

**Data**: 30 photo queries × deduplicated union of marketplace-order top-5 vs fused top-5 = 250 unique items (avg 8.3 per query). Arm identity is hidden via shuffling.

**Rubric** (0/1/2 scale):
- **0 — Wrong**: wrong product category entirely
- **1 — Partly**: right category, but wrong colour, style, or type
- **2 — Right**: right category + colour + style match

**Annotators**: Team of 3, ~100 items each. 50 items (20%) are double-labelled for inter-annotator agreement (Cohen's weighted kappa, quadratic weights for 0/1/2 scale).

**Tool**: Web-based labelling UI (`/hand-label.html`) with:
- Query photo (left) vs candidate thumbnail + title (right)
- Blind 0/1/2 buttons, progress bar, localStorage persistence
- CSV export with annotator ID and timestamp
- Assignment-specific URLs (`?assignment=a`) for kappa overlap distribution
- Export reminder every 25 items (localStorage fragility)

### Metrics

From the labels, we compute:

- **Strict P@5** (label = 2): right category + colour + style
- **Lenient P@5** (label ≥ 1): right category (allows colour/style mismatch)
- **Paired per-query comparison**: count of queries where fused improves / matches / worsens vs baseline, with bootstrap 95% CI over queries
- **Oracle P@5**: best achievable from the labelled pool (limited to labelled items; pool has ~30 candidates but only ~8 labelled per query)
- **Cohen's weighted kappa**: inter-annotator agreement on double-labelled items
- **Per-category breakdown**: flagged as low-n (few queries per category)

### Ablation Table (Skeleton)

| Arm | Strict P@5 | Lenient P@5 | Δ vs Baseline | 95% CI |
|-----|-----------|------------|---------------|--------|
| Marketplace order (baseline) | — | — | — | — |
| + Fused re-rank | — | — | — | — |
| + Pad-to-square (future) | — | — | — | — |

*Note: Pad-to-square is implemented behind a flag (default off) but not yet evaluated. It will be a separate arm requiring additional labels for items newly entering top-5.*

### Limitations

1. **Oracle gap**: Oracle P@5 only covers labelled items (~8 per query vs ~30 in pool). True oracle is unknowable without labelling the full pool.
2. **Low-n categories**: Per-category breakdowns have few queries each; treat as exploratory.
3. **Thumbnail quality**: Listing thumbnails vary in quality; low-res images may affect both CLIP and human judgement.
4. **Temporal**: Marketplace listings change; results are a snapshot from 2026-10-02.
