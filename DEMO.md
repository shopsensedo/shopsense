# ShopSense — Demo script

A guided walkthrough for reviewers. Production: https://shopsense-teal.vercel.app
Everything below uses LIVE marketplace data unless marked Demo.

## 1. Text search (English)

1. Type **"nike white sneakers"** and search.
2. Expect: a "LIVE" badge, "Showing N of M results", and a source line
   like "PriceOye: not searched (electronics only) · Daraz: 12 results".
   (PriceOye is skipped for non-electronics; Telemart is skipped until its
   terms review clears — see `docs/SOURCES.md`.)
3. Cards show match strength: **Very similar / Similar / Loosely similar**
   (calibrated on real CLIP scores), real PKR prices, and platform links.
   Items without a usable price say **"Price unavailable"** — never a guess.
4. Open a card: raw price, match %, "How results were filtered" expander.

## 2. Roman Urdu query

Type **"mujhe kala joota chahiye"** → mapped to "black shoes" (watch the
mapped-keywords chip). Type **"sasta smartwatch dikhao"** → smartwatch
results sorted by price.

## 3. Image search

1. Upload any product photo (e.g. a charger, shoe, handbag).
2. The 80-category on-device classifier names it; the in-browser CLIP model
   (~90 MB, lazy-loaded with a progress pill) embeds it and ranks live
   listings by visual similarity.
3. Without a `GEMINI_API_KEY`, the Gemini description step is skipped and
   the UI says so — the on-device path still works.

## 4. Cross-platform grouping (T3)

Search **"audionic"**: identical products sold on multiple platforms are
merged into one GroupCard showing each platform's price and a
**best-price** marker. Single-platform listings render as normal cards.

## 5. Accounts (T4) — Demo without the backend

1. Tap the account icon → the sign-in modal opens.
2. With no account server configured (production default) a **"Demo — no
   account server is connected"** banner shows and sign-in is disabled.
   Continue as guest: saved items, alerts and history stay on the device.
3. With the local FastAPI backend running (`uvicorn` on :8000, `JWT_SECRET`
   set): sign up, save an item, set a price alert, reload — everything
   persists server-side. Passwords are stored **bcrypt-hashed**; sessions
   are JWT (HS256, 30 days); tampered tokens get 401.

## 6. Evaluation (T5)

Run `npm run eval` locally: 10 fixed queries (English + Roman Urdu +
brands) go through the real client pipeline against the real API handler.
Gates: every query ≥ 1 result, no source fully errors, price available on
≥ 40%. Prints EVAL PASS/FAIL plus a per-query table.

## 7. Deploy safety

`npm run smoke -- <url>`: 400 on empty query, 200 + results on a real
query, image proxy serves allowlisted CDNs and 403s everything else, and
every `api/*.ts` file loads under plain Node ESM (regression guard for
the D2-1 incident). Must print **SMOKE PASS**.
