# HUMAN_TODO.md — actions only the user can take

Rewritten 2026-10-02 (S1). Finished items removed. The agent cannot do the
items below (secrets, your accounts, your laptop, your supervisor).

## 1. Add GEMINI_API_KEY to Vercel (fixes photo descriptions)

Photo search currently falls back to the on-device classifier because
`/api/describe-image` returns 503 without a key.
a. Create a free key at Google AI Studio (free tier is enough).
b. Vercel dashboard → `shopsense` project → Settings → Environment Variables.
c. Add `GEMINI_API_KEY` (the key), for **Production** (Preview optional).
d. Redeploy (or push any commit) so it takes effect.
e. Tell me "key is live" — I will re-run the describe-eval and production smoke.
Never paste the key in chat or commit it.

## 2. Hand-label the eval (30 min) — production URL

The labelling page is live at https://shopsense-teal.vercel.app/eval-label.html
(after the R8 merge; until then it 404s — I will tell you when it's up).
a. Open it on your phone or laptop browser.
b. 12 queries × 5 results: tap yes / partly / no for each.
c. Tap "Export CSV" and send me the file.
I will compute real P@5 (baseline vs CLIP) and add it to docs/EVALUATION.md,
reported honestly even if CLIP shows no gain.

## 3. Deploy the FastAPI backend (human-gated)

Safe Hugging Face Space steps (rewritten S5 — cannot leak secrets):
a. Create a free Hugging Face account. CPU Basic (2 vCPU / 16 GB) is free.
   Note: free Spaces are **public** — a private Space needs a paid plan.
   Our backend has no secrets in code, so public is acceptable; user data
   stays in your own SQLite/Postgres, not in the Space.
b. New Space → SDK **Docker** → hardware CPU Basic → Create.
c. Push ONLY `backend/` (it has its own `.gitignore` excluding `*.db`,
   `.env`, `.venv`, `data/onnx_clip/`). Do NOT push `data/users.db` —
   it is git-ignored; the Space starts with an empty DB.
d. In the Space → Settings → Variables and secrets: add `JWT_SECRET`
   (generate: `openssl rand -hex 32`) as a **secret**, never in code.
e. Add env var `CORS_ORIGINS=https://shopsense-teal.vercel.app`
   (the backend reads this; default is `*` — do not leave `*` in production).
f. Note: free Space storage is ephemeral — SQLite **will be wiped** on
   restart. Acceptable for the demo; for real users attach a persistent
   Postgres (see `backend/docs/DATABASE.md`).
g. Smoke-test: `curl -X POST https://<space-url>/search/image -F photo=@test.jpg`
h. Tell me the URL — I will wire the Flutter app's `--dart-define=FASTAPI_BASE`.

## 4. Compile the Flutter app on your laptop (it can't compile here)

a. Install Flutter 3.47.6+ on your laptop.
b. `cd mobile && flutter pub get && flutter run --dart-define=FASTAPI_BASE=<space-url>`
c. If it fails, paste the errors into `mobile/ERRORS.md` and send it to me —
   I will fix them in loops (see `mobile/REVIEW.md` for the static review).

## 5. PWA icons (optional, for full installability)

The manifest uses `/icon.svg` (pushable as text). For the full install
prompt, Chrome wants PNG 192/512. Upload `icon-192.png` / `icon-512.png`
via the GitHub web UI (I cannot push binaries), then tell me and I will
switch the manifest back to PNG.

## 6. Supervisor (forward `supervisor-brief.md`)

Three questions for Nosheen Fatima: (1) live-data posture for the demo —
keep live with disclosure, seek written permission, or curated catalogue
only; (2) Flutter APK vs installable PWA for the defense; (3) the exact
submission/defense date.

## Flip the live-data kill switch

`LIVE_SOURCES_ENABLED` is a Vercel env var (R9). Default ON.
To disable all store contact: Vercel → Settings → Environment Variables →
add `LIVE_SOURCES_ENABLED=0` → redeploy. The API returns
`liveSourcesEnabled: false`, 0 results, all sources `disabled`, and the UI
shows "Live sources are disabled". Remove the variable (or set `1`) and
redeploy to re-enable.

## Never authorized for the agent

- force-push or any history rewrite
- deleting branches, repos, deployments, or projects
- changing billing or adding paid services
- touching any other repo or Vercel project
- printing or storing secret values
- any change to access rights or tokens
