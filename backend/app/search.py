"""Product search: PostgreSQL + pgvector when available, JSON seed files as fallback.

The fallback lets the API run on hosts without Postgres (e.g. free HF Spaces
demos) using the same seed data — results are identical, just not DB-backed.
"""

import json
import logging
from pathlib import Path

import numpy as np
from PIL import Image

from .db import DatabaseUnavailable, get_conn
from .embeddings import embed_image
from .roman_urdu import normalize_query

log = logging.getLogger("shopsense.search")

COLS = "sku, title, title_urdu, price_pkr, platform, purchase_link, image_file, category"
DATA_DIR = Path(__file__).resolve().parent.parent / "data"


def _row_to_product(row: tuple) -> dict:
    sku, title, title_urdu, price_pkr, platform, purchase_link, image_file, category = row[:8]
    return {
        "id": sku,
        "title": title,
        "title_urdu": title_urdu,
        "price_pkr": price_pkr,
        "platform": platform,
        "purchase_link": purchase_link,
        "image_file": image_file or "",
        "category": category or "",
    }


def _load_seed() -> tuple[list[dict], dict[str, list[float]]]:
    products = json.loads((DATA_DIR / "seed_products.json").read_text(encoding="utf-8"))
    embeddings = json.loads((DATA_DIR / "seed_embeddings.json").read_text(encoding="utf-8"))
    return products, embeddings


def _seed_to_product(p: dict) -> dict:
    return {
        "id": p["id"],
        "title": p["title"],
        "title_urdu": p.get("title_urdu"),
        "price_pkr": p["price_pkr"],
        "platform": p["platform"],
        "purchase_link": p["purchase_link"],
        "image_file": p.get("image_file") or "",
        "category": p.get("category") or "",
    }


def _search_by_image_db(query_vec: np.ndarray, top_k: int) -> list[dict] | None:
    """pgvector path; returns None when the database is unreachable."""
    vec_str = "[" + ",".join(f"{x:.6f}" for x in query_vec) + "]"
    try:
        conn = get_conn()
    except DatabaseUnavailable:
        return None
    with conn:
        with conn.cursor() as cur:
            cur.execute(
                f"""
                SELECT {COLS}, 1 - (embedding <=> %s::vector) AS score
                FROM products
                WHERE embedding IS NOT NULL
                ORDER BY embedding <=> %s::vector
                LIMIT %s
                """,
                (vec_str, vec_str, top_k),
            )
            rows = cur.fetchall()
    results = []
    for row in rows:
        product = _row_to_product(row)
        product["score"] = round(float(row[8]), 4)
        results.append(product)
    return results


def _search_by_image_json(query_vec: np.ndarray, top_k: int) -> list[dict]:
    products, embeddings = _load_seed()
    scored = []
    for p in products:
        vec = embeddings.get(p["id"])
        if not vec:
            continue
        score = float(np.dot(query_vec, np.array(vec, dtype=np.float32)))
        product = _seed_to_product(p)
        product["score"] = round(score, 4)
        scored.append(product)
    scored.sort(key=lambda r: r["score"], reverse=True)
    return scored[:top_k]


def search_by_image(image: Image.Image, top_k: int = 5) -> list[dict]:
    """Rank products by CLIP cosine similarity (pgvector, JSON fallback)."""
    query_vec = embed_image(image)
    results = _search_by_image_db(query_vec, top_k)
    if results is None:
        log.warning("database unreachable — falling back to JSON seed catalog")
        results = _search_by_image_json(query_vec, top_k)
    return results


def _search_by_text_db(keywords: list[str], top_k: int) -> list[dict] | None:
    try:
        conn = get_conn()
    except DatabaseUnavailable:
        return None
    conditions = []
    params: list = []
    for kw in keywords:
        like = f"%{kw}%"
        conditions.append("(title ILIKE %s OR title_urdu ILIKE %s OR category ILIKE %s)")
        params.extend([like, like, like])
    with conn:
        with conn.cursor() as cur:
            cur.execute(
                f"SELECT {COLS} FROM products WHERE {' OR '.join(conditions)}",
                params,
            )
            rows = cur.fetchall()
    return [_row_to_product(r) for r in rows]


def _search_by_text_json(keywords: list[str]) -> list[dict]:
    products, _ = _load_seed()
    return [_seed_to_product(p) for p in products
            if any(kw in f"{p['title']} {p.get('title_urdu') or ''} {p.get('category') or ''}".lower()
                   for kw in keywords)]


def search_by_text(query: str, top_k: int = 5) -> tuple[list[str], list[dict]]:
    """Keyword search over the catalog using Roman Urdu → English mapping."""
    keywords = normalize_query(query)
    if not keywords:
        return keywords, []

    products = _search_by_text_db(keywords, top_k)
    if products is None:
        log.warning("database unreachable — falling back to JSON seed catalog")
        products = _search_by_text_json(keywords)

    ranked = []
    for product in products:
        haystack = f"{product['title']} {product.get('title_urdu') or ''} {product['category']}".lower()
        hits = sum(1 for kw in keywords if kw in haystack)
        product["score"] = round(hits / len(keywords), 4)
        ranked.append(product)
    ranked.sort(key=lambda r: r["score"], reverse=True)
    return keywords, ranked[:top_k]
