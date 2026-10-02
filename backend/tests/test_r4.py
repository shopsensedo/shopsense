"""R4 tests: password rules, rate limiting, price_history snapshots, search cache.

Run:  cd ~/workspace/shopsense-backend && python -m pytest tests/test_r4.py -q
Uses a temp USERS_DB so the real data/users.db is untouched.
"""
import os
import tempfile

import pytest

TMP = tempfile.mkdtemp()
os.environ["USERS_DB"] = os.path.join(TMP, "r4_test.db")

from app import auth, ratelimit  # noqa: E402
from app import pricehistory  # noqa: E402
from app import cache  # noqa: E402
from app.userstore import init_db, _connect  # noqa: E402

init_db()


# --- password rules ---------------------------------------------------------
@pytest.mark.parametrize("pw, ok", [
    ("secret123", True),
    ("Passw0rd!", True),
    ("short1", False),        # < 8 chars
    ("allletters", False),    # no digit
    ("12345678", False),      # no letter
    ("", False),
])
def test_password_rules(pw, ok):
    assert (auth.password_problem(pw) is None) is ok


def test_register_rejects_weak_password():
    from fastapi.testclient import TestClient
    from app.main import app
    ratelimit.reset("register")
    c = TestClient(app)
    r = c.post("/auth/register", json={
        "email": "weak@example.com", "password": "allletters", "name": "W"})
    assert r.status_code == 422
    assert "digit" in r.json()["detail"]


# --- rate limiting ----------------------------------------------------------
def test_login_rate_limit():
    from fastapi.testclient import TestClient
    from app.main import app
    ratelimit.reset("login")
    c = TestClient(app)
    # 10 bad logins allowed (401s), the 11th is 429.
    statuses = [c.post("/auth/login", json={
        "email": "nobody@example.com", "password": "x"}).status_code
        for _ in range(11)]
    assert statuses[:10] == [401] * 10
    assert statuses[10] == 429


def test_register_rate_limit():
    from fastapi.testclient import TestClient
    from app.main import app
    ratelimit.reset("register")
    c = TestClient(app)
    codes = []
    for i in range(6):
        r = c.post("/auth/register", json={
            "email": f"rl{i}@example.com", "password": "Secret123", "name": ""})
        codes.append(r.status_code)
    assert codes[:5] == [201] * 5
    assert codes[5] == 429


# --- price_history ----------------------------------------------------------
PRODUCTS = [
    {"id": "sku-a", "title": "Test Shoe", "price_pkr": 2500,
     "platform": "daraz", "purchase_link": "https://x/a"},
    {"id": "sku-b", "title": "Test Watch", "price_pkr": 5000,
     "platform": "priceoye", "purchase_link": "https://x/b"},
]


def test_price_history_written_once_per_hour():
    assert pricehistory.record_price_snapshots(PRODUCTS) == 2
    # Second call within the hour writes nothing.
    assert pricehistory.record_price_snapshots(PRODUCTS) == 0
    hist = pricehistory.price_history_for("sku-a")
    assert len(hist) == 1 and hist[0]["price_pkr"] == 2500


def test_price_history_records_new_price_after_hour():
    import time
    with _connect() as conn:
        conn.execute("UPDATE price_history SET recorded_at = ? WHERE sku = 'sku-a'",
                     (int(time.time()) - 3700,))
    changed = [dict(PRODUCTS[0], price_pkr=2400), PRODUCTS[1]]
    assert pricehistory.record_price_snapshots(changed) == 1
    hist = pricehistory.price_history_for("sku-a")
    assert [h["price_pkr"] for h in hist] == [2400, 2500]


# --- search cache -----------------------------------------------------------
def test_cache_miss_hit_expiry(monkeypatch):
    assert cache.get_cached("text", "nope") is None
    cache.set_cached("text", "k1", [{"id": "x"}])
    assert cache.get_cached("text", "k1") == [{"id": "x"}]
    # Simulate expiry by backdating.
    import time
    with _connect() as conn:
        conn.execute("UPDATE search_cache SET created_at = ?",
                     (int(time.time()) - cache.CACHE_TTL_S - 1,))
    assert cache.get_cached("text", "k1") is None
