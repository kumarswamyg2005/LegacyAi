"""
LegacyLift — SQLite Database Layer
Handles user accounts, session history, and usage tracking.
"""

from __future__ import annotations

import aiosqlite
import os

DB_PATH = os.getenv("DB_PATH", "legacylift.db")

async def get_db() -> aiosqlite.Connection:
    db = await aiosqlite.connect(DB_PATH)
    db.row_factory = aiosqlite.Row
    return db


async def init_db():
    db = await get_db()
    try:
        await db.executescript("""
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                email TEXT UNIQUE NOT NULL,
                password_hash TEXT NOT NULL,
                tier TEXT NOT NULL DEFAULT 'free',
                stripe_customer_id TEXT,
                daily_usage INTEGER NOT NULL DEFAULT 0,
                last_usage_date TEXT,
                created_at TEXT NOT NULL DEFAULT (datetime('now'))
            );

            CREATE TABLE IF NOT EXISTS sessions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                filename TEXT,
                source_lang TEXT NOT NULL,
                target_lang TEXT NOT NULL,
                original_code TEXT NOT NULL,
                modernized_code TEXT,
                documentation TEXT,
                unit_tests TEXT,
                test_results TEXT,
                confidence_score REAL,
                change_summary TEXT,
                complexity_score TEXT,
                architecture_diagram TEXT,
                created_at TEXT NOT NULL DEFAULT (datetime('now')),
                FOREIGN KEY (user_id) REFERENCES users(id)
            );

            CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);
            CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
        """)
        await db.commit()
    finally:
        await db.close()
