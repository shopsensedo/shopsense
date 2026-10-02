# ShopSense backend — Hugging Face Spaces (Docker SDK) / any container host.
FROM python:3.12-slim

WORKDIR /app

# torch CPU only (keeps the image small-ish)
COPY requirements.txt .
RUN pip install --no-cache-dir --index-url https://download.pytorch.org/whl/cpu \
        torch --no-deps \
 && pip install --no-cache-dir -r requirements.txt

COPY app/ app/
COPY data/ data/

# Warm the CLIP model cache so the first /search call is fast
RUN python -c "from transformers import CLIPProcessor, CLIPModel; \
    CLIPProcessor.from_pretrained('openai/clip-vit-base-patch32'); \
    CLIPModel.from_pretrained('openai/clip-vit-base-patch32')" \
 && chmod -R a+r /app /root/.cache

EXPOSE 7860
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "7860"]
