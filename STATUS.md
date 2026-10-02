# ShopSense — STATUS.md

Autonomous backlog loop. Updated after every task / blocker.

Rollback: revert the task's merge commit on main (GitHub → Revert); Vercel redeploys main automatically — no data migration involved.

| task | status | commits | evidence summary | known issues |
|------|--------|---------|------------------|--------------|
| T1 thumbnails, deploy safety, small fixes | HUMAN-GATED | e1: remote `33d7957` (8 local commits incl. 61d2e4d corrections, pushed in 2 approved batches) | Code complete, 126/126 tests, tsc+build green, smoke PASS on local real-handler harness, thumbnail failure 0% over 5 queries (68/68). Three T1 corrections applied and re-verified: exact-host proxy allowlist, capped streaming reads, guaranteed title-scored retention. Preview deployment EXISTS: https://shopsense-git-e1-shopsense.vercel.app — Vercel commit check **success** on 33d7957. | Preview smoke BLOCKED: Vercel Authentication (SSO login) is on for previews — every route 302s to login, so `npm run smoke` cannot reach the app. Needs the user: temporarily disable preview Deployment Protection, or supply a Protection Bypass token. Merge + production verify wait on smoke. |
| T2 any-image understanding | UNVERIFIED (code done) | t2: 298e6c9 + 2765049 (local, stacked on e1) | /api/describe-image + client integration. Review fixes committed: schema requires 2–3 queries (single → 502), `cleanBrand()` nulls suspicious/sentence-like/URL brands, `describedSkipSource()` routes on the multiword category key ("power bank" now keeps PriceOye), cache persists described/fallback so cache hits restore the honest chip, privacy notice now actually paints (determinate mode entered before the request). 129/129 tests, tsc+build green, real local HTTP missing-key check → 503 {"error":"describe_unavailable","fallback":true}. Gemini free-key steps added to HUMAN_TODO.md. | Live 10-image evaluation HUMAN-GATED on GEMINI_API_KEY (absent). Push + preview smoke + merge blocked on T1's merge (t2 stacks on e1). |
| T3 fashion source + grouping | READY TO MERGE | t3: remote `9401ed24` (4 approved batches; stacked on t2→e1) | Telemart (telex.pk Shopify suggest API) added as 3rd source: 10 fashion listings/query with real PKR prices, telex.pk URLs, cdn.shopify.com images. Cross-platform grouping (titleTokens/titleOverlap/groupByTitle + GroupCard UI with per-platform prices + best-price). **Gated by `TELEMART_ENABLED` flag (default OFF)** — production never calls telex.pk until the terms review is cleared; see docs/SOURCES.md. 161/161 tests (incl. 3 flag tests), tsc+build green. Live: 3 end-to-end queries (sneakers 30, milli 22, audionic 30 results); audionic → 8 correct cross-platform groups, 0 false merges after hardening. 1 Shopify image proxied OK. | Terms review DONE 2026-10-02: ToS §13 forbids automated data gathering (robots.txt allows crawling) — documented in docs/SOURCES.md; flag stays OFF in production. |
| T4 backend, persistence, real accounts | TODO | — | — | deploy likely HUMAN-GATED |
| T5 evaluation | TODO | — | — | — |
| T6 mobile readiness | TODO | — | — | Flutter SDK presence unknown |
| T7 documentation + demo | TODO | — | — | — |

## T1 self-evaluation (2026-10-02 ~04:25 PKT, after corrections)

- Thumbnail failure ≤10% over 5 queries: **PASS** — 0% (68/68 images loaded
  through the fixed proxy: nike white sneakers 12/12, kala joota→black shoes
  12/12, safaid kurta 12/12, leather handbag 12/12, smartwatch 20/20).
  Measured locally against the real api/*.ts handlers (esbuild-transpiled,
  served on localhost). Before: 50%/33% on production (6/12, 4/12 failed).
  Cause: `*.slatic.net` missing from the /api/img allowlist → 403
  "host not allowed".
- Proxy allowlist is exact-host, not domain-anchored (user hard rule):
  **PASS** — only `pk-live-21.slatic.net`, `sg-test-11.slatic.net`,
  `static-01.daraz.pk`, `images.priceoye.pk` (the only hosts seen in live
  /api/live-search responses on 2026-10-02). Gate check on the transpiled
  handler: 4/4 allowlisted hosts passed the gate (upstream 404 → 502 only
  because the probe path was fake), 4/4 non-allowlisted rejected with 403
  (other slatic subdomain, slatic.net.evil.com, http, example.com).
- 8 MiB cap enforced by capped streaming: **PASS** — the handler now reads
  the body in chunks and aborts past 8 MiB (no full `arrayBuffer()` before
  the cap); content-length gate retained. tsc + esbuild-transpile + load
  verified.
- No result dropped for image failure: **PASS** — failed thumbnails kept via
  title-match scoring; `applyRelevanceThenSort` now guarantees title-scored
  ("Image unavailable") rows bypass the relevance cut (they keep ranked
  position below image-scored rows of the same tier; pool still capped at
  12). New test: 5 image-scored Strong trigger the cut, 3 image-scored
  Possibles dropped, 2 title-scored Possibles kept. Funnel accounting fixed:
  `imageKept` reported by the pool, `shortlistDropped` counts image-scored
  drops only (mirrored into api/_liveNormalize.ts per the D2-1 sync rule).
- Smoke on preview and production: **UNVERIFIED** — smoke **PASS** on the
  local harness running the real handlers
  (`npm run smoke -- http://localhost:4173`: 6/6 PASS, incl. slatic.net
  image → 200 image/jpeg). Preview/production runs need the branch push.
- Preview deployment (2026-10-02 ~04:45 PKT): the e1 preview EXISTS at
  https://shopsense-git-e1-shopsense.vercel.app and the Vercel commit check
  on 33d7957 is **success** (via GitHub commit-status API). But Vercel
  Authentication (SSO) is enabled for preview deployments: every route 302s
  to vercel.com/sso-api, so `npm run smoke` cannot reach the app. **BLOCKED
  on the user**: either temporarily disable Deployment Protection for
  previews (Vercel dashboard → shopsense project → Settings → Deployment
  Protection) or provide a Protection Bypass token through the secure flow.
  Merge to main and production smoke wait on this. No live marketplace
  requests were spent on this check (plain HTTP HEAD/GET only).
- New tests pass: **PASS** — 126/126 vitest on this branch (111 T1 +
  15 T2). tsc and build pass: **PASS** (`npx tsc --noEmit` clean,
  `npm run build` green).

Deviations: E1-1b is a second commit on the E1-1 item (no history rewrite
allowed); the remote push will squash 8 local commits into push_files
batches (per-item history preserved locally on branch e1); the parked
/tmp/push_e1_batch{1,2}.json payloads are STALE (pre-corrections) and must
be regenerated. Live marketplace searches used in T1: 11 of 15 (3
diagnosis + 1 prod smoke + 1 local smoke + 5 failure-rate queries, where
kala joota used its client-mapped "black shoes", + 1 extra client-mapped
black-shoes probe). Plus 4 CDN gate-verification fetches through /api/img
(tracked separately, not marketplace searches).

## T2 plan (3–5 lines)
1. New `api/describe-image.ts`: POST base64 JPEG (≤768 px, enforced
   client-side), GEMINI_API_KEY server-only, 8 s timeout, per-IP rate limit,
   strict JSON schema validation, prompt-injection-safe handling, no photo
   storage/logging. Missing key → 503 + fallback signal.
2. Client: downscale to 768 px JPEG, "We think this is: …" chip + Edit
   (runs text search), one-time privacy notice, fallback to 80-category
   classification with "Basic recognition used".
3. ≥8 mocked tests (valid/invalid JSON, timeout, missing key,
   prompt-injection, fallback, rate limit, oversize). Key absent → mark
   "code done, live verification pending" + Vercel env steps in HUMAN_TODO.md.

## Decisions and assumptions
- 2026-10-02: thumbnail failures were 403s from /api/img — Daraz serves
  images from *.slatic.net, which was missing from the proxy allowlist
  (verified: pk-live-21.slatic.net → 403, static-01.daraz.pk → 200).
- "Live requests" budget counts /api/live-search marketplace calls; CDN
  fetches through /api/img are tracked separately (4 gate-verification
  fetches in T1).
- T1 reuses the E1 branch `e1`; T2's branch `t2` stacks on `e1`.
- T2: photo sent as base64 data URL in JSON (simplest for serverless; no
  multipart parsing). Model default `gemini-2.5-flash`, overridable via
  GEMINI_MODEL env (no paid tier needed — free tier suffices for low volume).
  Current fallback is the existing 80-category classifier (not the backlog's
  "10-label" wording — the app has moved on since the backlog was written).
- T2 review fixes 2026-10-02 ~04:35 PKT: schema now requires 2–3 queries
  (single query → 502); brand must be a short visible name — suspicious /
  sentence-like / URL brand text → null; described-photo source routing uses
  the derived multiword category key via new `describedSkipSource()` (the old
  word-by-word check skipped PriceOye for "power bank"); cache entries now
  persist `described`/`describeFallback` so cache hits restore the honest
  description chip; the privacy notice now actually paints — it only renders
  in the determinate branch but progress was null during the describe
  request, so the loading screen now enters determinate mode (progress 0)
  before the request starts. Real local HTTP check: POST without
  GEMINI_API_KEY → 503 {"error":"describe_unavailable","fallback":true}.

## Incidents
- 2026-10-02 ~04:05 PKT: `pkill -f "local-api-server.mjs"` killed the
  invoking shell itself (pattern matched its own command line). Lesson added
  to AGENTS.md. No data loss; server was already stopped.

## T3 plan (3–5 lines)
1. Add a fashion-capable marketplace source to `api/live-search.ts`:
   probe Telemart (named in the FYP proposal) for a JSON search endpoint —
   check robots.txt + terms first, ≤4 probe requests; if no clean JSON API
   exists, document and skip rather than scraping HTML.
2. Cross-platform grouping: new `groupListings()` in the shared normalize
   layer clusters same-product listings across platforms by normalized-title
   token overlap (≥0.6); each group carries per-platform {price, url, image}
   and best-price/price-range — no invented data, only real listings grouped.
3. UI: results show comparison groups (≥2 platforms) with per-platform
   prices + "best price" marker; single-platform listings render as today.
   Tests use labeled fixtures; mocked unit tests for grouping edge cases.
4. Verify with tests/tsc/build + ≤6 live marketplace requests (1 Telemart
   probe search, 1 fashion + 1 electronics end-to-end); self-evaluate each
   criterion PASS/FAIL/UNVERIFIED. Branch `t3` stacked on `t2`.

## Next steps
- T1: e1 preview smoke is SSO-blocked (HUMAN_TODO #3) → user disables
  preview Deployment Protection or supplies a bypass token → smoke →
  merge to main → production smoke.
- T2: pushed only after T1 merges (t2 stacks on e1); live 10-image Gemini
  evaluation stays HUMAN-GATED on GEMINI_API_KEY.
- T3: approve the t3 push → Vercel preview → preview smoke → merge after
  T1/T2 (stack order e1 → t2 → t3).

## T3 self-evaluation (2026-10-02 ~05:00 PKT)

- Fashion source added: **PASS** — Telemart via telex.pk's public Shopify
  suggest API (the same endpoint the site's own search UI uses; no auth, no
  HTML scraping). telex.pk/robots.txt explicitly allows public storefront
  crawling; Shopify's platform ToS was not separately reviewed (residual
  note, not a blocker: merchant's own public endpoint).
- Real data only, no invention: **PASS** — prices/titles/URLs/images all
  from live responses; failures surface as "unavailable", never skipped.
- Cross-platform grouping: **PASS** — greedy title-token clustering with
  model-number veto, decimal-spec exclusion, deduped overlap, short-title
  containment rule. On the real "audionic" query: 8/8 multi-source groups
  are correct same-product matches (Airbud 550/425/730, Battlebuds,
  Max 550 BT Plus, Max-230, Signature S680, AD-7000 Plus); 3 false merges
  found during the session (duplicate-word inflation, "550" earbuds vs
  speaker, "2.1 Channel" spec-as-model) were fixed and regression-tested.
- Comparison UI: **PASS** (code) / **UNVERIFIED** (visual) — GroupCard with
  per-platform real prices/links + best-price marker renders for
  multi-platform groups; single-platform listings unchanged. Build green;
  no browser available locally for a visual check.
- Tests/typecheck/build: **PASS** — 158/158 (29 new T3), tsc clean,
  vite build green.
- Live budget: **PASS** — 15/15 (6 probes: 2 robots, 1 search page, 2
  suggest attempts, 1 cart.js; 9 end-to-end: 3 queries × 3 sources).
  One extra cdn.shopify.com image fetch verified the proxy allowlist
  addition (HTTP 200, valid 800×800 JPEG).
