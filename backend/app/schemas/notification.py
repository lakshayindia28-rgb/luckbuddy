from pydantic import BaseModel
from typing import List
from datetime import datetime


class PublishNotificationRequest(BaseModel):
    message: str
    audiences: List[str]


class NotificationOut(BaseModel):
    id: int
    audience: str
    message: str
    active: bool

    class Config:
        from_attributes = True


class NotificationAdminOut(BaseModel):
    id: int
    audience: str
    message: str
    active: bool
    created_at: datetime

    class Config:
        from_attributes = True
