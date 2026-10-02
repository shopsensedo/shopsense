"""R4 — price_history snapshots (SQLite prototype of the PG price_history table).

A row is written for each product returned by a search, at most one per
product per hour. In this prototype the "live fetch" is a catalog search
(seed data); the production scraper path (per the FYP proposal) will feed
the same table with real marketplace prices. The Postgres schema
(db/schema.sql) has the equivalent price_history table.
"""

import time

from .userstore import _connect, now

ONE_HOUR = 3600


def record_price_snapshots(products: list[dict]) -> int:
    """Write price_history rows; returns the number of rows actually written.

    products: dicts with 'id' (sku), 'title', 'price_pkr', 'platform',
    'purchase_link'. Skips products seen within the last hour.
    """
    written = 0
    cutoff = now() - ONE_HOUR
    with _connect() as conn:
        for p in products:
            sku = str(p.get("id") or "")
            price = p.get("price_pkr")
            if not sku or not isinstance(price, int) or price < 0:
                continue
            # Ensure a product row exists for the FK.
            conn.execute(
                "INSERT INTO price_products (sku, title, platform, purchase_link, created_at)"
                " VALUES (?, ?, ?, ?, ?)"
                " ON CONFLICT(sku) DO UPDATE SET title=excluded.title,"
                " platform=excluded.platform, purchase_link=excluded.purchase_link",
                (sku, str(p.get("title") or "")[:300], str(p.get("platform") or ""),
                 str(p.get("purchase_link") or ""), now()),
            )
            recent = conn.execute(
                "SELECT 1 FROM price_history WHERE sku = ? AND recorded_at >= ? LIMIT 1",
                (sku, cutoff),
            ).fetchone()
            if recent:
                continue
            conn.execute(
                "INSERT INTO price_history (sku, price_pkr, recorded_at)"
                " VALUES (?, ?, ?)",
                (sku, price, now()),
            )
            written += 1
    return written


def price_history_for(sku: str, limit: int = 24) -> list[dict]:
    with _connect() as conn:
        rows = conn.execute(
            "SELECT price_pkr, recorded_at FROM price_history WHERE sku = ?"
            " ORDER BY recorded_at DESC LIMIT ?",
            (sku, max(1, min(limit, 200))),
        ).fetchall()
        return [dict(r) for r in rows]


def _prune() -> int:
    """Drop snapshots older than 90 days. Returns rows deleted."""
    with _connect() as conn:
        cur = conn.execute(
            "DELETE FROM price_history WHERE recorded_at < ?",
            (now() - 90 * 24 * 3600,),
        )
        return cur.rowcount
