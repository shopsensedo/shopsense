# HUMAN_TODO.md — actions only the user can take

Standing rule (2026-10-02): the agent is authorized to create/commit/push
branches, run Vercel preview deploys, merge to main after a passing preview
smoke test, install deps, run tests/builds/smoke, and edit files in
shopsensedo/shopsense. The items below are NOT authorized — they land here.

## Pending (needs the user's own action)

1. ~~**Tap the GitHub approval card for the `e1` branch push** (T1/E1 work)~~
   — DONE 2026-10-02: push confirmed, remote `33d7957`, Vercel check green,
   preview deployed (smoke still blocked — see item 3).

2. **Tap the GitHub approval card for the `t3` branch push** (T3 work:
   Telemart fashion source + cross-platform grouping, local commit
   `01e2853` on branch `t3`, stacked on `t2`).
   The push tool (`github push_files`) always raises an approval card
   (~10 min expiry) that only you can tap — direct `git push` has no
   credentials in this environment and SSH is proxy-blocked.
   After you tap: Vercel auto-deploys a preview → I run `npm run smoke`
   on the preview → merge order after T1/T2 (stack: e1 → t2 → t3).
   If the card expired, tell me "continue" and I will re-trigger the push.

2. **Enable the T2 photo-description endpoint with a free Gemini API key**
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

3. **Unblock the T1 preview smoke test** (branch `e1` is deployed and the
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

## Never authorized for the agent

- force-push or any history rewrite
- deleting branches, repos, deployments, or projects
- changing billing or adding paid services
- touching any other repo or Vercel project
- printing or storing secret values
- any change to access rights or tokens
