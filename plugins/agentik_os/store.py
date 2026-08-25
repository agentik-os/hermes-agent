"""Transactional local repository for Agentik OS control objects."""

from __future__ import annotations

import json
import sqlite3
import time
import uuid
from contextlib import contextmanager
from dataclasses import dataclass
from pathlib import Path
from typing import Iterator


PREFIX = {"client": "CLI", "project": "PRJ", "mission": "MIS", "task": "TSK", "run": "RUN"}


@dataclass(frozen=True)
class ControlObject:
    id: str
    environment: str
    kind: str
    slug: str
    name: str
    parent_id: str | None
    status: str
    path: str | None
    metadata: dict


class ControlStore:
    def __init__(self, path: Path):
        self.path = path
        path.parent.mkdir(parents=True, exist_ok=True)
        self._initialize()

    @contextmanager
    def connect(self) -> Iterator[sqlite3.Connection]:
        conn = sqlite3.connect(self.path, timeout=10)
        conn.row_factory = sqlite3.Row
        conn.execute("PRAGMA foreign_keys=ON")
        conn.execute("PRAGMA journal_mode=WAL")
        try:
            yield conn
            conn.commit()
        except Exception:
            conn.rollback()
            raise
        finally:
            conn.close()

    def _initialize(self) -> None:
        with self.connect() as db:
            db.executescript("""
                CREATE TABLE IF NOT EXISTS objects (
                    id TEXT PRIMARY KEY,
                    environment TEXT NOT NULL,
                    kind TEXT NOT NULL,
                    slug TEXT NOT NULL,
                    name TEXT NOT NULL,
                    parent_id TEXT REFERENCES objects(id),
                    status TEXT NOT NULL,
                    path TEXT,
                    metadata_json TEXT NOT NULL DEFAULT '{}',
                    created_at REAL NOT NULL,
                    updated_at REAL NOT NULL,
                    UNIQUE(environment, kind, parent_id, slug)
                );
                CREATE INDEX IF NOT EXISTS idx_objects_scope
                    ON objects(environment, kind, parent_id, status);
                CREATE UNIQUE INDEX IF NOT EXISTS idx_objects_unique_scope
                    ON objects(environment, kind, COALESCE(parent_id, ''), slug);
                CREATE TABLE IF NOT EXISTS contexts (
                    context_key TEXT PRIMARY KEY,
                    environment TEXT NOT NULL,
                    client_id TEXT,
                    project_id TEXT,
                    mission_id TEXT,
                    task_id TEXT,
                    updated_at REAL NOT NULL
                );
                CREATE TABLE IF NOT EXISTS events (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    environment TEXT NOT NULL,
                    action TEXT NOT NULL,
                    object_id TEXT,
                    payload_json TEXT NOT NULL,
                    created_at REAL NOT NULL
                );
            """)

    @staticmethod
    def _row(row: sqlite3.Row | None) -> ControlObject | None:
        if row is None:
            return None
        return ControlObject(
            id=row["id"], environment=row["environment"], kind=row["kind"],
            slug=row["slug"], name=row["name"], parent_id=row["parent_id"],
            status=row["status"], path=row["path"],
            metadata=json.loads(row["metadata_json"] or "{}"),
        )

    def create(self, *, environment: str, kind: str, slug: str, name: str,
               parent_id: str | None = None, status: str = "active",
               path: str | None = None, metadata: dict | None = None) -> ControlObject:
        now = time.time()
        object_id = f"{PREFIX[kind]}-{uuid.uuid4().hex[:10].upper()}"
        with self.connect() as db:
            if parent_id is not None:
                parent = db.execute(
                    "SELECT environment FROM objects WHERE id=?", (parent_id,)
                ).fetchone()
                if parent is None:
                    raise ValueError(f"parent object does not exist: {parent_id}")
                if parent["environment"] != environment:
                    raise PermissionError("parent object belongs to another environment")
            db.execute(
                "INSERT INTO objects VALUES (?,?,?,?,?,?,?,?,?,?,?)",
                (object_id, environment, kind, slug, name, parent_id, status,
                 path, json.dumps(metadata or {}, sort_keys=True), now, now),
            )
            db.execute(
                "INSERT INTO events(environment,action,object_id,payload_json,created_at) VALUES(?,?,?,?,?)",
                (environment, f"{kind}.created", object_id,
                 json.dumps({"slug": slug, "parent_id": parent_id}, sort_keys=True), now),
            )
        return self.get(environment, kind, object_id)

    def get(self, environment: str, kind: str, target: str) -> ControlObject | None:
        with self.connect() as db:
            row = db.execute(
                "SELECT * FROM objects WHERE environment=? AND kind=? AND (id=? OR slug=?) ORDER BY updated_at DESC LIMIT 1",
                (environment, kind, target, target),
            ).fetchone()
        return self._row(row)

    def list(self, environment: str, kind: str, parent_id: str | None = None) -> list[ControlObject]:
        sql = "SELECT * FROM objects WHERE environment=? AND kind=?"
        args: list[object] = [environment, kind]
        if parent_id is not None:
            sql += " AND parent_id=?"
            args.append(parent_id)
        sql += " ORDER BY updated_at DESC, name"
        with self.connect() as db:
            rows = db.execute(sql, args).fetchall()
        return [self._row(row) for row in rows if row is not None]

    def transition(self, obj: ControlObject, status: str) -> ControlObject:
        now = time.time()
        with self.connect() as db:
            db.execute("UPDATE objects SET status=?, updated_at=? WHERE id=?", (status, now, obj.id))
            db.execute(
                "INSERT INTO events(environment,action,object_id,payload_json,created_at) VALUES(?,?,?,?,?)",
                (obj.environment, f"{obj.kind}.{status}", obj.id, "{}", now),
            )
        return self.get(obj.environment, obj.kind, obj.id)

    def context(self, key: str, environment: str) -> dict:
        with self.connect() as db:
            row = db.execute("SELECT * FROM contexts WHERE context_key=?", (key,)).fetchone()
        if not row:
            return {"environment": environment, "client_id": None, "project_id": None,
                    "mission_id": None, "task_id": None}
        return dict(row)

    def set_context(self, key: str, environment: str, **updates: str | None) -> dict:
        current = self.context(key, environment)
        current.update(updates)
        with self.connect() as db:
            db.execute("""
                INSERT INTO contexts(context_key,environment,client_id,project_id,mission_id,task_id,updated_at)
                VALUES(?,?,?,?,?,?,?) ON CONFLICT(context_key) DO UPDATE SET
                environment=excluded.environment, client_id=excluded.client_id,
                project_id=excluded.project_id, mission_id=excluded.mission_id,
                task_id=excluded.task_id, updated_at=excluded.updated_at
            """, (key, environment, current.get("client_id"), current.get("project_id"),
                  current.get("mission_id"), current.get("task_id"), time.time()))
        return self.context(key, environment)

    def clear_context(self, key: str, environment: str) -> dict:
        return self.set_context(key, environment, client_id=None, project_id=None,
                                mission_id=None, task_id=None)
