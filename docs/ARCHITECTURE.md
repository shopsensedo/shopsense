# ShopSense mobile architecture

What the mobile app calls. There are two clients: the installable web PWA
(verified) and the Flutter app under `mobile/` (scaffold).

## Endpoints

All live endpoints are on the Vercel deployment
(`https://shopsense-teal.vercel.app`).

| Endpoint | Method | Purpose | Called by |
|---|---|---|---|
| `/api/live-search?q=…&pq=…&skip=…` | GET | Real listings from PriceOye + Daraz (+ Telemart when `TELEMART_ENABLED=1`). Returns `{ results, sources, liveSourcesEnabled }`. Kill switch: `LIVE_SOURCES_ENABLED=0` returns a clean disabled state without contacting any store. | PWA, Flutter |
| `/api/describe-image` | POST `{ image: base64, mimeType }` | Gemini description of a photo → 2–3 site queries + category. 503 when no key; 429 at 10 req/min/IP. | PWA, Flutter |
| `/api/img?url=…` | GET | Thumbnail proxy (allowlisted hosts only). | PWA, Flutter |
| `/search/image` (FastAPI, R11) | POST multipart photo | Server-side photo re-rank: describe/classify → live-search candidates → CLIP re-rank → ranked results. For clients that cannot run CLIP (Flutter). | Flutter |

## Request flow (Flutter)

```
photo ──▶ POST /search/image ──▶ FastAPI: classify → /api/live-search
                                              candidates → CLIP re-rank
                                         ──▶ ranked JSON ──▶ results screen
text ──▶ GET /api/live-search ──▶ results screen (client-side labels)
```

The PWA runs CLIP in the browser (transformers.js) and calls
`/api/live-search` directly; the Flutter app cannot, so it uses the
FastAPI `/search/image` endpoint for the re-rank step.

## Auth

`POST /auth/register`, `POST /auth/login` (FastAPI, local-only for now —
public hosting is human-gated). The Flutter app signs in against the same
account backend; the web PWA uses the demo session until the backend is
public.

## Design tokens

Flutter theme values mirror the web design tokens: void `#0C0C0C`, bone
`#F4F1EA`, lime `#B9C006`, smoke/fog greys. See `mobile/lib/theme.dart`.
API shapes follow `docs/openapi.yaml`.
