# ShopSense

AI visual search & price comparison for Pakistani e-commerce (React + Vite + TypeScript).

## Deploy workflow
1. Never push directly to `main` — do all work on a feature branch.
2. Push the branch and open the Vercel preview URL (check the site, `/api/live-search`, and `/api/img` there).
3. Run the smoke test against the preview: `npm run smoke -- <preview-url>` (must print SMOKE PASS).
4. Only merge to `main` after the smoke test passes on the preview URL.
5. Verify the production URL serves the new deployment after the merge.
