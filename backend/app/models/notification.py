from datetime import datetime

from sqlalchemy import Boolean, Column, DateTime, Integer, String

from app.database.base import Base


class Notification(Base):
    __tablename__ = "notifications"

    id = Column(Integer, primary_key=True)
    audience = Column(String, index=True)  # "super" | "vendor"
    message = Column(String)
    active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
