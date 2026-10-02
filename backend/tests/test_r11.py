"""R11 tests: /search/image endpoint (ONNX CLIP re-rank)."""
import io

import pytest
from fastapi.testclient import TestClient
from PIL import Image

from app.main import app


def _red_jpg() -> bytes:
    buf = io.BytesIO()
    Image.new("RGB", (64, 64), (200, 30, 30)).save(buf, "JPEG")
    return buf.getvalue()


@pytest.fixture(scope="module")
def client():
    return TestClient(app)


def test_search_image_rejects_non_image(client):
    r = client.post(
        "/search/image",
        files={"photo": ("x.txt", b"not an image", "text/plain")},
    )
    assert r.status_code == 400


def test_search_image_live_e2e(client):
    """End-to-end: photo → classify → live-search → ONNX re-rank."""
    r = client.post(
        "/search/image",
        files={"photo": ("red.jpg", _red_jpg(), "image/jpeg")},
        params={"top_k": 3},
    )
    assert r.status_code == 200, r.text[:300]
    d = r.json()
    assert d["query"]
    assert d["category"]
    assert isinstance(d["results"], list)
    assert d["latency_ms"] > 0
    assert d["memory_rss_mb"] > 0
    for it in d["results"]:
        assert it["url"] and it["image"]
        assert 0.0 <= it["clip_score"] <= 1.0
    # ranked descending
    scores = [it["clip_score"] for it in d["results"]]
    assert scores == sorted(scores, reverse=True)
