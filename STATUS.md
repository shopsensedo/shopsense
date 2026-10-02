# ShopSense — STATUS.md

Single source of truth. Rewritten from scratch 2026-10-02 (S1). One table:
item, status, where it lives, evidence. Historical self-evaluations moved to
`docs/HISTORY.md`.

Rollback: revert the task's merge commit on main (GitHub → Revert); Vercel
redeploys main automatically — no data migration involved.

| item | status | lives in | evidence |
|------|--------|----------|----------|
| T1 thumbnails, deploy safety, small fixes | MERGED | main | Via T3 squash `6cb98672` (PR #1). api/img.ts allowlist byte-identical in main. Production smoke 6/6 PASS. |
| T2 any-image understanding | MERGED | main | Via T3 squash `6cb98672` (PR #1). api/describe-image.ts in main. Production: no-key → 503 `describe_unavailable`, fallback verified. |
| T3 fashion source + grouping | MERGED | main | `6cb98672` (PR #1). `TELEMART_ENABLED` default OFF; production shows telemart `skipped`, 0 telex.pk calls. |
| T4 backend, persistence, real accounts | MERGED | main | `617aef92` (PR #3). Demo banner in production bundle. Backend local-only (human-gated). |
| T5 evaluation | MERGED | main | `9d34335e` (PR #4). `npm run eval` in main; EVAL PASS 2026-10-01. |
| T6 OpenAPI spec | MERGED | main | `9992c1d`. docs/openapi.yaml (OpenAPI 3.1) in main. |
| T7 README + DEMO (LIVE-only) | MERGED | main | `9ff7f8e`. README/DEMO.md in main. |
| R1–R6 backlog (production truth, eval2, backend hardening, compliance, fixes) | MERGED | main | `8e30bc1` (eval2 harness, SOURCES.md R5 correction, doubled-token fix) + `6e178c60` (STATUS truth). |
| R7 query-building fixes (pack/set/pcs drop, diapers noun) | BRANCH | r7r11 (not in main) | `src/lib/liveSearch.ts` + 11 tests in `src/__tests__/partC.test.ts`. Verified: `git show origin/main:src/lib/liveSearch.ts` lacks the packaging-word filter. 197/197 vitest on r7r11. |
| R8 baseline-vs-CLIP eval + labelling page | BRANCH | r7r11 (not in main) | `scripts/eval2.mjs` (baseline P@5), `scripts/eval2/describeEval.mjs`, `public/eval-label.html` + data. Production: `/eval-label.html` → 404 (verified 2026-10-02). |
| R9 kill switch + demo loader | BRANCH | r7r11 (not in main) | `api/live-search.ts` (`LIVE_SOURCES_ENABLED`), `src/lib/demoCatalogue.ts`, `src/__tests__/partR9.test.ts`. Verified: `git show origin/main:api/live-search.ts` has 0 matches for `LIVE_SOURCES_ENABLED`. Local test: `LIVE_SOURCES_ENABLED=0` → 0 results, all sources `disabled`, fetch never called. |
| R10 PWA + Flutter scaffold | BRANCH | r7r11 (not in main) | `public/manifest.webmanifest`, `public/sw.js`, `public/icon.svg`, `index.html` (manifest link + SW registration), `mobile/` scaffold, `docs/ARCHITECTURE.md`. Production: `/manifest.webmanifest` → 404, `/sw.js` → 404 (verified 2026-10-02). Flutter: SDK 3.47.6 installed, `pub get` fails (no pub.dev) → UNVERIFIED. |
| R11 backend /search/image | BRANCH | r7r11 (not in main) | `backend/` (moved into repo, S2) + `docs/openapi.yaml` (`/search/image` path). 24/24 pytest. Not deployed (human-gated). |
| FastAPI backend | BRANCH | r7r11 `backend/` (machine also has `~/workspace/shopsense-backend`) | `backend/.gitignore` excludes `*.db`, `.env`, `.venv`, `data/onnx_clip/`. Verified: no `.db`/`.env`/`.pem` under `backend/`. Public hosting human-gated. |

## Production (https://shopsense-teal.vercel.app) — verified 2026-10-02

- Live search works: `?q=laptop` → 200, 12 results (smoke 6/6 PASS).
- `/eval-label.html` → 404 (R8 not yet merged).
- `/manifest.webmanifest` → 404, `/sw.js` → 404 (R10 not yet merged).
- `/api/live-search` has no `LIVE_SOURCES_ENABLED` (R9 not yet merged).
- Telemart: `skipped`, 0 telex.pk calls (flag OFF).

## Known limitations (honest)

- Photo describe-image: 503 without `GEMINI_API_KEY` (human-gated).
- Flutter app: scaffolded, never compiled (no pub.dev in this environment).
- Eval hand-labelling: not done (user task, ~30 min).
- Demo catalogue snapshot: removed from bundle (S3); loader + CSV template ship.
