"""R4 — sliding-window rate limiter for auth endpoints (in-memory).

Prototype scope: per-process memory. A multi-worker production deploy would
use Redis; the FYP proposal's hosting notes call this out. Limits are
conservative on purpose: login/register are the credential-attack surface.
"""

import time
from collections import deque

# endpoint -> (max_attempts, window_seconds)
LIMITS = {
    "login": (10, 60),      # 10 logins / minute / IP
    "register": (5, 3600),  # 5 registrations / hour / IP
}

_hits: dict[str, deque[float]] = {}


def _bucket(endpoint: str, ip: str) -> deque[float]:
    key = f"{endpoint}:{ip}"
    dq = _hits.get(key)
    if dq is None:
        dq = _hits[key] = deque()
    return dq


def is_allowed(endpoint: str, ip: str, now_s: float | None = None) -> bool:
    """True if the attempt is within the limit; records the attempt."""
    max_attempts, window = LIMITS[endpoint]
    t = now_s if now_s is not None else time.time()
    dq = _bucket(endpoint, ip)
    while dq and dq[0] <= t - window:
        dq.popleft()
    if len(dq) >= max_attempts:
        return False
    dq.append(t)
    return True


def reset(endpoint: str | None = None) -> None:
    """Clear buckets (used by tests)."""
    if endpoint is None:
        _hits.clear()
    else:
        for key in [k for k in _hits if k.startswith(endpoint + ":")]:
            del _hits[key]
