# ShopSense — Data Sources

How each marketplace source works, what it returns, and the compliance
status of each. Reviewed 2026-10-02 (R5 re-review). A source is only enabled
in production when its row below says so.

> **R5 correction (2026-10-02):** the T1-era notes below previously claimed
> "no ToS prohibition on automated access found" for PriceOye and Daraz.
> A fresh review on 2026-10-02 found prohibitions for **both**. The rows
> below now state what was actually found. Nothing was disabled
> unilaterally — the decision is the user's — but the record no longer
> claims these sources are clearly permitted.

## PriceOye — ENABLED in production (compliance: MIXED — see below)

- **What:** `https://api.priceoye.pk/api/search_suggest?category=&widget=0&page=&query=<q>`
  — the JSON endpoint behind PriceOye's own search-suggest box. No auth,
  no HTML scraping.
- **Returns:** title, price (PKR), product URL (priceoye.pk), image
  (images.priceoye.pk).
- **Coverage:** electronics / appliances / mobiles only. The client skips
  PriceOye for non-electronics categories (`skip=priceoye`).
- **robots.txt** (fetched 2026-10-02, HTTP 200, both `priceoye.pk` and
  `api.priceoye.pk`): `User-agent: *` → `Disallow: *?` and `Disallow: *&`.
  Paraphrase: generic crawlers are told not to fetch **any URL containing a
  query string**. Our endpoint always has query parameters, so it falls
  under this disallow for generic user-agents.
- **Terms of Service** (https://priceoye.pk/terms-and-conditions, fetched
  2026-10-02): the page is a JavaScript-rendered SPA — the terms text could
  not be retrieved with a static fetch. **Not reviewed.** This is a gap.
- **Assessment:** the robots signal is negative for our access pattern
  (query-string API calls). ToS unknown. The honest label is MIXED, not
  clean. If the user wants a defensible posture: seek written permission
  from PriceOye, or use only their official affiliate/API channel if one
  exists.

## Daraz — ENABLED in production (compliance: MIXED — see below)

- **What:** `https://www.daraz.pk/catalog/?q=<q>&ajax=true` — Daraz's public
  catalog JSON (the data feed behind daraz.pk search pages). No auth, no
  HTML scraping.
- **Returns:** title, price (PKR), product URL (daraz.pk), image
  (*.slatic.net / static-01.daraz.pk).
- **Coverage:** general marketplace, all categories.
- **robots.txt** (fetched 2026-10-02, HTTP 200): `User-agent: *` includes
  `Disallow: /catalog/`. Paraphrase: generic crawlers are told not to fetch
  the catalog path — which is exactly the path our endpoint uses.
- **Terms of Use** (https://www.daraz.pk/terms-of-use, fetched 2026-10-02):
  the license clause prohibits "any use of data mining, robots, or similar
  data gathering and extraction tools" on the site. Paraphrase: Daraz's own
  terms forbid automated data gathering from the site, covering the kind of
  server-side fetching this source does.
- **Assessment:** both signals are negative (ToS prohibition + robots
  disallow of the exact path). This is the same shape of conflict as
  Telemart's, except here the flag was left ON because the T1 review missed
  it. The user should decide: keep as-is for the academic prototype with
  the disclosure below, seek permission, or disable.

## Telemart (telex.pk) — DISABLED in production (feature flag)

- **What:** `https://www.telex.pk/search/suggest.json?q=<query>&resources[type]=product&resources[limit]=12`
  — Shopify's public search-suggest JSON. This is the same endpoint the
  store's own search box calls; no auth, no HTML scraping, no login.
- **Who:** Telemart, rebranded on-site as "TeleX" — a Shopify storefront
  (shopify_search engine, Cloudflare fronted).
- **Returns per product:** `title`, `price` (PKR — verified via the store's
  own `/cart.js` during T3), `url` (relative `/products/<handle>`, resolved
  to `https://www.telex.pk/...`), image (`url` field → cdn.shopify.com,
  served through our `/api/img` allowlist proxy).
- **Coverage:** general store — electronics AND fashion. The "fashion
  source" label is shorthand: the nav lists Men's Fashion (eastern/western
  wear, footwear, watches, fragrances), Women's Fashion (eastern/western,
  bridal, footwear, watches, makeup), Kids, plus Mobiles & Tablets,
  Appliances, Computing. Live probes 2026-10-02: "kurti", "sneakers",
  "lawn suit", "handbag" each returned 5/5 relevant fashion products with
  real PKR prices (e.g. Milli Legacy sneakers Rs 2,499–3,999; lawn suits
  Rs 4,000–9,959).
- **robots.txt** (fetched 2026-10-02, HTTP 200): standard Shopify template.
  `User-agent: *` → `Allow: /`. Public product/collection/page/policy/cart
  HTML explicitly crawlable. Crawling is permitted at the robots level.
- **Terms of Service** (https://www.telex.pk/policies/terms-of-service,
  fetched 2026-10-02): Section 13 "PROHIBITED USES" states the Services may
  not be used "(e) to use any robot, spider, scraping, data gathering and
  extraction tools, automatic devices or processes, AI tools (such as
  agentic AI) or automated or manual means to access the Services".
  Paraphrase: the store's own terms forbid automated data gathering from
  the site — including the kind of server-side fetching this source does —
  even though robots.txt allows crawling. The two signals conflict; the ToS
  prohibition is the stricter, more specific one for our use case.
- **Decision:** the source stays behind the `TELEMART_ENABLED` server flag
  (default OFF). When OFF, `api/live-search` reports Telemart as `skipped`
  and never calls telex.pk. It stays OFF in production until the terms
  conflict is explicitly cleared by the user. Local/dev use
  `TELEMART_ENABLED=1` only for testing.

## Image proxy (/api/img) allowlist

Only these exact hosts (observed in live `/api/live-search` responses):
`pk-live-21.slatic.net`, `sg-test-11.slatic.net`, `static-01.daraz.pk`,
`images.priceoye.pk`, `cdn.shopify.com` (T3; only reachable when the
Telemart flag is on). Exact-host matching — no suffix wildcards.

## Compliant alternatives for a second fashion source (proposal, R5)

No new site has been contacted. Options, in order of preference:

1. **Official or affiliate feeds.** Check whether Daraz's affiliate program
   or any Pakistani fashion retailer offers an official product API /
   affiliate data feed, and use that instead of the storefront JSON.
   (Requires signup; no cost expected for affiliate tiers.)
2. **Written permission.** Email the store's support/partnership address
   asking for permission to query the public search-suggest endpoint at low
   volume for an academic final-year project, with caching and attribution.
   Keep the reply on file; only enable on a "yes".
3. **Small hand-curated demo catalogue, clearly labelled DEMO.** 30–50
   fashion products with titles, PKR prices, store links and thumbnail
   images we may legally use, shipped as a JSON file in the repo and shown
   with a "Demo catalogue" badge (never mixed silently with live results).
   Zero compliance risk; honest about what it is.

Recommendation: option 3 for the FYP demo (immediate, honest), option 1 or
2 in parallel for anything beyond the demo. **Do not call any new site
until the user approves.**

## Disclosure (for the README)

> ShopSense is an academic prototype (final-year project). Its price
> comparison queries the public search endpoints of Pakistani online stores
> at low volume (a few requests per user search, ≥2s apart, with response
> caching), and every result links back to the store's own product page —
> we don't take orders or payments. If you run one of these stores and want
> us to stop or to use an official feed instead, contact us and we will.
