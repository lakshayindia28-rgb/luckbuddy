import time
from fastapi import Request, HTTPException

REQUEST_LIMIT = 60      # requests
TIME_WINDOW = 60        # seconds

_clients = {}

async def rate_limit(request: Request):
    ip = request.client.host
    now = time.time()

    if ip not in _clients:
        _clients[ip] = []

    # keep only recent requests
    _clients[ip] = [t for t in _clients[ip] if now - t < TIME_WINDOW]

    if len(_clients[ip]) >= REQUEST_LIMIT:
        raise HTTPException(
            status_code=429,
            detail="Too many requests"
        )

    _clients[ip].append(now)
