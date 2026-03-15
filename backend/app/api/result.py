from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func
from sqlalchemy.orm import Session
from datetime import datetime, date

from app.database.session import get_db
from app.middleware.auth import get_current_user
from app.schemas.result import ManualResultRequest, ManualBulkResultRequest
from app.models.ticket import Ticket
from app.models.result import Result
from app.services.pricing import compute_totals_for_tickets
from app.utils.time_slots import (
    current_timeslot as ist_current_timeslot,
    current_slot_date as ist_current_slot_date,
    timeslots_for_date as ist_timeslots_for_date,
)
from app.utils.validators import validate_number, validate_serial

router = APIRouter(prefix="/result", tags=["Result"])


SERIALS: list[str] = ["XA", "XB", "XC", "XD", "XE", "XF", "XG", "XH", "XI", "XJ"]


# ======================================================
# CURRENT TIMESLOT (single source of truth)
# ======================================================
@router.get("/current-timeslot")
def current_timeslot():
    return {
        "timeslot": ist_current_timeslot(),
        "slot_date": ist_current_slot_date(),
        "timezone": "Asia/Kolkata",
    }


# ======================================================
# MANUAL RESULT (ADMIN / SUPER)
# ======================================================
@router.post(
    "/manual",
    dependencies=[Depends(get_current_user(["admin", "super"]))]
)
def manual_result(
    data: ManualResultRequest,
    db: Session = Depends(get_db)
):
    try:
        validate_serial(data.serial)
        validate_number(int(data.winning_number))
    except ValueError as e:
        raise HTTPException(400, str(e))

    timeslot = (getattr(data, "timeslot", None) or "").strip() or ist_current_timeslot()
    slot_date_raw = (getattr(data, "slot_date", None) or "").strip() or ist_current_slot_date()

    # Validate slot_date format
    try:
        slot_date = datetime.strptime(slot_date_raw, "%Y-%m-%d").date().isoformat()
    except Exception:
        raise HTTPException(400, "Invalid slot_date format (expected YYYY-MM-DD)")

    tickets = db.query(Ticket).filter(
        Ticket.serial == data.serial,
        Ticket.timeslot == timeslot,
        Ticket.slot_date == slot_date,
        Ticket.locked == True
    ).all()

    if tickets:
        total_points, total_amount = compute_totals_for_tickets(db, tickets)
    else:
        total_points, total_amount = 0, 0

    admin_cut = int(total_amount * 0.4)
    payout = total_amount - admin_cut

    existing = db.query(Result).filter(
        Result.serial == data.serial,
        Result.timeslot == timeslot,
        Result.slot_date == slot_date,
        Result.published == True
    ).first()

    if existing:
        existing.winning_number = int(data.winning_number)
        existing.total_points = total_points
        existing.total_amount = total_amount
        existing.payout_amount = payout
        existing.admin_amount = admin_cut
        existing.is_manual = True
        existing.published = True
        existing.created_at = datetime.utcnow()
    else:
        result = Result(
            serial=data.serial,
            timeslot=timeslot,
            slot_date=slot_date,
            winning_number=int(data.winning_number),
            total_points=total_points,
            total_amount=total_amount,
            payout_amount=payout,
            admin_amount=admin_cut,
            is_manual=True,
            published=True,
            created_at=datetime.utcnow()
        )
        db.add(result)

    db.commit()

    return {
        "message": "Result published successfully",
        "serial": data.serial,
        "timeslot": timeslot,
        "slot_date": slot_date,
    }


# ======================================================
# MANUAL RESULT BULK (ADMIN / SUPER)
# ======================================================
@router.post(
    "/manual-bulk",
    dependencies=[Depends(get_current_user(["admin", "super"]))]
)
def manual_result_bulk(
    data: ManualBulkResultRequest,
    db: Session = Depends(get_db)
):
    if not data.results:
        raise HTTPException(400, "No results provided")

    timeslot = (getattr(data, "timeslot", None) or "").strip() or ist_current_timeslot()
    slot_date_raw = (getattr(data, "slot_date", None) or "").strip() or ist_current_slot_date()

    try:
        slot_date = datetime.strptime(slot_date_raw, "%Y-%m-%d").date().isoformat()
    except Exception:
        raise HTTPException(400, "Invalid slot_date format (expected YYYY-MM-DD)")

    published: list[str] = []
    failed: dict[str, str] = {}

    for item in data.results:
        serial = (item.serial or "").strip()

        try:
            validate_serial(serial)
            validate_number(int(item.winning_number))
        except ValueError as e:
            failed[serial or "(empty)"] = str(e)
            continue

        tickets = db.query(Ticket).filter(
            Ticket.serial == serial,
            Ticket.timeslot == timeslot,
            Ticket.slot_date == slot_date,
            Ticket.locked == True
        ).all()

        if tickets:
            total_points, total_amount = compute_totals_for_tickets(db, tickets)
        else:
            total_points, total_amount = 0, 0
        admin_cut = int(total_amount * 0.4)
        payout = total_amount - admin_cut

        existing = db.query(Result).filter(
            Result.serial == serial,
            Result.timeslot == timeslot,
            Result.slot_date == slot_date,
            Result.published == True
        ).first()

        if existing:
            existing.winning_number = int(item.winning_number)
            existing.total_points = total_points
            existing.total_amount = total_amount
            existing.payout_amount = payout
            existing.admin_amount = admin_cut
            existing.is_manual = True
            existing.published = True
            existing.slot_date = slot_date
            existing.created_at = datetime.utcnow()
        else:
            db.add(
                Result(
                    serial=serial,
                    timeslot=timeslot,
                    slot_date=slot_date,
                    winning_number=int(item.winning_number),
                    total_points=total_points,
                    total_amount=total_amount,
                    payout_amount=payout,
                    admin_amount=admin_cut,
                    is_manual=True,
                    published=True,
                    created_at=datetime.utcnow()
                )
            )

        published.append(serial)

    if not published:
        raise HTTPException(400, failed or "No valid results provided")

    db.commit()

    return {
        "message": "Bulk publish completed",
        "timeslot": timeslot,
        "slot_date": slot_date,
        "published": published,
        "failed": failed or None,
    }


# ================= PUBLIC RESULTS =================
@router.get("/public")
def public_results(
    date: str | None = None,
    from_date: str | None = None,
    to_date: str | None = None,
    db: Session = Depends(get_db)
):
    q = db.query(Result).filter(Result.published == True)

    # Backward-compatible single-date filter
    if date and not (from_date or to_date):
        from_date = date
        to_date = date

    # Prefer filtering by slot_date (the day this slot belongs to)
    if from_date:
        try:
            datetime.strptime(from_date, "%Y-%m-%d")
        except Exception:
            raise HTTPException(400, "Invalid from_date format")
        q = q.filter(Result.slot_date >= from_date)

    if to_date:
        try:
            datetime.strptime(to_date, "%Y-%m-%d")
        except Exception:
            raise HTTPException(400, "Invalid to_date format")
        q = q.filter(Result.slot_date <= to_date)

    # Return with latest dates first, but ordered slots within the date.
    # (So publishing later doesn't reshuffle the list by created_at)
    return q.order_by(
        Result.slot_date.desc().nullslast(),
        Result.timeslot.asc().nullslast(),
        Result.serial.asc().nullslast(),
        Result.created_at.desc().nullslast(),
    ).all()


# ======================================================
# FILTER RESULTS (DATE / TIMESLOT)
# ======================================================
@router.get("/filter")
def filter_results(
    date_str: str | None = None,
    timeslot: str | None = None,
    db: Session = Depends(get_db)
):
    query = db.query(Result).filter(Result.published == True)

    if date_str:
        try:
            selected_date = datetime.strptime(date_str, "%Y-%m-%d").date()
            query = query.filter(
                Result.created_at >= datetime.combine(selected_date, datetime.min.time()),
                Result.created_at <= datetime.combine(selected_date, datetime.max.time())
            )
        except:
            raise HTTPException(400, "Invalid date format")

    if timeslot:
        query = query.filter(Result.timeslot == timeslot)

    return query.order_by(
        Result.slot_date.desc().nullslast(),
        Result.timeslot.asc().nullslast(),
        Result.serial.asc().nullslast(),
        Result.created_at.desc().nullslast(),
    ).all()


# ======================================================
# TIMESLOT LIST FOR DATE (ADMIN / SUPER)
# ======================================================
@router.get(
    "/timeslots",
    dependencies=[Depends(get_current_user(["admin", "super"]))],
)
def timeslots_for_date(
    slot_date: str,
    db: Session = Depends(get_db),
):
    """Return all scheduled slots for the given IST date, along with publish summary.

    The UI needs to show every slot for a date (played or not), and allow manual
    publishing for any slot.
    """

    # Validate format early
    try:
        slot_date_iso = datetime.strptime(slot_date, "%Y-%m-%d").date().isoformat()
    except Exception:
        raise HTTPException(400, "Invalid slot_date format (expected YYYY-MM-DD)")

    slots = ist_timeslots_for_date(slot_date_iso)

    # Build a per-timeslot published serial set.
    published_rows = (
        db.query(Result.timeslot, Result.serial)
        .filter(
            Result.slot_date == slot_date_iso,
            Result.published == True,
        )
        .all()
    )

    published_map: dict[str, set[str]] = {}
    for ts, serial in published_rows:
        if not ts:
            continue
        published_map.setdefault(ts, set()).add(serial)

    items = []
    for ts in slots:
        published_serials = sorted(list(published_map.get(ts, set())))
        items.append(
            {
                "timeslot": ts,
                "slot_date": slot_date_iso,
                "published_count": len(published_serials),
                "total_serials": len(SERIALS),
                "fully_published": len(published_serials) == len(SERIALS),
                "published_serials": published_serials,
            }
        )

    return {
        "slot_date": slot_date_iso,
        "timezone": "Asia/Kolkata",
        "items": items,
    }


# ======================================================
# EXISTING RESULTS FOR A SLOT (ADMIN / SUPER)
# ======================================================
@router.get(
    "/by-slot",
    dependencies=[Depends(get_current_user(["admin", "super"]))],
)
def results_by_slot(
    slot_date: str,
    timeslot: str,
    db: Session = Depends(get_db),
):
    try:
        slot_date_iso = datetime.strptime(slot_date, "%Y-%m-%d").date().isoformat()
    except Exception:
        raise HTTPException(400, "Invalid slot_date format (expected YYYY-MM-DD)")

    ts = (timeslot or "").strip()
    if not ts:
        raise HTTPException(400, "timeslot is required")

    rows = (
        db.query(Result)
        .filter(
            Result.slot_date == slot_date_iso,
            Result.timeslot == ts,
            Result.published == True,
        )
        .order_by(Result.serial.asc())
        .all()
    )

    return {
        "slot_date": slot_date_iso,
        "timeslot": ts,
        "items": [
            {
                "serial": r.serial,
                "winning_number": r.winning_number,
                "is_manual": r.is_manual,
                "created_at": r.created_at,
            }
            for r in rows
        ],
    }


# ======================================================
# TICKET TOTALS FOR A SLOT (ADMIN / SUPER)
# ======================================================
@router.get(
    "/slot-ticket-summary",
    dependencies=[Depends(get_current_user(["admin", "super"]))],
)
def slot_ticket_summary(
    slot_date: str,
    timeslot: str,
    db: Session = Depends(get_db),
):
    try:
        slot_date_iso = datetime.strptime(slot_date, "%Y-%m-%d").date().isoformat()
    except Exception:
        raise HTTPException(400, "Invalid slot_date format (expected YYYY-MM-DD)")

    ts = (timeslot or "").strip()
    if not ts:
        raise HTTPException(400, "timeslot is required")

    digit_expr = Ticket.number % 10

    rows = (
        db.query(
            digit_expr.label("digit"),
            func.coalesce(func.sum(Ticket.points), 0).label("total_points"),
            func.count(Ticket.id).label("entries"),
        )
        .filter(
            Ticket.slot_date == slot_date_iso,
            Ticket.timeslot == ts,
            Ticket.locked == True,
        )
        .group_by(digit_expr)
        .all()
    )

    summary_map: dict[int, dict[str, int]] = {
        int(digit): {
            "total_points": int(total_points or 0),
            "entries": int(entries or 0),
        }
        for digit, total_points, entries in rows
        if digit is not None
    }

    items = []
    grand_total_points = 0
    grand_total_entries = 0
    for digit in range(10):
        total_points = int(summary_map.get(digit, {}).get("total_points", 0))
        entries = int(summary_map.get(digit, {}).get("entries", 0))
        grand_total_points += total_points
        grand_total_entries += entries
        items.append(
            {
                "digit": digit,
                "total_points": total_points,
                "entries": entries,
            }
        )

    return {
        "slot_date": slot_date_iso,
        "timeslot": ts,
        "grand_total_points": grand_total_points,
        "grand_total_entries": grand_total_entries,
        "items": items,
    }
