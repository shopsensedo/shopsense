"""Quantized ONNX CLIP vision encoder (R11).

Uses the Xenova/clip-vit-base-patch32 quantized ONNX vision model — the same
weights the web app runs in the browser — so the server-side re-rank matches
the client. ONNX Runtime keeps memory small vs torch.
"""
import io
from pathlib import Path

import numpy as np
from PIL import Image

MODEL_ID = "Xenova/clip-vit-base-patch32"
CACHE_DIR = Path(__file__).resolve().parent.parent / "data" / "onnx_clip"

_session = None


def _get_session():
    global _session
    if _session is None:
        import onnxruntime as ort
        from huggingface_hub import hf_hub_download

        CACHE_DIR.mkdir(parents=True, exist_ok=True)
        model_path = hf_hub_download(
            MODEL_ID, "onnx/vision_model_quantized.onnx", local_dir=str(CACHE_DIR)
        )
        opts = ort.SessionOptions()
        opts.intra_op_num_threads = 2
        _session = ort.InferenceSession(model_path, sess_options=opts)
    return _session


_text_session = None


def _get_text_session():
    global _text_session
    if _text_session is None:
        import onnxruntime as ort
        from huggingface_hub import hf_hub_download

        CACHE_DIR.mkdir(parents=True, exist_ok=True)
        model_path = hf_hub_download(
            MODEL_ID, "onnx/text_model_quantized.onnx", local_dir=str(CACHE_DIR)
        )
        opts = ort.SessionOptions()
        opts.intra_op_num_threads = 2
        _text_session = ort.InferenceSession(model_path, sess_options=opts)
    return _text_session


# Minimal zero-shot vocabulary for the describe fallback (R11).
# Full 80-category list lives in the web app; the server uses a compact set.
ZERO_SHOT_CATEGORIES = [
    "sneakers", "shoes", "watch", "handbag", "backpack", "sunglasses",
    "headphones", "laptop", "mobile phone", "kurta", "dress", "jacket",
    "perfume", "wallet",
]


def _tokenize_simple(texts: list[str]) -> dict:
    # Minimal CLIP BPE-free fallback: use the HF tokenizer if available.
    from transformers import CLIPTokenizer
    tok = CLIPTokenizer.from_pretrained("openai/clip-vit-base-patch32")
    return tok(texts, padding=True, truncation=True, return_tensors="np")


def zero_shot_classify(image: Image.Image) -> tuple[str, float]:
    """Classify into ZERO_SHOT_CATEGORIES. Returns (category, score)."""
    img_vec = embed_image_onnx(image)
    sess = _get_text_session()
    enc = _tokenize_simple([f"a photo of {c}" for c in ZERO_SHOT_CATEGORIES])
    out = sess.run(None, {
        "input_ids": enc["input_ids"].astype(np.int64),
    })[0]
    # L2-normalize text embeddings, cosine with image.
    norms = np.linalg.norm(out, axis=1, keepdims=True)
    tout = out / np.maximum(norms, 1e-9)
    sims = (tout @ img_vec).astype(float)
    i = int(np.argmax(sims))
    # softmax for a calibrated-ish score
    e = np.exp(sims - sims.max())
    return ZERO_SHOT_CATEGORIES[i], float(e[i] / e.sum())


def _preprocess(image: Image.Image) -> np.ndarray:
    # CLIP preprocessing: resize 224, center crop, normalize.
    img = image.convert("RGB").resize((224, 224), Image.BICUBIC)
    arr = np.asarray(img).astype(np.float32) / 255.0
    mean = np.array([0.48145466, 0.4578275, 0.40821073], dtype=np.float32)
    std = np.array([0.26862954, 0.26130258, 0.27577711], dtype=np.float32)
    arr = (arr - mean) / std
    return np.transpose(arr, (2, 0, 1))[None].astype(np.float32)


def embed_image_onnx(image: Image.Image) -> np.ndarray:
    """Return the L2-normalized 512-dim CLIP image embedding."""
    sess = _get_session()
    out = sess.run(None, {"pixel_values": _preprocess(image)})[0][0]
    norm = np.linalg.norm(out)
    return out / norm if norm > 0 else out


def cosine(a: np.ndarray, b: np.ndarray) -> float:
    return float(np.dot(a, b))
