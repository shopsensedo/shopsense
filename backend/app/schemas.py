"""Pydantic schemas for the ShopSense backend API."""

from pydantic import BaseModel, Field


class HealthResponse(BaseModel):
    status: str
    service: str
    version: str


class EmbedResponse(BaseModel):
    dim: int = Field(description="Embedding vector dimension")
    model: str = Field(description="Model used for the embedding")
    embed_time_ms: int = Field(description="Time taken to embed, in milliseconds")
    embedding: list[float] = Field(description="L2-normalized image embedding vector")


class SearchResultItem(BaseModel):
    id: str
    title: str
    price_pkr: int
    platform: str
    purchase_link: str
    image_file: str
    category: str
    score: float = Field(description="Similarity score: cosine similarity (image) or keyword hit ratio (text)")


class ImageSearchResponse(BaseModel):
    results: list[SearchResultItem]
    query_time_ms: int


class TextSearchRequest(BaseModel):
    query: str = Field(min_length=1, description="Roman Urdu or English query, e.g. 'kala joota'")
    top_k: int = Field(default=5, ge=1, le=20)


class TextSearchResponse(BaseModel):
    mapped_keywords: list[str] = Field(description="English keywords the query was mapped to")
    results: list[SearchResultItem]


class LiveRankedItem(BaseModel):
    """One live listing re-ranked by server-side CLIP (R11)."""
    title: str
    price: float | None = None
    price_text: str = ""
    url: str
    image: str
    clip_score: float


class LiveImageSearchResponse(BaseModel):
    query: str
    category: str
    category_score: float
    describe_used: bool
    results: list[LiveRankedItem]
    latency_ms: int
    memory_rss_mb: float
