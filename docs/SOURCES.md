# ShopSense — Data Sources

How each marketplace source works, what it returns, and the compliance
status of each. Reviewed 2026-10-02. A source is only enabled in production
when its row below says so.

## PriceOye — ENABLED in production

- **What:** `https://api.priceoye.pk/api/search_suggest` — the JSON endpoint
  behind PriceOye's own search-suggest box. No auth, no HTML scraping.
- **Returns:** title, price (PKR), product URL (priceoye.pk), image
  (images.priceoye.pk).
- **Coverage:** electronics / appliances / mobiles only. The client skips
  PriceOye for non-electronics categories (`skip=priceoye`).
- **Compliance:** public unauthenticated storefront endpoint, same one the
  site's UI uses. robots.txt checked during T1; no ToS prohibition on
  automated access found.

## Daraz — ENABLED in production

- **What:** Daraz's public catalog JSON (the data feed behind daraz.pk
  search pages). No auth, no HTML scraping.
- **Returns:** title, price (PKR), product URL (daraz.pk), image
  (*.slatic.net / static-01.daraz.pk).
- **Coverage:** general marketplace, all categories.
- **Compliance:** public catalog data; robots.txt checked during T1; no ToS
  prohibition on automated access found.

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
