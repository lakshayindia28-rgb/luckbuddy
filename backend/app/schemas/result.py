from pydantic import BaseModel
from typing import List, Optional

class ManualResultRequest(BaseModel):
    serial: str           # XA
    timeslot: Optional[str] = None
    slot_date: Optional[str] = None        # YYYY-MM-DD
    winning_number: int   # 0–99


class ManualResultItem(BaseModel):
    serial: str
    winning_number: int


class ManualBulkResultRequest(BaseModel):
    timeslot: Optional[str] = None
    slot_date: Optional[str] = None
    results: List[ManualResultItem]


class ManualBulkResultResponse(BaseModel):
    timeslot: str
    published: List[str]
    failed: Optional[dict] = None
