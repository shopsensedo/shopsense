# ShopSense — STATUS.md

Autonomous backlog loop. Updated after every task / blocker.

Rollback: revert the task's merge commit on main (GitHub → Revert); Vercel redeploys main automatically — no data migration involved.

| task | status | commits | evidence summary | known issues |
|------|--------|---------|------------------|--------------|
| T1 thumbnails, deploy safety, small fixes | MERGED | Content entered main via the T3 squash `6cb98672` (the t3 branch carried e1's full file set); PR #1 | api/img.ts: exact-host allowlist (4 CDN hosts), 8 MiB capped streaming — both byte-identical in main; title-scored retention markers ("Image unavailable" x4, imageKept x8) present in main's liveSearch.ts; scripts/smoke.mjs + partE1.test.ts byte-identical in main. Production: smoke 6/6 PASS (img 200 image/jpeg, 403 on non-allowlisted). | GroupCard/visual parts N/A to T1. e1 branch superseded. |
| T2 any-image understanding | MERGED | Content entered main via the T3 squash `6cb98672` (the t3 branch carried t2's full file set); PR #1 | api/describe-image.ts + src/lib/describeImage.ts byte-identical in main; "We think this is" / "Basic recognition used" UI strings in main's ResultsScreen. Production: POST /api/describe-image (no key) → 503 {"error":"describe_unavailable","fallback":true} — fallback path verified live. 10-image Gemini eval still needs GEMINI_API_KEY (human-gated). | t2 branch superseded. |
| T3 fashion source + grouping | MERGED | `6cb98672` (PR #1, squash) | Telemart behind `TELEMART_ENABLED` (default OFF). Production live-search: `sources.telemart: 'skipped'`, 0 telex.pk calls — verified. Grouping: groupByTitle + GroupCard in main; 22 live listings → 18 groups, 4 correct multi-platform groups (audionic). docs/SOURCES.md with terms review in main. | ToS §13 conflict documented; flag stays OFF until user clears. GroupCard visual UNVERIFIED. t3 branch superseded. |
| T4 backend, persistence, real accounts | MERGED | `617aef92` (PR #3 via rebuilt branch t4m; PR #2 closed — stacked history caused add/add conflicts) | Demo banner + disabled sign-in when backend unreachable; banner string verified in production bundle. Backend 10/10 pytest; frontend 173/173 vitest; local e2e re-verified 2026-10-02 (register/login/401/save/alert/history/restart-persistence/tampered-401; bcrypt $2b$ hashes, no plaintext). | Backend local-only, no public deploy (human-gated). t4/t4m branches superseded. |
| T5 evaluation | MERGED | `9d34335e` (PR #4 via rebuilt branch t5m) | `npm run eval` in main (scripts/eval.mjs + evalQuery.ts, package.json script). EVAL PASS 2026-10-01: 244 listings, price 100%, images 100%. Keyword proxy renamed — see R3. | buildMarketplaceQuery doubles tokens ("audionic audionic") — fixed in R6. t5/t5m branches superseded. |
| T6 mobile readiness | BRANCH ONLY | t6 (not merged) | docs/openapi.yaml: OpenAPI 3.1 for the FastAPI backend (12 paths, 18 schemas, YAML-validated). | Flutter SDK presence unknown; backend has no public host. |
| T7 documentation + demo | BRANCH ONLY | t7 (not merged) | README.md + DEMO.md written from branch contents. | README/DEMO will be re-checked to claim only LIVE items before merge (R6). |

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

## T4 plan (3–5 lines)
1. Backend (`~/workspace/shopsense-backend`, local FastAPI): real auth in
   new `app/auth.py` — SQLite user store (`data/users.db`, stdlib sqlite3,
   survives VM restarts unlike the wiped apt Postgres), `POST
   /auth/register` + `POST /auth/login` with bcrypt hashing and JWT
   (`JWT_SECRET` env, never logged). New `app/me.py`: `GET/POST/DELETE
   /me/saved-items`, `/me/history`, `/me/alerts`; live listings upserted
   by URL into a `listings` table so saved items reference real listings.
2. Frontend: new `src/lib/authClient.ts` (JWT in memory + localStorage,
   `Authorization: Bearer`); AuthModal calls the real backend — no more
   mock user, clear error when the backend is unreachable. Saved
   items/alerts/history sync to the backend when logged in; localStorage
   stays the guest/offline store.
3. Tests: backend pytest (register/login, wrong-password 401, JWT tamper
   401, saved-item + alert round-trip on a temp DB); frontend vitest for
   authClient with mocked fetch. Then tsc + build.
4. Verify live locally: uvicorn :8000 — register → login → save a real
   live listing → list → create alert → delete. Backend public deployment
   stays HUMAN-GATED (local only; no new repo authorized). Branch `t4`
   stacked on `t3`.

## T4 self-evaluation (2026-10-02 ~05:15 PKT)

- Real accounts: **PASS** — `POST /auth/register` + `/auth/login` with
  bcrypt hashing and JWT (`JWT_SECRET` env, never logged); wrong-password
  and unknown-email return the identical 401 (no existence leak); tampered
  tokens rejected. 10/10 backend pytest green.
- Persistence: **PASS** — SQLite user store (`data/users.db`, survives VM
  restarts; the apt Postgres was wiped again). Saved items, search
  history, price alerts per user; live listings upserted by URL so saved
  items reference real listings. Restart-proven: saved item + history
  survived a uvicorn restart.
- No mock auth: **PASS** — the hardcoded mock user and prefilled demo
  credentials are gone; an unreachable backend shows an honest error and
  the app keeps working as a guest (localStorage store unchanged).
- Sync behavior: **PASS** (code) / **UNVERIFIED** (browser) — session
  restore on launch, pull+merge on login (guest work preserved, dedupe by
  URL), write-through on save/unsave/alert/history with offline fallback.
  No browser available locally for a click-through.
- Tests/typecheck/build: **PASS** — frontend 167/167 (9 new T4), backend
  10/10, `tsc` clean, `vite build` green.
- Live e2e: **PASS** — register → save real listing → list → create alert
  → history → delete, all 200/201; tampered token → 401.
- Backend public deployment: **HUMAN-GATED** — stays local (no public
  host; creating a new GitHub repo is not authorized). `JWT_SECRET` must
  be set in the deploy environment when one exists.
- Push: blocked on the approval tap; goes after the `t3` push (stack
  t4 → t3 → t2 → e1).

## T5 plan (3–5 lines)
1. New `scripts/eval.mjs` + `npm run eval`: spawns the real-handler local
   API server, runs a fixed 10-query set (English + Roman Urdu + brands:
   "nike white sneakers", "kala joota", "sasta smartwatch", "audionic",
   "milli sneakers", "sneakers", "power bank", "bachon ke kapray",
   "laptop", "perfume") with ≥2s between requests (30 marketplace calls,
   inside the 100 budget).
2. Per query records: total count, per-source counts, price-available
   fraction (same rule as `isPriceAvailable`), image-present fraction, and
   a keyword relevance proxy (fraction of top-8 titles containing a query
   content token — labeled as a proxy, never as human judgment).
3. Hard gates → non-zero exit: every query returns ≥1 result; no source in
   `error` for all queries; overall price-available fraction ≥ 40%.
   Prints a table + writes timestamped `eval/eval-report-*.json`.
4. Run it, fix failures (max 3 cycles), record the graded evaluation in
   STATUS.md. Branch `t5` stacked on `t4`.

## T5 self-evaluation (2026-10-02 ~06:00 PKT)

- Harness built: **PASS** — `npm run eval` (scripts/eval.mjs +
  scripts/evalQuery.ts) sends exactly what the app sends, via the real
  client query pipeline bundled with esbuild; no hand-written query
  guesses. 10 queries, ≥2s spacing, ~66 marketplace calls total (inside
  the 100 budget).
- Gates: **PASS** — EVAL PASS, all green: every query ≥1 result (244
  total), zero source errors, price-available 100% (one query 95% — a
  single honestly-labeled "Price unavailable"), images present 100%.
- Relevance (keyword proxy, English mapped query): **PASS** — 8/10
  queries score 1.00 on top-8 titles; laptop 0.38 and perfume 0.75 are
  proxy artifacts (titles like "Lenovo Legion Pro 7" / "Eau de Parfum"
  omit the keyword while being the right product — verified by reading
  the titles). Spot-checked top-5 titles for 3 queries: all the correct
  product type, zero electronics-in-sneakers class errors.
- Observations (not gates, for future work): `buildMarketplaceQuery`
  doubles tokens for brand-only/single-noun queries ("audionic
  audionic", "perfume perfume", "power bank bank") — harmless to results
  but sloppy; PriceOye correctly skipped for 7/10 non-electronics
  queries via category routing.
- Tests/typecheck/build: **PASS** — 167/167, tsc clean, build green.
- What eval does NOT measure: **UNVERIFIED** — the final ranked UX (the
  in-browser CLIP rerank can't run in node); human relevance judgment.
  The report labels the proxy as what it is.
- Push: blocked on the approval tap; goes after t3/t4 (stack
  t5 → t4 → t3 → t2 → e1).


## LIVE IN PRODUCTION (evidence-backed, 2026-10-02)

- Thumbnail fixes (T1): `/api/img` exact-host allowlist + 8 MiB capped streaming — production smoke: allowlisted image → 200 image/jpeg, `example.com` → 403.
- Deploy smoke script (T1): `scripts/smoke.mjs` in main; `npm run smoke -- https://shopsense-teal.vercel.app` → 6/6 PASS after every merge (T3/T4/T5).
- Any-image endpoint (T2): `POST /api/describe-image` on production (no key) → 503 `{"error":"describe_unavailable","fallback":true}`; UI falls back to on-device classification ("Basic recognition used").
- Telemart flag (T3): production `/api/live-search` reports `sources.telemart: 'skipped'`; zero telex.pk calls in production.
- Cross-platform grouping (T3): `groupByTitle` + GroupCard in main; verified on live data (audionic: 4 correct multi-platform groups). Visual rendering UNVERIFIED.
- Demo auth labelling (T4): "No account server is connected" banner string present in the production JS bundle; sign-in disabled without a backend.
- Eval harness (T5): `npm run eval` + scripts in main.

## BRANCH ONLY (not in main, not deployed)

- `t6`: `docs/openapi.yaml` (OpenAPI 3.1, backend) — not merged.
- `t7`: `README.md` + `DEMO.md` — not merged; will be trimmed to LIVE-only claims before merge (R6).
- `e1`, `t2`, `t3`, `t4`, `t5`, `t4m`, `t5m`: superseded working branches — their file contents are all in main via the squashes (`6cb98672`, `617aef92`, `9d34335e`); the branches themselves are stale.

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
