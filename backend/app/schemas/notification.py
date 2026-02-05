from pydantic import BaseModel
from typing import List


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
