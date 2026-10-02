"""T4 tests: real accounts + per-user persistence.

Runs against a temp SQLite DB (USERS_DB env override) — no Postgres needed.
"""

import os
import tempfile

import pytest
from fastapi.testclient import TestClient

_tmp = tempfile.TemporaryDirectory()
os.environ["USERS_DB"] = os.path.join(_tmp.name, "test_users.db")
os.environ["JWT_SECRET"] = "test-secret-not-a-real-credential"

from app.main import app  # noqa: E402
from app import ratelimit  # noqa: E402

client = TestClient(app)


@pytest.fixture(autouse=True)
def _reset_rate_limits():
    # R4: the auth rate limiter is per-IP; reset between tests so the
    # T4 roundtrip tests don't trip it.
    ratelimit.reset()
    yield
    ratelimit.reset()

LISTING = {
    "title": "Audionic Airbud 550 Wireless Earbuds",
    "url": "https://www.daraz.pk/products/test-airbud-550-i12345.html",
    "price_pkr": 3499,
    "image_url": "https://img.daraz.pk/test.jpg",
    "platform": "daraz",
}


def _register(email="test@shopsense.pk", password="pakistan2026", name="Test User"):
    return client.post("/auth/register",
                       json={"email": email, "password": password, "name": name})


def _auth_headers(token):
    return {"Authorization": f"Bearer {token}"}


def test_register_and_login_roundtrip():
    r = _register()
    assert r.status_code == 201, r.text
    token = r.json()["access_token"]
    assert r.json()["user"]["email"] == "test@shopsense.pk"

    r2 = client.post("/auth/login",
                     json={"email": "test@shopsense.pk", "password": "pakistan2026"})
    assert r2.status_code == 200
    me = client.get("/auth/me", headers=_auth_headers(r2.json()["access_token"]))
    assert me.status_code == 200
    assert me.json()["user"]["email"] == "test@shopsense.pk"


def test_register_duplicate_email_is_409():
    assert _register(email="dup@shopsense.pk").status_code == 201
    assert _register(email="dup@shopsense.pk").status_code == 409


def test_login_wrong_password_is_401_without_leak():
    _register(email="leak@shopsense.pk", password="correct horse")
    bad_pw = client.post("/auth/login",
                         json={"email": "leak@shopsense.pk", "password": "wrong"})
    no_user = client.post("/auth/login",
                          json={"email": "nobody@shopsense.pk", "password": "wrong"})
    assert bad_pw.status_code == 401
    assert no_user.status_code == 401
    assert bad_pw.json()["detail"] == no_user.json()["detail"]


def test_me_endpoints_require_auth():
    assert client.get("/me/saved-items").status_code == 401
    assert client.post("/me/saved-items", json=LISTING).status_code == 401
    assert client.get("/me/alerts").status_code == 401


def test_tampered_token_is_rejected():
    token = _register(email="tamper@shopsense.pk").json()["access_token"]
    bad = token[:-4] + "abcd"
    assert client.get("/auth/me", headers=_auth_headers(bad)).status_code == 401
    assert client.get("/auth/me",
                      headers={"Authorization": "Bearer not-a-token"}).status_code == 401


def test_saved_items_roundtrip_with_real_listing():
    token = _register(email="saver@shopsense.pk").json()["access_token"]
    h = _auth_headers(token)

    r = client.post("/me/saved-items", json=LISTING, headers=h)
    assert r.status_code == 201
    listing_id = r.json()["listing_id"]

    # Saving the same listing again is idempotent (no duplicate row).
    assert client.post("/me/saved-items", json=LISTING, headers=h).status_code == 201

    items = client.get("/me/saved-items", headers=h).json()["items"]
    assert len(items) == 1
    assert items[0]["title"] == LISTING["title"]
    assert items[0]["url"] == LISTING["url"]
    assert items[0]["price_pkr"] == 3499

    assert client.delete(f"/me/saved-items/{listing_id}", headers=h).status_code == 200
    assert client.get("/me/saved-items", headers=h).json()["items"] == []


def test_users_cannot_see_each_others_items():
    t1 = _register(email="u1@shopsense.pk").json()["access_token"]
    t2 = _register(email="u2@shopsense.pk").json()["access_token"]
    client.post("/me/saved-items", json=LISTING, headers=_auth_headers(t1))
    assert client.get("/me/saved-items",
                      headers=_auth_headers(t2)).json()["items"] == []


def test_history_roundtrip():
    token = _register(email="hist@shopsense.pk").json()["access_token"]
    h = _auth_headers(token)
    assert client.post("/me/history", json={"query_text": "kala joota"},
                       headers=h).status_code == 201
    items = client.get("/me/history", headers=h).json()["items"]
    assert [i["query_text"] for i in items] == ["kala joota"]


def test_alerts_roundtrip_and_validation():
    token = _register(email="alert@shopsense.pk").json()["access_token"]
    h = _auth_headers(token)
    body = {**LISTING, "target_pkr": 2999, "channel": "whatsapp",
            "contact": "03001234567"}
    r = client.post("/me/alerts", json=body, headers=h)
    assert r.status_code == 201, r.text
    alert_id = r.json()["id"]

    items = client.get("/me/alerts", headers=h).json()["items"]
    assert len(items) == 1
    assert items[0]["target_pkr"] == 2999
    assert items[0]["title"] == LISTING["title"]

    # target_pkr must be > 0; contact is required.
    bad1 = {**body, "target_pkr": 0}
    assert client.post("/me/alerts", json=bad1, headers=h).status_code == 422
    bad2 = {**body, "contact": ""}
    assert client.post("/me/alerts", json=bad2, headers=h).status_code == 422

    assert client.delete(f"/me/alerts/{alert_id}", headers=h).status_code == 200
    assert client.get("/me/alerts", headers=h).json()["items"] == []


def test_password_is_hashed_not_stored():
    _register(email="hashcheck@shopsense.pk", password="supersecret123")
    from app.userstore import Store
    row = Store().get_user_by_email("hashcheck@shopsense.pk")
    assert row is not None
    assert row["password_hash"] != "supersecret123"
    assert row["password_hash"].startswith("$2b$")
