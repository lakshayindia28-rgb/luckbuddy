from pydantic import BaseModel
from typing import List, Optional


class PlayGameBet(BaseModel):
    serial: str
    number: int
    points: int  # quantity


class PlayGameRequest(BaseModel):
    bets: List[PlayGameBet]
    forced_vendor: Optional[str] = None
