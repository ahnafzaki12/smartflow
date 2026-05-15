# database.py — SmartFlow SQLite Persistence Layer
# Task 2.2: Data survive restart, query historis per jam

import sqlite3
import datetime
import os
import threading
from contextlib import contextmanager
from typing import Optional, List, Dict, Any

DB_PATH = os.path.join(os.path.dirname(__file__), "smartflow.db")
_db_lock = threading.Lock()


def get_connection() -> sqlite3.Connection:
    conn = sqlite3.connect(DB_PATH, check_same_thread=False)
    conn.row_factory = sqlite3.Row
    # WAL mode: concurrent reads tidak blocking writes
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA synchronous=NORMAL")
    return conn


@contextmanager
def db_conn():
    """Context manager untuk koneksi DB yang aman."""
    conn = get_connection()
    try:
        yield conn
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()


def init_db():
    """Buat semua tabel jika belum ada. Dipanggil saat startup."""
    with db_conn() as conn:
        conn.executescript("""
            CREATE TABLE IF NOT EXISTS history (
                id        INTEGER PRIMARY KEY AUTOINCREMENT,
                timestamp TEXT    NOT NULL,
                q_a       INTEGER DEFAULT 0,
                q_b       INTEGER DEFAULT 0,
                q_c       INTEGER DEFAULT 0,
                q_d       INTEGER DEFAULT 0,
                g_a       INTEGER DEFAULT 0,
                g_b       INTEGER DEFAULT 0,
                g_c       INTEGER DEFAULT 0,
                g_d       INTEGER DEFAULT 0,
                phase_a   TEXT    DEFAULT 'RED',
                phase_b   TEXT    DEFAULT 'RED',
                phase_c   TEXT    DEFAULT 'RED',
                phase_d   TEXT    DEFAULT 'RED'
            );

            CREATE TABLE IF NOT EXISTS decisions (
                id           INTEGER PRIMARY KEY AUTOINCREMENT,
                timestamp    TEXT    NOT NULL,
                intersection TEXT    NOT NULL,
                prev_green   INTEGER DEFAULT 0,
                new_green    INTEGER DEFAULT 0,
                reason       TEXT    DEFAULT '',
                cycle_number INTEGER DEFAULT 0
            );

            CREATE TABLE IF NOT EXISTS alerts (
                id           INTEGER PRIMARY KEY AUTOINCREMENT,
                timestamp    TEXT    NOT NULL,
                type         TEXT    NOT NULL,
                severity     TEXT    NOT NULL,
                intersection TEXT,
                message      TEXT    NOT NULL,
                resolved     INTEGER DEFAULT 0,
                resolved_at  TEXT
            );

            CREATE TABLE IF NOT EXISTS settings (
                key        TEXT PRIMARY KEY,
                value      TEXT NOT NULL,
                updated_at TEXT NOT NULL
            );

            CREATE INDEX IF NOT EXISTS idx_history_ts   ON history(timestamp);
            CREATE INDEX IF NOT EXISTS idx_decisions_ts ON decisions(timestamp);
            CREATE INDEX IF NOT EXISTS idx_alerts_res   ON alerts(resolved, timestamp);
        """)
    print(f"[DB] Initialized: {DB_PATH}")


# ─── History CRUD ─────────────────────────────────────────────────────────────

def insert_history(entry: dict):
    """Insert 1 tick historis. entry = {qA,qB,qC,qD,gA,gB,gC,gD,phases}."""
    phases = entry.get("phases", {})
    with _db_lock:
        with db_conn() as conn:
            conn.execute(
                """INSERT INTO history
                   (timestamp, q_a,q_b,q_c,q_d, g_a,g_b,g_c,g_d,
                    phase_a,phase_b,phase_c,phase_d)
                   VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)""",
                (
                    entry.get("ts", datetime.datetime.now().isoformat()),
                    entry.get("qA", 0), entry.get("qB", 0),
                    entry.get("qC", 0), entry.get("qD", 0),
                    entry.get("gA", 0), entry.get("gB", 0),
                    entry.get("gC", 0), entry.get("gD", 0),
                    phases.get("Simpang A", "RED"),
                    phases.get("Simpang B", "RED"),
                    phases.get("Simpang C", "RED"),
                    phases.get("Simpang D", "RED"),
                ),
            )


def get_history(hours: float = 0.5, limit: int = 5000) -> List[Dict[str, Any]]:
    """Ambil historis dari DB. hours=0 → ambil semua (limit cap)."""
    with db_conn() as conn:
        if hours > 0:
            cutoff = (
                datetime.datetime.now() - datetime.timedelta(hours=hours)
            ).isoformat()
            rows = conn.execute(
                "SELECT * FROM history WHERE timestamp >= ? ORDER BY id DESC LIMIT ?",
                (cutoff, limit),
            ).fetchall()
        else:
            rows = conn.execute(
                "SELECT * FROM history ORDER BY id DESC LIMIT ?", (limit,)
            ).fetchall()
    return [dict(r) for r in reversed(rows)]


# ─── Decisions CRUD ───────────────────────────────────────────────────────────

def insert_decision(entry: dict):
    with _db_lock:
        with db_conn() as conn:
            conn.execute(
                """INSERT INTO decisions
                   (timestamp, intersection, prev_green, new_green, reason, cycle_number)
                   VALUES (?,?,?,?,?,?)""",
                (
                    entry.get("timestamp", datetime.datetime.now().isoformat()),
                    entry.get("intersection", ""),
                    entry.get("prev_green", 0),
                    entry.get("new_green", 0),
                    entry.get("reason", ""),
                    entry.get("cycle_number", 0),
                ),
            )


def get_decisions(limit: int = 100, offset: int = 0) -> List[Dict[str, Any]]:
    with db_conn() as conn:
        rows = conn.execute(
            "SELECT * FROM decisions ORDER BY id DESC LIMIT ? OFFSET ?",
            (limit, offset),
        ).fetchall()
    return [dict(r) for r in rows]


# ─── Alerts CRUD ──────────────────────────────────────────────────────────────

def insert_alert(entry: dict) -> int:
    with _db_lock:
        with db_conn() as conn:
            cur = conn.execute(
                """INSERT INTO alerts
                   (timestamp, type, severity, intersection, message)
                   VALUES (?,?,?,?,?)""",
                (
                    entry.get("timestamp", datetime.datetime.now().isoformat()),
                    entry.get("type", "system"),
                    entry.get("severity", "info"),
                    entry.get("intersection"),
                    entry.get("message", ""),
                ),
            )
            return cur.lastrowid


def get_alerts(active_only: bool = False, limit: int = 100) -> List[Dict[str, Any]]:
    with db_conn() as conn:
        if active_only:
            rows = conn.execute(
                "SELECT * FROM alerts WHERE resolved=0 ORDER BY id DESC LIMIT ?",
                (limit,),
            ).fetchall()
        else:
            rows = conn.execute(
                "SELECT * FROM alerts ORDER BY id DESC LIMIT ?", (limit,)
            ).fetchall()
    return [dict(r) for r in rows]


def resolve_alert(alert_id: int) -> bool:
    with _db_lock:
        with db_conn() as conn:
            cur = conn.execute(
                "UPDATE alerts SET resolved=1, resolved_at=? WHERE id=?",
                (datetime.datetime.now().isoformat(), alert_id),
            )
            return cur.rowcount > 0


# ─── Settings CRUD ────────────────────────────────────────────────────────────

def get_setting(key: str, default=None) -> Optional[str]:
    with db_conn() as conn:
        row = conn.execute(
            "SELECT value FROM settings WHERE key=?", (key,)
        ).fetchone()
    return row["value"] if row else default


def set_setting(key: str, value: str):
    with _db_lock:
        with db_conn() as conn:
            conn.execute(
                """INSERT INTO settings (key, value, updated_at)
                   VALUES (?,?,?)
                   ON CONFLICT(key) DO UPDATE SET value=excluded.value, updated_at=excluded.updated_at""",
                (key, str(value), datetime.datetime.now().isoformat()),
            )
