# HUMAN_TODO.md — actions only the user can take

Standing rule (2026-10-02): the agent is authorized to create/commit/push
branches, run Vercel preview deploys, merge to main after a passing preview
smoke test, install deps, run tests/builds/smoke, and edit files in
shopsensedo/shopsense. The items below are NOT authorized — they land here.

## Pending (needs the user's own action)

1. **Tap the GitHub approval card for the `e1` branch push** (T1/E1 work).
   The push tool (`github push_files`) always raises an approval card
   (~10 min expiry) that only you can tap — direct `git push` has no
   credentials in this environment and SSH is proxy-blocked.
   What the push contains: 15 files, 2 batches, branch `e1`, creating it
   from `main` + the E1 changes (6 local commits squashed into the push;
   per-item history is preserved locally on branch `e1`).
   After you tap: Vercel auto-deploys a preview → I run `npm run smoke`
   on the preview → merge `e1` to `main` (only if smoke passes) →
   verify production. If the card expired, tell me "continue" and I will
   re-trigger the push.

## Never authorized for the agent

- force-push or any history rewrite
- deleting branches, repos, deployments, or projects
- changing billing or adding paid services
- touching any other repo or Vercel project
- printing or storing secret values
- any change to access rights or tokens
