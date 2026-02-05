from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
import os

from pathlib import Path

_env_database_url = os.getenv("DATABASE_URL")
if _env_database_url:
    DATABASE_URL = _env_database_url
else:
    # Stable default regardless of current working directory.
    backend_dir = Path(__file__).resolve().parents[2]
    db_path = backend_dir / "luckbuddy.db"
    DATABASE_URL = f"sqlite:////{db_path}"


def _sqlite_table_exists(conn, table: str) -> bool:
    row = conn.execute(
        text("SELECT name FROM sqlite_master WHERE type='table' AND name = :t"),
        {"t": table},
    ).fetchone()
    return row is not None


def _sqlite_has_column(conn, table: str, column: str) -> bool:
    rows = conn.execute(text(f"PRAGMA table_info({table})")).fetchall()
    return any(r[1] == column for r in rows)


def _ensure_sqlite_schema(engine):
    if not DATABASE_URL.startswith("sqlite"):
        return

    with engine.begin() as conn:
        if _sqlite_table_exists(conn, "tickets"):
            # tickets.slot_date + tickets.created_at
            if not _sqlite_has_column(conn, "tickets", "slot_date"):
                conn.execute(text("ALTER TABLE tickets ADD COLUMN slot_date TEXT"))
            if not _sqlite_has_column(conn, "tickets", "created_at"):
                conn.execute(text("ALTER TABLE tickets ADD COLUMN created_at DATETIME"))

            # Best-effort backfill for existing rows
            conn.execute(
                text("UPDATE tickets SET created_at = COALESCE(created_at, CURRENT_TIMESTAMP)")
            )
            conn.execute(
                text("UPDATE tickets SET slot_date = COALESCE(slot_date, substr(created_at, 1, 10))")
            )

        if _sqlite_table_exists(conn, "results"):
            # results.slot_date
            if not _sqlite_has_column(conn, "results", "slot_date"):
                conn.execute(text("ALTER TABLE results ADD COLUMN slot_date TEXT"))

            conn.execute(
                text("UPDATE results SET slot_date = COALESCE(slot_date, substr(created_at, 1, 10))")
            )

connect_args = {"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {}

engine = create_engine(DATABASE_URL, connect_args=connect_args)

_ensure_sqlite_schema(engine)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
