# Backend database: SQLite (prototype) vs PostgreSQL + pgvector (proposal)

## Current state (prototype, 2026-10-02)

The FastAPI backend uses **two** databases today:

| Concern | Store | Why |
|---|---|---|
| Accounts, saved items, history, alerts | SQLite `data/users.db` (via `app/userstore.py`) | Zero-service: works with no DB server running; survives VM restarts inside the workspace |
| Price snapshots (`price_history`) | SQLite `data/users.db` tables `price_products` + `price_history` (via `app/pricehistory.py`) | Same zero-service reason; ≤1 row per product per hour |
| Search results cache | SQLite `data/users.db` table `search_cache`, 15-min TTL (via `app/cache.py`) | Same |
| Product catalog + embeddings | PostgreSQL 16 + pgvector **when available**, JSON seed files as fallback (`app/search.py`) | pgvector does the cosine search; the JSON fallback keeps the API runnable anywhere |

## How this differs from the FYP proposal

The proposal specifies **PostgreSQL + pgvector as the single store** for
products, embeddings, price_history, users, saved items, search history and
price alerts. The prototype splits user/price/cache data into SQLite because:

1. The apt-installed PostgreSQL on this VM is **ephemeral** (wiped on VM
   replacement); SQLite in the workspace survives.
2. User accounts and price snapshots don't need vector search.
3. The demo must run with no services to install.

## Migration path to the proposal

- `db/schema.sql` is the canonical Postgres schema and is kept current: it
  now includes `search_cache` (R4) alongside `price_history`.
- Moving a table from SQLite to Postgres is a data copy, not a redesign:
  the table shapes mirror the PG schema (`price_products`/`price_history`
  in SQLite ≈ `products`/`price_history` in PG; `search_cache` exists in both).
- `docker-compose.yml` (`pgvector/pgvector:pg16`) remains the portable
  Postgres path; `scripts/seed_db.py` restores the catalog + embeddings.
- Production notes: replace the in-memory auth rate limiter (`app/ratelimit.py`)
  with Redis, set a real `JWT_SECRET`, and point `USERS_DB` at Postgres
  (or drop SQLite entirely once the single-store migration is done).

## Public hosting

Human-gated. Exact deployment steps are in `~/HUMAN_TODO.md` (ShopSense section).
