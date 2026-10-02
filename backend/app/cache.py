"""R4 — server-side search results cache (SQLite table, TTL).

Caches /search and /search-text responses so repeated queries don't recompute
embeddings or hit the database. Prototype scope: single-process SQLite;
production (per the FYP proposal) would use Redis or the Postgres table.
"""

import json
import os
import time
from typing import Any

from .userstore import _connect

CACHE_TTL_S = int(os.environ.get("SEARCH_CACHE_TTL_S", "900"))  # 15 min


def get_cached(kind: str, key: str) -> Any | None:
    """Return cached results, or None on miss/expiry."""
    with _connect() as conn:
        row = conn.execute(
            "SELECT results_json, created_at FROM search_cache"
            " WHERE kind = ? AND query_key = ?",
            (kind, key),
        ).fetchone()
    if row is None:
        return None
    if int(time.time()) - int(row["created_at"]) > CACHE_TTL_S:
        with _connect() as conn:
            conn.execute(
                "DELETE FROM search_cache WHERE kind = ? AND query_key = ?",
                (kind, key),
            )
        return None
    return json.loads(row["results_json"])


def set_cached(kind: str, key: str, results: Any) -> None:
    payload = json.dumps(results)
    with _connect() as conn:
        conn.execute(
            "INSERT INTO search_cache (kind, query_key, results_json, created_at)"
            " VALUES (?, ?, ?, ?)"
            " ON CONFLICT(kind, query_key) DO UPDATE SET"
            " results_json=excluded.results_json, created_at=excluded.created_at",
            (kind, key, payload, int(time.time())),
        )
