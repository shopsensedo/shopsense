# HUMAN_TODO.md — actions only the user can take

Standing rule (2026-10-02): the agent is authorized to create/commit/push
branches, run Vercel preview deploys, merge to main after a passing preview
smoke test, install deps, run tests/builds/smoke, and edit files in
shopsensedo/shopsense. The items below are NOT authorized — they land here.

## Pending (needs the user's own action)

1. ~~**Tap the GitHub approval card for the `e1` branch push** (T1/E1 work)~~
   — DONE 2026-10-02: push confirmed, remote `33d7957`, Vercel check green,
   preview deployed (smoke still blocked — see item 3).

2. ~~**Tap the GitHub approval cards for the `t3`, `t4`, `t5` branch pushes**~~
   — DONE 2026-10-02 (R1/R2): all merged to main (`6cb98672`, `617aef92`,
   `9d34335e`); production smoke PASS after each.
   (say "ready" and I fire them back-to-back, one card per branch, stack
   order t3 → t4 → t5).
   - `t3` (tip `7f75352`): Telemart fashion source + cross-platform
     grouping (Telemart via telex.pk public Shopify suggest API; GroupCard
     UI). Tests 158/158, live 15/15 budget, EVAL-relevant.
   - `t4` (tip `978ec12`): real accounts (bcrypt + JWT, `JWT_SECRET` env)
     + per-user persistence (SQLite `data/users.db`); mock auth removed;
     10/10 backend pytest, 167/167 vitest; live e2e incl. restart
     persistence proven. Backend public deploy stays human-gated.
   - `t5` (tip `23b3d6f`): `npm run eval` harness using the real client
     query pipeline; EVAL PASS — 244 results, 100% prices, 100% images.
   The push tool (`github push_files`) always raises an approval card
   (~10 min expiry) that only you can tap — direct `git push` has no
   credentials in this environment and SSH is proxy-blocked.
   After you tap: Vercel auto-deploys a preview per branch → I run
   `npm run smoke` on each preview → merge in stack order (only if smoke
   passes). If a card expired, tell me "continue" and I will re-trigger.

3. **Enable the T2 photo-description endpoint with a free Gemini API key**
   (needed for the "We think this is: …" description on photo searches;
   without it the app silently uses the basic on-device recognition).
   Steps:
   a. Create a free Gemini API key in Google AI Studio (free tier is
      enough for this feature).
   b. Open the Vercel dashboard → your `shopsense` project → Settings →
      Environment Variables.
   c. Add a variable named `GEMINI_API_KEY` with the key as its value,
      for both **Preview** and **Production** environments.
   d. Optional: add `GEMINI_MODEL` with value `gemini-2.5-flash`
      (this is already the default, so you can skip this).
   e. Redeploy the project (or push any commit) so the new variable
      takes effect.
   f. Never paste the key into chat or commit it to the repo — it lives
      only in Vercel's environment-variable settings.
   Until this is done, photo search works exactly as before with the
   on-device classifier; nothing breaks.

4. ~~**Unblock the T1 preview smoke test**~~ — SUPERSEDED 2026-10-02 (R2):
   T1/T2 content verified byte-identical in main; merged via the T3 squash.
   Preview smoke stays dropped (Vercel SSO); local verification replaces it.
   (branch `e1` is deployed and the
   Vercel build check is green, but I cannot run the smoke test).
   The preview at https://shopsense-git-e1-shopsense.vercel.app has Vercel
   Authentication (SSO login) enabled, so every page redirects to a login
   screen and `npm run smoke` cannot reach the app. Either:
   a. In the Vercel dashboard → `shopsense` project → Settings →
      Deployment Protection, temporarily turn OFF "Vercel Authentication"
      for Preview deployments (Production stays as it is), then tell me
      "smoke the preview" — I will run the smoke test and merge `e1` to
      `main` only if it passes; or
   b. Give me a Protection Bypass token through the secure credentials
      flow (never paste it in chat), and I will run smoke with it.
   Until one of these happens, `e1` stays unmerged and production
   unchanged — nothing is broken, the merge is simply waiting.

5. **Deploy the FastAPI backend publicly** (human-gated — R4). The backend
   runs local-only today. Exact steps when you're ready:
   a. Pick a host (Render / Railway / HuggingFace Spaces / a VPS —
      all have free tiers; no choice made yet).
   b. Set environment variables on the host: `JWT_SECRET` (long random
      string — generate with `openssl rand -hex 32`, never commit it),
      optionally `USERS_DB` (path to the SQLite file) and
      `SEARCH_CACHE_TTL_S` (default 900).
   c. Deploy from `~/workspace/shopsense-backend/` (Dockerfile included).
      The SQLite file `data/users.db` must be on persistent storage, or
      users/alerts/history are wiped on redeploy.
   d. Note the prototype split (see `docs/DATABASE.md`): accounts, price
      history and the search cache live in SQLite; the product catalog
      uses Postgres+pgvector when available, JSON seed files otherwise.
      The FYP proposal's single-Postgres store is the migration path.
   e. After deploy, tell me the public URL — I will set `VITE_API_URL`,
      verify the demo banner disappears, and re-run the auth e2e against
      the public backend.
   f. For production: put the host behind HTTPS, replace the in-memory
      auth rate limiter with Redis, and tighten CORS (currently `*`).

## Never authorized for the agent

- force-push or any history rewrite
- deleting branches, repos, deployments, or projects
- changing billing or adding paid services
- touching any other repo or Vercel project
- printing or storing secret values
- any change to access rights or tokens
