#!/usr/bin/env python3
"""AGK Control Shell: persistent Agentik runtime control backed by RMUX."""

from __future__ import annotations

import argparse
import curses
import json
import os
import re
import sqlite3
import subprocess
import sys
import time
import uuid
from dataclasses import dataclass
from pathlib import Path


USERS = {
    "operator": ("operator", Path("/home/operator"), Path("/home/operator/src")),
    "agentik": ("agentik", Path("/home/agentik"), Path("/home/agentik/workspace/projects")),
    "mission": ("mission", Path("/home/mission"), Path("/home/mission/workspace/clients")),
    "private": ("private", Path("/home/private"), Path("/home/private/workspace/projects")),
}
TYPES = {"hermes", "claude", "codex", "shell", "agent", "workflow", "monitor"}
STATES = {"running", "working", "idle", "waiting", "attention", "failed", "complete", "interrupted", "archived"}
NAME_RE = re.compile(r"^[a-z0-9][a-z0-9-]{2,79}$")


def run(*args: str, check: bool = True) -> subprocess.CompletedProcess[str]:
    return subprocess.run(args, text=True, capture_output=True, check=check)


@dataclass(frozen=True)
class Environment:
    name: str
    home: Path
    projects: Path

    @classmethod
    def current(cls) -> "Environment":
        user = os.environ.get("USER") or run("id", "-un").stdout.strip()
        if user not in USERS:
            raise SystemExit("agk is restricted to operator, agentik, mission, and private")
        return cls(*USERS[user])


class RuntimeRegistry:
    def __init__(self, env: Environment):
        self.env = env
        root = env.home / ".agentik"
        root.mkdir(mode=0o700, parents=True, exist_ok=True)
        self.path = root / "runtime.db"
        self.db = sqlite3.connect(self.path)
        self.db.row_factory = sqlite3.Row
        self.db.executescript("""
        CREATE TABLE IF NOT EXISTS runtime_sessions (
          id TEXT PRIMARY KEY, name TEXT NOT NULL UNIQUE, type TEXT NOT NULL,
          environment TEXT NOT NULL, client TEXT, project TEXT, mission TEXT,
          hermes_session TEXT, rmux_session TEXT NOT NULL UNIQUE, cwd TEXT NOT NULL,
          status TEXT NOT NULL, parent_session_id TEXT,
          created_at REAL NOT NULL, last_activity REAL NOT NULL, archived_at REAL
        );
        CREATE TABLE IF NOT EXISTS ui_state (
          environment TEXT PRIMARY KEY, view TEXT NOT NULL DEFAULT 'sessions',
          selected TEXT, filter TEXT, updated_at REAL NOT NULL
        );
        CREATE TABLE IF NOT EXISTS runtime_events (
          id INTEGER PRIMARY KEY, runtime_id TEXT, event TEXT NOT NULL,
          payload TEXT NOT NULL DEFAULT '{}', created_at REAL NOT NULL
        );
        """)

    def rows(self, include_archived: bool = False) -> list[sqlite3.Row]:
        where = "" if include_archived else " WHERE archived_at IS NULL"
        return list(self.db.execute(
            "SELECT * FROM runtime_sessions" + where + " ORDER BY last_activity DESC"
        ))

    def get(self, target: str) -> sqlite3.Row | None:
        return self.db.execute(
            "SELECT * FROM runtime_sessions WHERE id=? OR name=?", (target, target)
        ).fetchone()

    def create(self, *, name: str, kind: str, cwd: Path, client: str | None = None,
               project: str | None = None, mission: str | None = None,
               parent: str | None = None, command: list[str] | None = None) -> sqlite3.Row:
        if kind not in TYPES:
            raise ValueError(f"unsupported session type: {kind}")
        if not NAME_RE.fullmatch(name):
            raise ValueError("name must be 3-80 lowercase letters, digits or hyphens")
        cwd = cwd.expanduser().resolve()
        allowed = self.env.home.resolve()
        if cwd != allowed and allowed not in cwd.parents:
            raise ValueError(f"cwd escapes the {self.env.name} trust boundary")
        if self.get(name):
            raise ValueError(f"session already registered: {name}")
        if run("rmux", "has-session", "-t", name, check=False).returncode == 0:
            raise ValueError(f"unmanaged RMUX session already exists: {name}")
        launch = command or [os.environ.get("SHELL", "/bin/bash"), "-l"]
        env_args = ["-e", "AGENTIK_RMUX=1", "-e", f"AGENTIK_ENVIRONMENT={self.env.name}"]
        run("rmux", "new-session", "-d", "-s", name, "-n", kind.upper(), "-c", str(cwd), *env_args, *launch)
        now = time.time()
        runtime_id = "RT-" + uuid.uuid4().hex[:12].upper()
        self.db.execute(
            "INSERT INTO runtime_sessions VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)",
            (runtime_id, name, kind, self.env.name, client, project, mission, None,
             name, str(cwd), "running", parent, now, now, None),
        )
        self.db.execute(
            "INSERT INTO runtime_events(runtime_id,event,created_at) VALUES(?,?,?)",
            (runtime_id, "runtime.created", now),
        )
        self.db.commit()
        return self.get(runtime_id)  # type: ignore[return-value]

    def reconcile(self) -> tuple[int, list[str]]:
        proc = run("rmux", "list-sessions", "-F", "#{session_name}", check=False)
        live = {line.strip() for line in proc.stdout.splitlines() if line.strip()} if proc.returncode == 0 else set()
        managed = {row["rmux_session"] for row in self.rows(include_archived=True)}
        changed = 0
        now = time.time()
        for row in self.rows():
            desired = row["status"]
            if row["rmux_session"] not in live and desired not in {"complete", "failed", "archived"}:
                desired = "interrupted"
            elif row["rmux_session"] in live and desired == "interrupted":
                desired = "running"
            if desired != row["status"]:
                self.db.execute("UPDATE runtime_sessions SET status=?,last_activity=? WHERE id=?", (desired, now, row["id"]))
                changed += 1
        self.db.commit()
        return changed, sorted(live - managed)


def default_command(kind: str) -> list[str]:
    commands = {
        "hermes": ["hermes"],
        "claude": ["rmux", "claude"],
        "codex": ["codex"],
        "shell": [os.environ.get("SHELL", "/bin/bash"), "-l"],
    }
    if kind not in commands:
        raise ValueError(f"{kind} requires an explicit orchestrator command")
    return commands[kind]


def filtered(rows: list[sqlite3.Row], query: str) -> list[sqlite3.Row]:
    terms = query.lower().split()
    out = []
    for row in rows:
        values = dict(row)
        text = " ".join(str(v or "") for v in values.values()).lower()
        ok = True
        for term in terms:
            if ":" in term:
                key, value = term.split(":", 1)
                key = "environment" if key == "env" else key
                ok &= key in values and value in str(values[key] or "").lower()
            else:
                ok &= term in text
        if ok:
            out.append(row)
    return out


def tui(stdscr: "curses._CursesWindow", registry: RuntimeRegistry) -> None:
    curses.curs_set(0)
    selected, query = 0, ""
    while True:
        registry.reconcile()
        rows = filtered(registry.rows(), query)
        selected = max(0, min(selected, max(0, len(rows) - 1)))
        stdscr.erase()
        height, width = stdscr.getmaxyx()
        header = f" AGK · {registry.env.name.upper()} "
        stdscr.addnstr(0, 0, header + " " * max(1, width - len(header) - 10) + "● ONLINE", width - 1, curses.A_BOLD)
        stdscr.addnstr(1, 0, " Session  Projects  Agents  OS  MCP  Skills  ──  System  Settings  Help ", width - 1)
        stdscr.addnstr(3, 0, "ACTIVE" + (f"  / {query}" if query else ""), width - 1, curses.A_BOLD)
        for idx, row in enumerate(rows[: max(0, height - 9)]):
            marker = "▶" if idx == selected else " "
            state = {"running": "●", "working": "◉", "idle": "○", "waiting": "◌", "failed": "×", "complete": "✓"}.get(row["status"], "!")
            label = f"{marker} {state} {row['name']:<42} {row['type'].upper():<9} {row['status'].upper()}"
            stdscr.addnstr(5 + idx, 0, label, width - 1, curses.A_REVERSE if idx == selected else 0)
        footer = "↑↓/jk Navigate  Enter Open  n New  / Search  i Info  A Archive  K Kill  ? Help  q Quit"
        stdscr.addnstr(height - 2, 0, footer, width - 1)
        stdscr.refresh()
        key = stdscr.getch()
        if key in (ord("q"), 27):
            return
        if key in (curses.KEY_DOWN, ord("j")) and rows:
            selected = min(len(rows) - 1, selected + 1)
        elif key in (curses.KEY_UP, ord("k")) and rows:
            selected = max(0, selected - 1)
        elif key in (10, 13) and rows:
            curses.endwin()
            subprocess.run(["rmux", "attach-session", "-t", rows[selected]["rmux_session"]])
            stdscr.refresh()
        elif key == ord("/"):
            curses.echo(); curses.curs_set(1)
            stdscr.addstr(height - 1, 0, "Search: ")
            query = stdscr.getstr(height - 1, 8, max(1, width - 10)).decode(errors="replace")
            curses.noecho(); curses.curs_set(0); selected = 0
        elif key == ord("i") and rows:
            stdscr.erase(); stdscr.addstr(0, 0, json.dumps(dict(rows[selected]), indent=2)); stdscr.addstr(height - 1, 0, "Press any key"); stdscr.getch()
        elif key == ord("?"):
            stdscr.erase(); stdscr.addstr(0, 0, "CONTROL MODE\nEnter attaches. Ctrl-b d detaches without killing work.\nq exits AGK only. K is destructive and requires the CLI confirmation.\n\nPress any key."); stdscr.getch()


def doctor(env: Environment, registry: RuntimeRegistry) -> int:
    checks = []
    for label, command in (("RMUX", ["rmux", "-V"]), ("RMUX health", ["rmux", "diagnose", "--human"]),
                           ("Hermes", ["hermes", "--help"]), ("Claude", ["claude", "--version"]),
                           ("Codex", ["codex", "--version"]), ("Tailscale", ["tailscale", "status"])):
        result = run(*command, check=False)
        checks.append((label, result.returncode == 0))
    _, unmanaged = registry.reconcile()
    checks += [("Runtime registry", True), ("OS Registry", Path("/opt/agentik/os-registry").is_dir()),
               ("Isolated home", env.home.stat().st_mode & 0o077 == 0)]
    print(f"AGENTIK OS DOCTOR · {env.name.upper()}")
    for label, ok in checks:
        print(f"{'✓' if ok else '✗'} {label}")
    print(f"{'!' if unmanaged else '✓'} Unmanaged RMUX sessions: {', '.join(unmanaged) if unmanaged else 'none'}")
    return 0 if all(ok for _, ok in checks) else 1


def main() -> int:
    parser = argparse.ArgumentParser(prog="agk")
    sub = parser.add_subparsers(dest="command")
    sub.add_parser("status"); sub.add_parser("doctor"); sub.add_parser("sessions")
    new = sub.add_parser("new")
    new.add_argument("type", choices=sorted(TYPES)); new.add_argument("name")
    new.add_argument("--cwd", type=Path); new.add_argument("--client"); new.add_argument("--project"); new.add_argument("--mission")
    resume = sub.add_parser("resume"); resume.add_argument("target", nargs="?")
    open_p = sub.add_parser("open"); open_p.add_argument("target")
    agent = sub.add_parser("agent"); agent.add_argument("type", choices=("hermes", "claude", "codex")); agent.add_argument("name", nargs="?")
    sub.add_parser("projects"); sub.add_parser("agents"); sub.add_parser("os"); sub.add_parser("mcp"); sub.add_parser("skills"); sub.add_parser("system")
    args = parser.parse_args()
    env = Environment.current(); registry = RuntimeRegistry(env); registry.reconcile()
    if args.command is None:
        if not sys.stdin.isatty() or not sys.stdout.isatty():
            print("agk Control Shell requires a TTY; use `agk status` for non-interactive use.", file=sys.stderr); return 2
        curses.wrapper(tui, registry); return 0
    if args.command in {"status", "sessions"}:
        print(f"AGENTIK OS · {env.name.upper()}\nRMUX {run('rmux','-V').stdout.strip()}")
        for row in registry.rows(): print(f"{row['status']:<12} {row['type']:<9} {row['name']}  {row['project'] or '—'}")
        return 0
    if args.command == "doctor": return doctor(env, registry)
    if args.command == "new":
        row = registry.create(name=args.name, kind=args.type, cwd=args.cwd or env.home, client=args.client, project=args.project, mission=args.mission, command=default_command(args.type))
        print(f"Created {row['id']} · {row['name']} · {row['type'].upper()}"); return 0
    if args.command == "agent":
        name = args.name or f"{env.name}-{args.type}-{time.strftime('%Y%m%d-%H%M%S')}"
        row = registry.create(name=name, kind=args.type, cwd=env.projects if env.projects.exists() else env.home, command=default_command(args.type))
        print(f"Started {row['id']} · {row['name']}"); return 0
    if args.command in {"resume", "open"}:
        target = getattr(args, "target", None)
        row = registry.get(target) if target else (registry.rows()[0] if registry.rows() else None)
        if not row: print("No resumable session.", file=sys.stderr); return 1
        os.execvp("rmux", ["rmux", "attach-session", "-t", row["rmux_session"]])
    if args.command == "projects":
        for row in sorted(env.projects.glob("*")) if env.projects.exists() else []: print(row.name)
        return 0
    if args.command == "agents":
        for row in registry.rows():
            if row["type"] in {"hermes", "claude", "codex", "agent"}: print(f"{row['status']:<12} {row['type']:<8} {row['name']}")
        return 0
    if args.command == "os":
        index = Path("/opt/agentik/os-registry/state/index.json")
        data = json.loads(index.read_text()) if index.exists() else {"packages": []}
        print(f"Installed Operative Systems: {len(data.get('packages', []))}"); return 0
    if args.command in {"mcp", "skills", "system"}:
        print(f"{args.command.upper()} view · {env.name} · use Hermes canonical commands for details"); return 0
    return 2


if __name__ == "__main__":
    raise SystemExit(main())
