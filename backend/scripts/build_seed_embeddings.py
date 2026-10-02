"""Build data/seed_embeddings.json: CLIP embeddings for all seed catalog images.

Usage: .venv/bin/python scripts/build_seed_embeddings.py
(Local fallback when Colab is unavailable. Same logic as colab/02 notebook.)
"""

import json
import time
from pathlib import Path

import numpy as np
import torch
from PIL import Image
from transformers import CLIPModel, CLIPProcessor

ROOT = Path(__file__).resolve().parent.parent
MODEL_NAME = "openai/clip-vit-base-patch32"


def main() -> None:
    print("Loading CLIP...")
    t0 = time.time()
    processor = CLIPProcessor.from_pretrained(MODEL_NAME)
    model = CLIPModel.from_pretrained(MODEL_NAME)
    model.eval()
    print(f"CLIP loaded in {time.time() - t0:.1f}s")

    products = json.loads((ROOT / "data" / "seed_products.json").read_text(encoding="utf-8"))

    embeddings: dict[str, list[float]] = {}
    for p in products:
        img_path = ROOT / "data" / "seed_images" / p["image_file"]
        assert img_path.exists(), f"missing image: {img_path}"
        img = Image.open(img_path).convert("RGB")
        inputs = processor(images=img, return_tensors="pt")
        with torch.no_grad():
            outputs = model.get_image_features(**inputs)
        feats = outputs.pooler_output if hasattr(outputs, "pooler_output") else outputs
        feats = feats / feats.norm(p=2, dim=-1, keepdim=True)
        vec = feats[0].detach().cpu().numpy()
        embeddings[p["id"]] = vec.tolist()
        print(f"{p['id']}: dim={vec.shape[0]} norm={float(np.linalg.norm(vec)):.4f}")

    out = ROOT / "data" / "seed_embeddings.json"
    out.write_text(json.dumps(embeddings), encoding="utf-8")
    print(f"\nWrote {out} ({len(embeddings)} embeddings, {out.stat().st_size} bytes)")


if __name__ == "__main__":
    main()
