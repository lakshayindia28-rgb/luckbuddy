from fastapi import Depends, HTTPException, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import jwt, JWTError
from app.core.config import settings

security = HTTPBearer(auto_error=False)

def get_current_user(allowed_roles: list):
    async def _auth(
        request: Request,
        credentials: HTTPAuthorizationCredentials = Depends(security),
    ):
        if credentials is None:
            raise HTTPException(status_code=401, detail="Not authenticated")

        token = credentials.credentials

        try:
            payload = jwt.decode(
                token,
                settings.JWT_SECRET,
                algorithms=[settings.JWT_ALGORITHM],
            )
        except JWTError:
            raise HTTPException(status_code=401, detail="Invalid token")

        user = {
            "id": payload.get("user_id"),
            "username": payload.get("username"),
            "role": payload.get("role"),
        }

        if user["role"] not in allowed_roles:
            raise HTTPException(status_code=403, detail="Access denied")

        request.state.user = user
        return user

    return _auth
