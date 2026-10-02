-- ShopSense PostgreSQL + pgvector schema (Phase 1)
-- Run:  docker compose up -d db
--       psql postgresql://shopsense:shopsense@localhost:5432/shopsense -f db/schema.sql

CREATE EXTENSION IF NOT EXISTS vector;

-- Product catalog with CLIP image embeddings (clip-vit-base-patch32 → 512 dims)
CREATE TABLE IF NOT EXISTS products (
    id            SERIAL PRIMARY KEY,
    sku           TEXT UNIQUE,              -- stable external id, e.g. 'seed-01'
    title         TEXT NOT NULL,
    title_urdu    TEXT,
    price_pkr     INTEGER NOT NULL CHECK (price_pkr >= 0),
    platform      TEXT NOT NULL,          -- daraz | priceoye | telemart | bagallery | ...
    image_url     TEXT NOT NULL,
    image_file    TEXT,                   -- local seed image filename (Phase 2/3)
    purchase_link TEXT NOT NULL,
    category      TEXT,                   -- footwear | ethnic | electronics | ...
    embedding     vector(512),            -- CLIP image embedding, L2-normalized
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Fast cosine-similarity search over embeddings
CREATE INDEX IF NOT EXISTS products_embedding_idx
    ON products USING hnsw (embedding vector_cosine_ops);

-- Price history for tracking / alerts (Phase 4 fills this via scrapers)
CREATE TABLE IF NOT EXISTS price_history (
    id         SERIAL PRIMARY KEY,
    product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    price_pkr  INTEGER NOT NULL CHECK (price_pkr >= 0),
    scraped_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS price_history_product_idx ON price_history (product_id, scraped_at DESC);

-- R4: server-side search results cache (SQLite prototype uses search_cache
-- in users.db; the production equivalent is this table or Redis).
CREATE TABLE IF NOT EXISTS search_cache (
    kind         TEXT NOT NULL,   -- 'image' | 'text'
    query_key    TEXT NOT NULL,   -- sha256 of image bytes or normalized query
    results_json JSONB NOT NULL,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (kind, query_key)
);

-- Users + personal features (Phase 3)
CREATE TABLE IF NOT EXISTS users (
    id            SERIAL PRIMARY KEY,
    email         TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    name          TEXT,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS saved_items (
    user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    saved_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (user_id, product_id)
);

CREATE TABLE IF NOT EXISTS search_history (
    id          SERIAL PRIMARY KEY,
    user_id     INTEGER REFERENCES users(id) ON DELETE CASCADE,
    query_text  TEXT,
    image_name  TEXT,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS price_alerts (
    id          SERIAL PRIMARY KEY,
    user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    product_id  INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    target_pkr  INTEGER NOT NULL CHECK (target_pkr > 0),
    channel     TEXT NOT NULL DEFAULT 'whatsapp',  -- whatsapp | email
    contact     TEXT NOT NULL,
    is_active   BOOLEAN NOT NULL DEFAULT TRUE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
