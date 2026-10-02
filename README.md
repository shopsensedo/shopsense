# ShopSense

AI visual search & price comparison for Pakistani e-commerce.
React 19 + Vite + TypeScript frontend, Vercel serverless API, FastAPI + CLIP backend (local).

Snap a product photo or type a query (English or Roman Urdu) — ShopSense
searches live listings on PriceOye and Daraz, re-ranks them with
on-device CLIP, and shows the best price per platform.
(Telemart/telex.pk exists in the code behind `TELEMART_ENABLED`, which is
OFF in production pending a terms review — see `docs/SOURCES.md`.)

## Features

- **Visual search** — upload any product photo; an 80-category on-device
  classifier + in-browser CLIP (transformers.js, quantized) finds it.
- **Any-image understanding (T2)** — optional Gemini vision description
  (`/api/describe-image`, server-only `GEMINI_API_KEY`) produces precise
  site queries; graceful on-device fallback when the key is absent.
- **Live marketplace data** — `/api/live-search` fetches PriceOye, Daraz
  and Telemart (telex.pk) server-side in parallel. No mock data in results.
- **Cross-platform grouping (T3)** — same product across platforms is
  grouped into one card with per-platform prices and a best-price marker.
  Telemart is behind the `TELEMART_ENABLED` flag (default OFF, see
  `docs/SOURCES.md`).
- **Real accounts (T4)** — FastAPI backend with bcrypt + JWT auth;
  saved items, search history and price alerts sync per user. Without a
  configured backend the UI is clearly labelled Demo.
- **Honest UI** — "Showing N of M", match-strength labels (Very similar /
  Similar / Loosely similar), "Price unavailable" instead of invented
  prices, LIVE badges on real listings.
- **Evaluation (T5)** — `npm run eval`: 10 fixed queries through the real
  client pipeline against the real API handler, with PASS/FAIL gates.

## Quickstart

```bash
npm install
npm run dev        # http://localhost:3000
npm run build      # production build -> dist/
npm test           # vitest (173 tests)
npm run smoke -- <url>   # deploy smoke test, must print SMOKE PASS
npm run eval       # live search-quality evaluation (10 queries, ~2 min)
npm run eval2      # full evaluation: 60 queries (30 photo + 30 text) with real CLIP re-rank (~15 min)
```

## Environment

| Variable | Where | Default | Purpose |
|---|---|---|---|
| `TELEMART_ENABLED` | API server | off | `1` enables the telex.pk source (terms review pending — see `docs/SOURCES.md`) |
| `GEMINI_API_KEY` | API server | — | enables `/api/describe-image` (T2); server-only, never in client code |
| `VITE_API_URL` | client build | `http://localhost:8000` | FastAPI backend for accounts (T4) |
| `JWT_SECRET` | backend | — | JWT signing secret for the FastAPI backend |

## Docs

- `docs/SOURCES.md` — every marketplace source: endpoint, coverage, robots.txt + terms review
- `docs/openapi.yaml` — OpenAPI 3.1 for the FastAPI backend (T6)
- `DEMO.md` — guided demo script
- `STATUS.md` — task log with evidence and known issues
- `HUMAN_TODO.md` — items only the user can do (approvals, keys, phone checks)

## Live vs branch-only vs human-gated

| Feature | Status | Evidence |
|---|---|---|
| Live text + image search (PriceOye, Daraz) | **Live** | production smoke PASS after every merge |
| Thumbnail proxy allowlist | **Live** | 200 on allowlisted CDN, 403 elsewhere (prod) |
| Cross-platform grouping | **Live** | in main; verified on live data (GroupCard visual check pending) |
| Demo auth labelling | **Live** | banner string in production bundle |
| Telemart source | **Branch-only** (code in main, flag OFF) | production reports `telemart: skipped`; terms review pending |
| `npm run eval` / `npm run eval2` | **Branch-only** (scripts in main) | run locally, not on production |
| Real accounts (FastAPI backend) | **Human-gated** | backend is local-only; no public deploy without explicit approval |
| Gemini image description | **Human-gated** | needs `GEMINI_API_KEY`; fallback verified on production |
| Mobile app (Flutter) | **Human-gated** | not started; needs an explicit go-ahead |
| `docs/openapi.yaml` | **Branch-only** | T6, merged for reference |

## Disclosure

ShopSense is an academic prototype (final-year project). Its price
comparison queries the public search endpoints of Pakistani online stores
at low volume (a few requests per user search, ≥2s apart, with response
caching), and every result links back to the store's own product page —
we don't take orders or payments. If you run one of these stores and want
us to stop or to use an official feed instead, contact us and we will.

## Deploy workflow

1. Never push directly to `main` — do all work on a feature branch.
2. Before merging: `npm test`, `npm run build`, and `npm run smoke` against
   a local server running the real `api/*.ts` handlers must all pass.
   (Preview smoke was dropped — Vercel SSO blocks automated preview checks;
   previews are checked by hand in a browser.)
3. Only merge to `main` after local verification passes.
4. After merging, run the smoke test against production
   (`https://shopsense-teal.vercel.app`). If it fails, revert the merge
   immediately and record the incident in `STATUS.md`.
