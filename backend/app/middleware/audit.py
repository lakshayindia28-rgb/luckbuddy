from fastapi import Request
import datetime

async def audit_log(request: Request):
    user = getattr(request.state, "user", None)

    log_line = {
        "time": datetime.datetime.utcnow().isoformat(),
        "method": request.method,
        "path": request.url.path,
        "user": user
    }

    # For now: console log
    print("AUDIT:", log_line)
