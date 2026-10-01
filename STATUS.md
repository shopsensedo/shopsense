# ShopSense — STATUS.md

Autonomous backlog loop. Updated after every task / blocker.

| task | status | commits | evidence summary | known issues |
|------|--------|---------|------------------|--------------|
| T1 thumbnails, deploy safety, small fixes | HUMAN-GATED | e1: 8d791c1, d74275c, 6244d67, f9ec782, 9d62cbb, 4e8ecb1, ada51b7 + T1-corrections (local; remote e1 will be squashed — see deviation) | Code complete, 111/111 tests, tsc+build green, smoke PASS on local real-handler harness, thumbnail failure 0% over 5 queries (68/68). Three T1 corrections applied and re-verified: exact-host proxy allowlist, capped streaming reads, guaranteed title-scored retention. Push to remote e1 BLOCKED: GitHub approval card expired (user asleep); payload parked at /tmp/push_e1_batch{1,2}.json (stale — regenerate after corrections); pending item in HUMAN_TODO.md. | Preview smoke, merge, production verify all pending the approval tap. |
| T2 any-image understanding | TODO | — | — | needs GEMINI_API_KEY (human) |
| T3 fashion source + grouping | TODO | — | — | — |
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
- New tests pass: **PASS** — 111/111 vitest on this branch (110 E1-era +
  retention test). tsc and build pass: **PASS** (`npx tsc --noEmit` clean,
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

## Decisions and assumptions
- 2026-10-02: thumbnail failures were 403s from /api/img — Daraz serves
  images from *.slatic.net, which was missing from the proxy allowlist
  (verified: pk-live-21.slatic.net → 403, static-01.daraz.pk → 200).
- "Live requests" budget counts /api/live-search marketplace calls; CDN
  fetches through /api/img are tracked separately (4 gate-verification
  fetches in T1).
- T1 reuses the E1 branch `e1`; T2's branch `t2` stacks on `e1`.

## Incidents
- 2026-10-02 ~04:05 PKT: `pkill -f "local-api-server.mjs"` killed the
  invoking shell itself (pattern matched its own command line). Lesson added
  to AGENTS.md. No data loss; server was already stopped.

## Next steps
- Push branch e1 (needs the approval tap) → Vercel preview → `npm run smoke`
  on preview (must print SMOKE PASS) → merge to main → production smoke +
  "nike white sneakers" / "kala joota" production re-runs (funnel line,
  "Image unavailable" count, top-5 titles/prices/labels).
