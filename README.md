# ShopSense

AI visual search & price comparison for Pakistani e-commerce.
React 19 + Vite + TypeScript frontend, Vercel serverless API, FastAPI + CLIP backend (local).

Snap a product photo or type a query (English or Roman Urdu) — ShopSense
searches live listings on PriceOye, Daraz and Telemart, re-ranks them with
on-device CLIP, and shows the best price per platform.

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

## Deploy workflow

1. Never push directly to `main` — do all work on a feature branch.
2. Push the branch; Vercel creates a preview deployment.
3. Run the smoke test against the preview: `npm run smoke -- <preview-url>` (must print SMOKE PASS).
   API handlers are also verified under plain Node ESM by the smoke script itself.
4. Only merge to `main` after the smoke test passes.
5. After merging, run the smoke test against production
   (`https://shopsense-teal.vercel.app`). If it fails, revert the merge
   immediately and record the incident in `STATUS.md`.
