"""SQLite-backed user store for accounts + personal data (T4).

Why SQLite and not the Postgres catalog DB: the apt-installed PostgreSQL is
ephemeral on this VM (wiped on replacement) and needs no running service;
user accounts, saved items, history and alerts don't need pgvector. The
file lives at data/users.db (env USERS_DB overrides) so it survives restarts
inside the workspace. Connections are opened per operation — simple and
thread-safe under uvicorn's threadpool.
"""

import os
import sqlite3
import time
from pathlib import Path

DEFAULT_DB = Path(__file__).resolve().parent.parent / "data" / "users.db"


def db_path() -> Path:
    return Path(os.environ.get("USERS_DB", str(DEFAULT_DB)))


_SCHEMA = """
CREATE TABLE IF NOT EXISTS users (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    email         TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    name          TEXT,
    created_at    INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS listings (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    url         TEXT UNIQUE NOT NULL,
    title       TEXT NOT NULL,
    price_pkr   INTEGER NOT NULL DEFAULT 0,
    image_url   TEXT NOT NULL DEFAULT '',
    platform    TEXT NOT NULL DEFAULT '',
    created_at  INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS saved_items (
    user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    listing_id INTEGER NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
    saved_at   INTEGER NOT NULL,
    PRIMARY KEY (user_id, listing_id)
);
CREATE TABLE IF NOT EXISTS search_history (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    query_text TEXT NOT NULL,
    created_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS price_alerts (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    listing_id INTEGER NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
    target_pkr INTEGER NOT NULL CHECK (target_pkr > 0),
    channel    TEXT NOT NULL DEFAULT 'whatsapp',
    contact    TEXT NOT NULL DEFAULT '',
    is_active  INTEGER NOT NULL DEFAULT 1,
    created_at INTEGER NOT NULL
);
-- R4: price tracking (SQLite prototype of the Postgres price_history table).
CREATE TABLE IF NOT EXISTS price_products (
    sku           TEXT PRIMARY KEY,
    title         TEXT NOT NULL DEFAULT '',
    platform      TEXT NOT NULL DEFAULT '',
    purchase_link TEXT NOT NULL DEFAULT '',
    created_at    INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS price_history (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    sku         TEXT NOT NULL REFERENCES price_products(sku) ON DELETE CASCADE,
    price_pkr   INTEGER NOT NULL CHECK (price_pkr >= 0),
    recorded_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS price_history_sku_idx ON price_history (sku, recorded_at DESC);
-- R4: server-side search results cache.
CREATE TABLE IF NOT EXISTS search_cache (
    kind         TEXT NOT NULL,
    query_key    TEXT NOT NULL,
    results_json TEXT NOT NULL,
    created_at   INTEGER NOT NULL,
    PRIMARY KEY (kind, query_key)
);
"""


def _connect() -> sqlite3.Connection:
    path = db_path()
    path.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(str(path), check_same_thread=False)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    return conn


def init_db() -> None:
    with _connect() as conn:
        conn.executescript(_SCHEMA)


def now() -> int:
    return int(time.time())


class Store:
    """Thin data-access layer; all methods open and close their own connection."""

    def create_user(self, email: str, password_hash: str, name: str) -> dict | None:
        try:
            with _connect() as conn:
                cur = conn.execute(
                    "INSERT INTO users (email, password_hash, name, created_at)"
                    " VALUES (?, ?, ?, ?)",
                    (email, password_hash, name, now()),
                )
                uid = cur.lastrowid
                row = conn.execute(
                    "SELECT id, email, name FROM users WHERE id = ?", (uid,)
                ).fetchone()
                return dict(row)
        except sqlite3.IntegrityError:
            return None  # email already taken

    def get_user_by_email(self, email: str) -> dict | None:
        with _connect() as conn:
            row = conn.execute(
                "SELECT id, email, password_hash, name FROM users WHERE email = ?",
                (email,),
            ).fetchone()
            return dict(row) if row else None

    def get_user(self, user_id: int) -> dict | None:
        with _connect() as conn:
            row = conn.execute(
                "SELECT id, email, name FROM users WHERE id = ?", (user_id,)
            ).fetchone()
            return dict(row) if row else None

    def upsert_listing(self, url: str, title: str, price_pkr: int,
                       image_url: str, platform: str) -> int:
        with _connect() as conn:
            conn.execute(
                "INSERT INTO listings (url, title, price_pkr, image_url, platform, created_at)"
                " VALUES (?, ?, ?, ?, ?, ?)"
                " ON CONFLICT(url) DO UPDATE SET"
                " title=excluded.title, price_pkr=excluded.price_pkr,"
                " image_url=excluded.image_url, platform=excluded.platform",
                (url, title, max(0, int(price_pkr or 0)), image_url or "",
                 platform or "", now()),
            )
            row = conn.execute(
                "SELECT id FROM listings WHERE url = ?", (url,)).fetchone()
            return int(row["id"])

    def save_item(self, user_id: int, listing_id: int) -> None:
        with _connect() as conn:
            conn.execute(
                "INSERT INTO saved_items (user_id, listing_id, saved_at)"
                " VALUES (?, ?, ?) ON CONFLICT DO NOTHING",
                (user_id, listing_id, now()),
            )

    def list_saved(self, user_id: int) -> list[dict]:
        with _connect() as conn:
            rows = conn.execute(
                "SELECT l.id, l.url, l.title, l.price_pkr, l.image_url, l.platform,"
                " s.saved_at FROM saved_items s JOIN listings l ON l.id = s.listing_id"
                " WHERE s.user_id = ? ORDER BY s.saved_at DESC", (user_id,)
            ).fetchall()
            return [dict(r) for r in rows]

    def delete_saved(self, user_id: int, listing_id: int) -> bool:
        with _connect() as conn:
            cur = conn.execute(
                "DELETE FROM saved_items WHERE user_id = ? AND listing_id = ?",
                (user_id, listing_id),
            )
            return cur.rowcount > 0

    def add_history(self, user_id: int, query_text: str) -> int:
        with _connect() as conn:
            cur = conn.execute(
                "INSERT INTO search_history (user_id, query_text, created_at)"
                " VALUES (?, ?, ?)", (user_id, query_text, now()),
            )
            return int(cur.lastrowid)

    def list_history(self, user_id: int, limit: int = 30) -> list[dict]:
        with _connect() as conn:
            rows = conn.execute(
                "SELECT id, query_text, created_at FROM search_history"
                " WHERE user_id = ? ORDER BY created_at DESC LIMIT ?",
                (user_id, max(1, min(limit, 100))),
            ).fetchall()
            return [dict(r) for r in rows]

    def add_alert(self, user_id: int, listing_id: int, target_pkr: int,
                  channel: str, contact: str) -> int:
        with _connect() as conn:
            cur = conn.execute(
                "INSERT INTO price_alerts (user_id, listing_id, target_pkr,"
                " channel, contact, created_at) VALUES (?, ?, ?, ?, ?, ?)",
                (user_id, listing_id, target_pkr, channel, contact, now()),
            )
            return int(cur.lastrowid)

    def list_alerts(self, user_id: int) -> list[dict]:
        with _connect() as conn:
            rows = conn.execute(
                "SELECT a.id, a.target_pkr, a.channel, a.contact, a.is_active,"
                " a.created_at, l.url, l.title, l.price_pkr, l.image_url, l.platform"
                " FROM price_alerts a JOIN listings l ON l.id = a.listing_id"
                " WHERE a.user_id = ? ORDER BY a.created_at DESC", (user_id,)
            ).fetchall()
            return [dict(r) for r in rows]

    def delete_alert(self, user_id: int, alert_id: int) -> bool:
        with _connect() as conn:
            cur = conn.execute(
                "DELETE FROM price_alerts WHERE id = ? AND user_id = ?",
                (alert_id, user_id),
            )
            return cur.rowcount > 0
