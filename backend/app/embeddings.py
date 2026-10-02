"""CLIP image-embedding service.

The model is loaded lazily on first use so that importing this module (and
running the API for non-embedding routes) stays light. The heavy
torch/transformers dependencies only get imported when an embedding is
actually requested — which is exactly what happens inside the Colab test
notebook and on the API server.
"""

from PIL import Image

_model = None
_processor = None
MODEL_NAME = "openai/clip-vit-base-patch32"


def _load():
    global _model, _processor
    if _model is None:
        from transformers import CLIPProcessor, CLIPModel

        _processor = CLIPProcessor.from_pretrained(MODEL_NAME)
        _model = CLIPModel.from_pretrained(MODEL_NAME)
        _model.eval()
    return _model, _processor


def embed_image(image: Image.Image) -> list[float]:
    """Return the L2-normalized CLIP image embedding as a list of floats."""
    import torch

    model, processor = _load()
    inputs = processor(images=image, return_tensors="pt")
    with torch.no_grad():
        outputs = model.get_image_features(**inputs)
    # Newer transformers return BaseModelOutputWithPooling (not a raw tensor)
    features = outputs.pooler_output if hasattr(outputs, "pooler_output") else outputs
    features = features / features.norm(p=2, dim=-1, keepdim=True)
    return features[0].detach().cpu().numpy().tolist()


def cosine_similarity(a: list[float], b: list[float]) -> float:
    """Cosine similarity between two (already normalized) embedding vectors."""
    import numpy as np

    return float(np.dot(np.array(a), np.array(b)))
