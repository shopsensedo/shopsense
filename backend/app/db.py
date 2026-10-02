"""PostgreSQL connection pool (Phase 3).

DATABASE_URL env var, e.g.:
    postgresql://shopsense:shopsense@localhost:5432/shopsense
"""

import os

from psycopg_pool import ConnectionPool

DATABASE_URL = os.environ.get(
    "DATABASE_URL",
    "postgresql://shopsense:shopsense@localhost:5432/shopsense",
)

_pool: ConnectionPool | None = None


def get_pool() -> ConnectionPool:
    global _pool
    if _pool is None:
        _pool = ConnectionPool(DATABASE_URL, min_size=1, max_size=5, timeout=10)
    return _pool


class DatabaseUnavailable(Exception):
    """Raised when PostgreSQL cannot be reached."""


def get_conn():
    try:
        return get_pool().getconn()
    except Exception as exc:
        raise DatabaseUnavailable(
            f"Database not reachable at {DATABASE_URL.split('@')[-1]}: {exc}"
        )
