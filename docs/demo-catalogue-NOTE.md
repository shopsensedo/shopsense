# Demo catalogue snapshot — NOT SHIPPED

**Scraped snapshot, for supervisor discussion only.**

The file `demo-catalogue.json` (40 real Daraz/PriceOye listings from the
2026-10-02 eval2 run, with hotlinked store-CDN images) was intentionally
**removed from the production bundle** (S3, 2026-10-02). It is not the
compliance-safe catalogue we planned.

- What ships in production: the demo catalogue **loader**
  (`src/lib/demoCatalogue.ts`) + the **CSV template**
  (`demo-catalogue-template.csv`). Both are tested.
- The snapshot itself lives only on the agent's machine at
  `~/workspace/demo-catalogue-SNAPSHOT.json` — not in git, not in the
  production bundle, not in `public/`.
- Do not add store-CDN image URLs to the production bundle without
  supervisor clearance (see `supervisor-brief.md` question 1).
