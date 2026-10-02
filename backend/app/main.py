"""ShopSense backend — FastAPI application (Phase 1 skeleton)."""

import hashlib
import io
import time
from pathlib import Path

from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from PIL import Image

from .db import DatabaseUnavailable
from .embeddings import MODEL_NAME, embed_image
from .auth import ensure_db as ensure_user_db, router as auth_router
from .me import router as me_router
from .cache import get_cached, set_cached
from .pricehistory import record_price_snapshots
from .schemas import (
    EmbedResponse,
    HealthResponse,
    ImageSearchResponse,
    LiveImageSearchResponse,
    LiveRankedItem,
    SearchResultItem,
    TextSearchRequest,
    TextSearchResponse,
)
from .search import search_by_image, search_by_text

APP_VERSION = "0.1.0"

app = FastAPI(
    title="ShopSense Backend",
    description="Visual search + price comparison API for Pakistani e-commerce.",
    version=APP_VERSION,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # tighten for production
    allow_methods=["*"],
    allow_headers=["*"],
)

# Seed product images served to the frontend
_IMAGES_DIR = Path(__file__).resolve().parent.parent / "data" / "seed_images"
if _IMAGES_DIR.exists():
    app.mount("/images", StaticFiles(directory=str(_IMAGES_DIR)), name="images")

# T4: real accounts + per-user persistence (SQLite; independent of the
# Postgres/pgvector catalog so it works with no DB service running).
ensure_user_db()
app.include_router(auth_router)
app.include_router(me_router)


@app.get("/health", response_model=HealthResponse)
def health() -> HealthResponse:
    return HealthResponse(status="ok", service="shopsense-backend", version=APP_VERSION)


@app.post("/embed", response_model=EmbedResponse)
async def embed(file: UploadFile = File(...)) -> EmbedResponse:
    """Accept an image and return its CLIP embedding vector."""
    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="File must be an image")
    raw = await file.read()
    try:
        image = Image.open(io.BytesIO(raw)).convert("RGB")
    except Exception:
        raise HTTPException(status_code=400, detail="Could not read image file")

    started = time.time()
    try:
        vector = embed_image(image)
    except Exception as exc:  # e.g. torch/transformers not installed
        raise HTTPException(status_code=500, detail=f"Embedding failed: {exc}")

    return EmbedResponse(
        dim=len(vector),
        model=MODEL_NAME,
        embed_time_ms=int((time.time() - started) * 1000),
        embedding=vector,
    )


@app.post("/search", response_model=ImageSearchResponse)
async def search_image(
    file: UploadFile = File(...),
    top_k: int = 5,
) -> ImageSearchResponse:
    """Visual search: upload a product photo, get similar catalog products."""
    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="File must be an image")
    raw = await file.read()
    try:
        image = Image.open(io.BytesIO(raw)).convert("RGB")
    except Exception:
        raise HTTPException(status_code=400, detail="Could not read image file")

    started = time.time()
    # R4: cache image search by content hash; record price snapshots.
    cache_key = hashlib.sha256(raw).hexdigest()[:32] + f":{top_k}"
    cached = get_cached("image", cache_key)
    if cached is not None:
        results = cached
    else:
        try:
            results = search_by_image(image, top_k=top_k)
        except DatabaseUnavailable as exc:
            raise HTTPException(status_code=503, detail=str(exc))
        except Exception as exc:  # e.g. torch/transformers not installed
            raise HTTPException(status_code=500, detail=f"Search failed: {exc}")
        set_cached("image", cache_key, results)
    record_price_snapshots(results)

    return ImageSearchResponse(
        results=[SearchResultItem(**r) for r in results],
        query_time_ms=int((time.time() - started) * 1000),
    )


VERCEL_BASE = "https://shopsense-teal.vercel.app"


def _rss_mb() -> float:
    import resource
    return resource.getrusage(resource.RUSAGE_SELF).ru_maxrss / 1024.0


@app.post("/search/image", response_model=LiveImageSearchResponse)
async def search_image_live(
    photo: UploadFile = File(...),
    top_k: int = 5,
) -> LiveImageSearchResponse:
    """R11: server-side photo re-rank for clients that cannot run CLIP.

    Takes a photo, classifies it (describe-image when available, else ONNX
    zero-shot), fetches candidates through the Vercel live-search handler,
    re-ranks with quantized ONNX CLIP, and returns ranked results.
    """
    import httpx
    import os

    # Sanitize proxy env (this VM's no_proxy has bracketed IPv6 entries that
    # break httpx URL parsing).
    for k in ("no_proxy", "NO_PROXY"):
        if "[" in os.environ.get(k, ""):
            os.environ[k] = "localhost,127.0.0.1"

    started = time.time()
    if not photo.content_type or not photo.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="File must be an image")
    raw = await photo.read()
    try:
        image = Image.open(io.BytesIO(raw)).convert("RGB")
    except Exception:
        raise HTTPException(status_code=400, detail="Could not read image file")

    from .clip_onnx import cosine, embed_image_onnx, zero_shot_classify

    # 1. Embed the photo with quantized ONNX CLIP.
    query_vec = embed_image_onnx(image)

    # 2. Describe step: try the Vercel describe-image, else zero-shot.
    describe_used = False
    queries: list[str] = []
    category, cat_score = zero_shot_classify(image)
    try:
        import base64
        async with httpx.AsyncClient(timeout=15) as client:
            r = await client.post(
                f"{VERCEL_BASE}/api/describe-image",
                json={"image": base64.b64encode(raw).decode(), "mimeType": "image/jpeg"},
            )
            if r.status_code == 200:
                d = r.json()
                queries = [str(x) for x in d.get("queries", []) if x][:2]
                if d.get("category"):
                    category = str(d["category"])
                describe_used = True
    except Exception:
        pass
    if not queries:
        queries = [category]

    # 3. Fetch candidates through the live-search handler.
    candidates: list[dict] = []
    try:
        async with httpx.AsyncClient(timeout=20) as client:
            r = await client.get(
                f"{VERCEL_BASE}/api/live-search",
                params={"q": queries[0]},
            )
            if r.status_code == 200:
                candidates = r.json().get("results", [])[:12]
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"live-search fetch failed: {exc}")

    # 4. Re-rank with ONNX CLIP (thumbnail → embedding → cosine).
    ranked: list[LiveRankedItem] = []
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            for c in candidates:
                img_url = c.get("image") or ""
                score = 0.0
                if img_url:
                    try:
                        ir = await client.get(img_url)
                        if ir.status_code == 200:
                            thumb = Image.open(io.BytesIO(ir.content)).convert("RGB")
                            score = cosine(query_vec, embed_image_onnx(thumb))
                    except Exception:
                        pass
                price = c.get("price")
                ranked.append(LiveRankedItem(
                    title=str(c.get("title", ""))[:160],
                    price=float(price) if isinstance(price, (int, float)) else None,
                    price_text=str(c.get("priceText") or ""),
                    url=str(c.get("url", "")),
                    image=img_url,
                    clip_score=round(score, 4),
                ))
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"re-rank failed: {exc}")
    ranked.sort(key=lambda x: x.clip_score, reverse=True)

    return LiveImageSearchResponse(
        query=queries[0],
        category=category,
        category_score=round(cat_score, 3),
        describe_used=describe_used,
        results=ranked[: max(1, min(top_k, 12))],
        latency_ms=int((time.time() - started) * 1000),
        memory_rss_mb=round(_rss_mb(), 1),
    )


@app.post("/search-text", response_model=TextSearchResponse)
def search_text(req: TextSearchRequest) -> TextSearchResponse:
    """Text search with Roman Urdu keyword mapping (no ML needed)."""
    # R4: cache text search by normalized query; record price snapshots.
    cache_key = f"{req.query.strip().lower()}:{req.top_k}"
    cached = get_cached("text", cache_key)
    if cached is not None:
        keywords = cached.get("_keywords", [])
        results = cached.get("_results", [])
    else:
        try:
            keywords, results = search_by_text(req.query, top_k=req.top_k)
        except DatabaseUnavailable as exc:
            raise HTTPException(status_code=503, detail=str(exc))
        set_cached("text", cache_key, {"_keywords": keywords, "_results": results})
    record_price_snapshots(results)
    return TextSearchResponse(
        mapped_keywords=keywords,
        results=[SearchResultItem(**r) for r in results],
    )
