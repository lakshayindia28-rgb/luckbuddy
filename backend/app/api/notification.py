from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session

from app.database.session import get_db
from app.middleware.auth import get_current_user
from app.models.notification import Notification
from app.schemas.notification import NotificationOut, PublishNotificationRequest

router = APIRouter(prefix="/notification", tags=["Notification"])


@router.post(
    "/publish",
    dependencies=[Depends(get_current_user(["admin"]))]
)
def publish_notification(
    data: PublishNotificationRequest,
    db: Session = Depends(get_db)
):
    message = (data.message or "").strip()
    if not message:
        raise HTTPException(400, "Message is required")

    allowed = {"super", "vendor"}
    audiences = [a for a in (data.audiences or []) if a in allowed]
    if not audiences:
        raise HTTPException(400, "At least one audience is required")

    # Deactivate old notifications for the same audience(s)
    db.query(Notification).filter(
        Notification.audience.in_(audiences),
        Notification.active == True
    ).update({"active": False}, synchronize_session=False)

    rows = []
    for audience in audiences:
        n = Notification(audience=audience, message=message, active=True)
        db.add(n)
        rows.append(n)

    db.commit()

    return {"message": "Notification published", "audiences": audiences}


@router.get(
    "/latest",
    response_model=NotificationOut | None,
    dependencies=[Depends(get_current_user(["admin", "super", "vendor"]))]
)
def latest_notification(
    request: Request,
    db: Session = Depends(get_db)
):
    user = request.state.user
    role = user.get("role")

    # Admin doesn't need audience notifications; return None.
    if role not in ["super", "vendor"]:
        return None

    n = (
        db.query(Notification)
        .filter(Notification.audience == role, Notification.active == True)
        .order_by(Notification.created_at.desc())
        .first()
    )

    return n
