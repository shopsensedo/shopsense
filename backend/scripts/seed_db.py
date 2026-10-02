"""Seed the products table from data/seed_products.json + data/seed_embeddings.json.

Usage: .venv/bin/python scripts/seed_db.py
Idempotent: upserts on sku.
"""

import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))

import psycopg

from app.db import DATABASE_URL


def main() -> None:
    products = json.loads((ROOT / "data" / "seed_products.json").read_text(encoding="utf-8"))
    embeddings = json.loads((ROOT / "data" / "seed_embeddings.json").read_text(encoding="utf-8"))

    with psycopg.connect(DATABASE_URL) as conn:
        with conn.cursor() as cur:
            for p in products:
                vec = embeddings.get(p["id"])
                vec_str = "[" + ",".join(f"{x:.6f}" for x in vec) + "]" if vec else None
                cur.execute(
                    """
                    INSERT INTO products
                        (sku, title, title_urdu, price_pkr, platform,
                         image_url, image_file, purchase_link, category, embedding)
                    VALUES
                        (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s::vector)
                    ON CONFLICT (sku) DO UPDATE SET
                        title = EXCLUDED.title,
                        title_urdu = EXCLUDED.title_urdu,
                        price_pkr = EXCLUDED.price_pkr,
                        platform = EXCLUDED.platform,
                        image_url = EXCLUDED.image_url,
                        image_file = EXCLUDED.image_file,
                        purchase_link = EXCLUDED.purchase_link,
                        category = EXCLUDED.category,
                        embedding = EXCLUDED.embedding
                    """,
                    (
                        p["id"],
                        p["title"],
                        p.get("title_urdu"),
                        p["price_pkr"],
                        p["platform"],
                        p.get("image_url") or p["image_file"],
                        p["image_file"],
                        p["purchase_link"],
                        p.get("category"),
                        vec_str,
                    ),
                )
        conn.commit()
        with conn.cursor() as cur:
            cur.execute("SELECT count(*), count(embedding) FROM products")
            total, with_emb = cur.fetchone()
    print(f"products: {total} total, {with_emb} with embeddings")


if __name__ == "__main__":
    main()
