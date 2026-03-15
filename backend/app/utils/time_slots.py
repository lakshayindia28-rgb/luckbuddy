from __future__ import annotations

from datetime import datetime, timedelta, time as dt_time
from zoneinfo import ZoneInfo
import json
import urllib.request


IST = ZoneInfo("Asia/Kolkata")
DEFAULT_TIMESLOT = "09:00-09:15"

# Active schedule in IST: (start_hour, start_min, end_hour, end_min, interval_minutes)
SLOT_SCHEDULE = [
    (8, 45, 11, 0, 15),   # 8:45 AM – 11:00 AM : 15-min slots
    (11, 0, 20, 0, 20),   # 11:00 AM – 8:00 PM : 20-min slots
]


def _all_slots_for_day(day) -> list[tuple[datetime, datetime]]:
    """Return [(slot_start, slot_end), ...] for one calendar day in IST."""
    slots: list[tuple[datetime, datetime]] = []
    for sh, sm, eh, em, interval in SLOT_SCHEDULE:
        start = datetime.combine(day, dt_time(sh, sm), tzinfo=IST)
        end = datetime.combine(day, dt_time(eh, em), tzinfo=IST)
        current = start
        while current + timedelta(minutes=interval) <= end:
            slots.append((current, current + timedelta(minutes=interval)))
            current += timedelta(minutes=interval)
    return slots


def timeslots_for_date(slot_date_iso: str, **_kw) -> list[str]:
    """Return all timeslots for a given date in IST."""
    try:
        day = datetime.strptime(slot_date_iso, "%Y-%m-%d").date()
    except Exception as e:
        raise ValueError("Invalid slot_date format (expected YYYY-MM-DD)") from e

    return [f"{s:%H:%M}-{e:%H:%M}" for s, e in _all_slots_for_day(day)]


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


def current_timeslot(*, use_internet: bool = True) -> str:
    """Current timeslot in IST based on schedule.

    Returns empty string if current time is outside active hours (8:45 AM – 8:00 PM).
    """
    try:
        now = ist_now(use_internet=use_internet)
        day = now.date()
        for slot_start, slot_end in _all_slots_for_day(day):
            if slot_start <= now < slot_end:
                return f"{slot_start:%H:%M}-{slot_end:%H:%M}"
        return ""
    except Exception:
        return DEFAULT_TIMESLOT


def current_slot_date(*, use_internet: bool = True) -> str:
    """Current YYYY-MM-DD in IST."""

    try:
        return ist_now(use_internet=use_internet).date().isoformat()
    except Exception:
        return datetime.now(IST).date().isoformat()
