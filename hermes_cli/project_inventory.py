"""Project inventory derived from Hermes history and live mux sessions."""
from __future__ import annotations

import os
from pathlib import Path
from typing import Any


def merge_project_inventory(
    historical_cwds: list[dict[str, Any]],
    live_sessions: list[dict[str, Any]],
    *,
    limit: int = 200,
) -> list[dict[str, Any]]:
    rows: dict[str, dict[str, Any]] = {}

    def ensure(raw_cwd: Any) -> dict[str, Any] | None:
        cwd = os.path.realpath(os.path.expanduser(str(raw_cwd or "").strip()))
        if not cwd or not os.path.isdir(cwd):
            return None
        if cwd not in rows:
            rows[cwd] = {
                "cwd": cwd,
                "is_git": (Path(cwd) / ".git").exists(),
                "last_active": 0.0,
                "live_sessions": [],
                "name": Path(cwd).name or cwd,
                "sessions": 0,
            }
        return rows[cwd]

    for item in historical_cwds:
        row = ensure(item.get("cwd"))
        if row is None:
            continue
        row["sessions"] += max(0, int(item.get("sessions") or 0))
        row["last_active"] = max(row["last_active"], float(item.get("last_active") or 0))

    for item in live_sessions:
        row = ensure(item.get("cwd"))
        if row is None:
            continue
        name = str(item.get("name") or "").strip()
        if name and name not in row["live_sessions"]:
            row["live_sessions"].append(name)
        row["last_active"] = max(row["last_active"], float(item.get("activity") or 0))

    projects = list(rows.values())
    projects.sort(key=lambda row: (not bool(row["live_sessions"]), -row["last_active"], row["name"].casefold()))
    return projects[: max(1, min(1000, int(limit)))]
