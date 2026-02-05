from __future__ import annotations

from datetime import datetime, timedelta
from zoneinfo import ZoneInfo
import json
import urllib.request


IST = ZoneInfo("Asia/Kolkata")
DEFAULT_TIMESLOT = "09:00-09:15"


def ist_now(*, use_internet: bool = True, timeout_seconds: float = 2.0) -> datetime:
    """Return current time in Asia/Kolkata.

    Tries an internet time source first (to avoid server clock drift / timezone
    misconfig). Falls back to system time in IST.
    """

    if use_internet:
        try:
            with urllib.request.urlopen(
                "https://worldtimeapi.org/api/timezone/Asia/Kolkata",
                timeout=timeout_seconds,
            ) as resp:
                payload = json.load(resp)
            dt = datetime.fromisoformat(payload["datetime"])  # includes offset
            return dt.astimezone(IST)
        except Exception:
            pass

    return datetime.now(IST)


def _timeslot_from_dt(dt: datetime, *, minutes: int = 15) -> str:
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=IST)
    else:
        dt = dt.astimezone(IST)

    start = dt.replace(minute=(dt.minute // minutes) * minutes, second=0, microsecond=0)
    end = start + timedelta(minutes=minutes)
    return f"{start:%H:%M}-{end:%H:%M}"


def current_timeslot(*, use_internet: bool = True) -> str:
    """Current 15-minute timeslot in IST, formatted like 09:00-09:15."""

    try:
        return _timeslot_from_dt(ist_now(use_internet=use_internet))
    except Exception:
        return DEFAULT_TIMESLOT


def current_slot_date(*, use_internet: bool = True) -> str:
    """Current YYYY-MM-DD in IST."""

    try:
        return ist_now(use_internet=use_internet).date().isoformat()
    except Exception:
        return datetime.now(IST).date().isoformat()
