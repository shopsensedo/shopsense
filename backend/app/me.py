"""Per-user persistence: saved items, search history, price alerts (T4).

All routes require a Bearer JWT (see app/auth.py). Live marketplace listings
are upserted by URL into the listings table, so a saved item or alert always
references the real listing the user saw — never an invented product.
"""

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field

from .auth import get_current_user
from .userstore import Store

router = APIRouter(prefix="/me")
_store = Store()


def _valid_url(url: str) -> bool:
    u = url.strip()
    return u.startswith("http://") or u.startswith("https://")


class ListingIn(BaseModel):
    title: str = Field(min_length=1, max_length=300)
    url: str = Field(min_length=8, max_length=500)
    price_pkr: int = Field(default=0, ge=0)
    image_url: str = Field(default="", max_length=500)
    platform: str = Field(default="", max_length=40)


class HistoryIn(BaseModel):
    query_text: str = Field(min_length=1, max_length=200)


class AlertIn(ListingIn):
    target_pkr: int = Field(gt=0)
    channel: str = Field(default="whatsapp", max_length=20)
    contact: str = Field(default="", max_length=120)


def _listing_id(body: ListingIn) -> int:
    if not _valid_url(body.url):
        raise HTTPException(status_code=422, detail="Invalid listing URL")
    return _store.upsert_listing(body.url.strip(), body.title.strip(),
                                 body.price_pkr, body.image_url.strip(),
                                 body.platform.strip())


@router.post("/saved-items", status_code=201)
def save_item(body: ListingIn, user: dict = Depends(get_current_user)) -> dict:
    lid = _listing_id(body)
    _store.save_item(user["id"], lid)
    return {"listing_id": lid, "saved": True}


@router.get("/saved-items")
def get_saved(user: dict = Depends(get_current_user)) -> dict:
    return {"items": _store.list_saved(user["id"])}


@router.delete("/saved-items/{listing_id}")
def delete_saved(listing_id: int, user: dict = Depends(get_current_user)) -> dict:
    if not _store.delete_saved(user["id"], listing_id):
        raise HTTPException(status_code=404, detail="Saved item not found")
    return {"deleted": True}


@router.post("/history", status_code=201)
def add_history(body: HistoryIn, user: dict = Depends(get_current_user)) -> dict:
    hid = _store.add_history(user["id"], body.query_text.strip())
    return {"id": hid}


@router.get("/history")
def get_history(limit: int = 30, user: dict = Depends(get_current_user)) -> dict:
    return {"items": _store.list_history(user["id"], limit)}


@router.post("/alerts", status_code=201)
def add_alert(body: AlertIn, user: dict = Depends(get_current_user)) -> dict:
    channel = body.channel.strip().lower()
    if channel not in ("whatsapp", "email"):
        raise HTTPException(status_code=422, detail="channel must be whatsapp or email")
    if not body.contact.strip():
        raise HTTPException(status_code=422, detail="contact is required")
    lid = _listing_id(body)
    aid = _store.add_alert(user["id"], lid, body.target_pkr, channel,
                           body.contact.strip())
    # NOTE: actual WhatsApp/email delivery is out of scope (no paid
    # services); the alert is stored and listed, ready for a sender worker.
    return {"id": aid, "listing_id": lid}


@router.get("/alerts")
def get_alerts(user: dict = Depends(get_current_user)) -> dict:
    return {"items": _store.list_alerts(user["id"])}


@router.delete("/alerts/{alert_id}")
def delete_alert(alert_id: int, user: dict = Depends(get_current_user)) -> dict:
    if not _store.delete_alert(user["id"], alert_id):
        raise HTTPException(status_code=404, detail="Alert not found")
    return {"deleted": True}
