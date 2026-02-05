from pydantic import BaseModel
from typing import List, Optional

class ManualResultRequest(BaseModel):
    serial: str           # XA
    timeslot: str
    slot_date: str        # YYYY-MM-DD
    winning_number: int   # 0–99


class ManualResultItem(BaseModel):
    serial: str
    winning_number: int


class ManualBulkResultRequest(BaseModel):
    timeslot: str
    slot_date: str
    results: List[ManualResultItem]


class ManualBulkResultResponse(BaseModel):
    timeslot: str
    published: List[str]
    failed: Optional[dict] = None
