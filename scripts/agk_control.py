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

import yaml


USERS = {
    "operator": ("operator", Path("/home/operator"), Path("/home/operator/src")),
    "agentik": ("agentik", Path("/home/agentik"), Path("/home/agentik/workspace/projects")),
    "mission": ("mission", Path("/home/mission"), Path("/home/mission/workspace/clients")),
    "private": ("private", Path("/home/private"), Path("/home/private/workspace/projects")),
}
TYPES = {"hermes", "claude", "codex", "shell", "agent", "workflow", "monitor"}
STATES = {"running", "working", "idle", "waiting", "attention", "failed", "complete", "interrupted", "archived"}
NAME_RE = re.compile(r"^[a-z0-9][a-z0-9-]{2,79}$")
VIEWS = ("sessions", "projects", "agents", "os", "mcp", "skills", "system", "settings", "help")
TAB_DOUBLE_MS = 420


def layout_mode(width: int, height: int) -> str:
    if width < 72 or height < 18:
        return "compact"
    if width < 120 or height < 28:
        return "standard"
    return "wide"


def pane_widths(width: int, mode: str, fullscreen: bool = False) -> tuple[int, int]:
    if fullscreen:
        return 0, max(0, width)
    if mode != "wide":
        return max(0, width), 0
    left = max(38, min(54, width * 2 // 5))
    return left, max(0, width - left - 1)


def cycle_view(view: str, reverse: bool = False) -> str:
    index = VIEWS.index(view) if view in VIEWS else 0
    return VIEWS[(index + (-1 if reverse else 1)) % len(VIEWS)]


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


class RmuxRuntime:
    """Typed Agentik adapter over the installed RMUX public CLI contract."""

    def has_session(self, name: str) -> bool:
        return run("rmux", "has-session", "-t", name, check=False).returncode == 0

    def create(self, name: str, kind: str, cwd: Path, environment: str,
               command: list[str]) -> None:
        run("rmux", "new-session", "-d", "-s", name, "-n", kind.upper(),
            "-c", str(cwd), "-e", "AGENTIK_RMUX=1",
            "-e", f"AGENTIK_ENVIRONMENT={environment}", *command)

    def primary_pane(self, session: str) -> str:
        result = run("rmux", "list-panes", "-t", session, "-F", "#{pane_id}", check=False)
        pane = next((line.strip() for line in result.stdout.splitlines() if line.strip()), "")
        if result.returncode or not pane:
            raise RuntimeError(f"RMUX session has no live pane: {session}")
        return pane

    def rename(self, session: str, name: str) -> None:
        run("rmux", "rename-session", "-t", session, name)

    def terminate(self, session: str) -> None:
        run("rmux", "kill-session", "-t", session, check=False)

    def respawn(self, session: str, cwd: str, command: list[str]) -> None:
        run("rmux", "respawn-pane", "-k", "-t", self.primary_pane(session), "-c", cwd, *command)

    def send_input(self, session: str, text: str, *, enter: bool = True) -> None:
        pane = self.primary_pane(session)
        run("rmux", "send-keys", "-t", pane, "-l", text)
        if enter:
            run("rmux", "send-keys", "-t", pane, "Enter")

    def wait_for(self, channel: str) -> None:
        if not NAME_RE.fullmatch(channel):
            raise ValueError("RMUX wait channel must use the canonical name grammar")
        run("rmux", "wait-for", channel)

    def panes(self) -> subprocess.CompletedProcess[str]:
        return run("rmux", "list-panes", "-a", "-F",
                   "#{session_name}|#{pane_dead}|#{pane_activity}|#{pane_current_command}", check=False)

    def snapshot(self, session: str, lines: int) -> list[str]:
        result = run("rmux", "capture-pane", "-p", "-t", session,
                     "-S", f"-{max(20, lines * 3)}", check=False)
        if result.returncode:
            return ["Runtime unavailable", "", "Press R to restart the frontend."]
        return result.stdout.rstrip().splitlines() or ["(no terminal output yet)"]


class RuntimeRegistry:
    def __init__(self, env: Environment, runtime: RmuxRuntime | None = None):
        self.env = env
        self.runtime = runtime or RmuxRuntime()
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
        self._migrate()

    def _migrate(self) -> None:
        columns = {row[1] for row in self.db.execute("PRAGMA table_info(runtime_sessions)")}
        additions = {
            "native_session": "TEXT",
            "command_json": "TEXT NOT NULL DEFAULT '[]'",
            "exit_code": "INTEGER",
        }
        for name, sql_type in additions.items():
            if name not in columns:
                self.db.execute(f"ALTER TABLE runtime_sessions ADD COLUMN {name} {sql_type}")
        self.db.commit()

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
               parent: str | None = None, command: list[str] | None = None,
               native_session: str | None = None) -> sqlite3.Row:
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
        if self.runtime.has_session(name):
            raise ValueError(f"unmanaged RMUX session already exists: {name}")
        launch = command or [os.environ.get("SHELL", "/bin/bash"), "-l"]
        self.runtime.create(name, kind, cwd, self.env.name, launch)
        now = time.time()
        runtime_id = "RT-" + uuid.uuid4().hex[:12].upper()
        self.db.execute("""
            INSERT INTO runtime_sessions(
              id,name,type,environment,client,project,mission,hermes_session,
              rmux_session,cwd,status,parent_session_id,created_at,last_activity,
              archived_at,native_session,command_json,exit_code
            ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
        """, (runtime_id, name, kind, self.env.name, client, project, mission,
               native_session if kind == "hermes" else None, name, str(cwd),
               "running", parent, now, now, None, native_session,
               json.dumps(launch), None))
        self.db.execute(
            "INSERT INTO runtime_events(runtime_id,event,created_at) VALUES(?,?,?)",
            (runtime_id, "runtime.created", now),
        )
        self.db.commit()
        return self.get(runtime_id)  # type: ignore[return-value]

    def update(self, row: sqlite3.Row, **values: object) -> sqlite3.Row:
        allowed = {"name", "status", "rmux_session", "last_activity", "archived_at", "exit_code"}
        unknown = set(values) - allowed
        if unknown:
            raise ValueError(f"unsupported runtime update: {sorted(unknown)}")
        values.setdefault("last_activity", time.time())
        fields = ",".join(f"{key}=?" for key in values)
        self.db.execute(f"UPDATE runtime_sessions SET {fields} WHERE id=?", (*values.values(), row["id"]))
        self.db.commit()
        return self.get(row["id"])  # type: ignore[return-value]

    def event(self, row: sqlite3.Row, event: str, payload: dict[str, object] | None = None) -> None:
        self.db.execute(
            "INSERT INTO runtime_events(runtime_id,event,payload,created_at) VALUES(?,?,?,?)",
            (row["id"], event, json.dumps(payload or {}, sort_keys=True), time.time()),
        )
        self.db.commit()

    def load_ui(self) -> dict[str, object]:
        row = self.db.execute("SELECT * FROM ui_state WHERE environment=?", (self.env.name,)).fetchone()
        return dict(row) if row else {"view": "sessions", "selected": None, "filter": ""}

    def save_ui(self, view: str, selected: str | None, query: str) -> None:
        self.db.execute("""
          INSERT INTO ui_state(environment,view,selected,filter,updated_at)
          VALUES(?,?,?,?,?) ON CONFLICT(environment) DO UPDATE SET
          view=excluded.view,selected=excluded.selected,filter=excluded.filter,updated_at=excluded.updated_at
        """, (self.env.name, view, selected, query, time.time()))
        self.db.commit()

    def rename(self, row: sqlite3.Row, name: str) -> sqlite3.Row:
        if not NAME_RE.fullmatch(name):
            raise ValueError("name must be 3-80 lowercase letters, digits or hyphens")
        self.runtime.rename(row["rmux_session"], name)
        updated = self.update(row, name=name, rmux_session=name)
        self.event(updated, "runtime.renamed", {"previous": row["name"]})
        return updated

    def archive(self, row: sqlite3.Row) -> sqlite3.Row:
        updated = self.update(row, status="archived", archived_at=time.time())
        self.event(updated, "runtime.archived")
        return updated

    def terminate(self, row: sqlite3.Row) -> sqlite3.Row:
        self.runtime.terminate(row["rmux_session"])
        updated = self.update(row, status="interrupted", exit_code=-15)
        self.event(updated, "runtime.terminated")
        return updated

    def restart_frontend(self, row: sqlite3.Row) -> sqlite3.Row:
        command = json.loads(row["command_json"] or "[]")
        if not command:
            command = default_command(row["type"], row["native_session"])
        if self.runtime.has_session(row["rmux_session"]):
            self.runtime.respawn(row["rmux_session"], row["cwd"], command)
        else:
            self.runtime.create(row["rmux_session"], row["type"], Path(row["cwd"]), self.env.name, command)
        updated = self.update(row, status="running", exit_code=None)
        self.event(updated, "runtime.frontend_restarted", {"native_session": row["native_session"]})
        return updated

    def fork(self, row: sqlite3.Row, name: str) -> sqlite3.Row:
        native = row["native_session"]
        if row["type"] == "codex" and native:
            command = ["codex", "fork", native]
        elif row["type"] == "claude" and native:
            command = ["claude", "--resume", native, "--fork-session"]
        elif row["type"] == "hermes" and native:
            # Hermes has resume but no documented fork flag. Start a new lineage
            # while retaining the parent link in Agentik metadata.
            command = ["hermes", "--in", row["cwd"]]
            native = None
        else:
            command = default_command(row["type"])
            native = None
        return self.create(name=name, kind=row["type"], cwd=Path(row["cwd"]),
                           client=row["client"], project=row["project"],
                           mission=row["mission"], parent=row["id"],
                           command=command, native_session=native)

    def reconcile(self) -> tuple[int, list[str]]:
        proc = self.runtime.panes()
        live_info: dict[str, list[tuple[bool, float, str]]] = {}
        if proc.returncode == 0:
            for line in proc.stdout.splitlines():
                parts = line.split("|", 3)
                if len(parts) != 4:
                    continue
                try:
                    activity = float(parts[2] or 0)
                except ValueError:
                    activity = 0
                live_info.setdefault(parts[0], []).append((parts[1] == "1", activity, parts[3]))
        live = set(live_info)
        managed = {row["rmux_session"] for row in self.rows(include_archived=True)}
        changed = 0
        now = time.time()
        for row in self.rows():
            desired = row["status"]
            if row["rmux_session"] not in live and desired not in {"complete", "failed", "archived"}:
                desired = "interrupted"
            elif row["rmux_session"] in live and desired not in {"complete", "archived"}:
                panes = live_info[row["rmux_session"]]
                if panes and all(dead for dead, _, _ in panes):
                    desired = "failed"
                else:
                    last = max((activity for _, activity, _ in panes), default=0)
                    age = now - last if last else 999999
                    desired = "working" if age < 15 else "running" if age < 300 else "idle"
            if desired != row["status"]:
                self.db.execute("UPDATE runtime_sessions SET status=?,last_activity=? WHERE id=?", (desired, now, row["id"]))
                changed += 1
        self.db.commit()
        return changed, sorted(live - managed)


def default_command(kind: str, native_session: str | None = None) -> list[str]:
    commands = {
        "hermes": ["hermes", "--resume", native_session] if native_session else ["hermes"],
        "claude": ["claude", "--resume", native_session] if native_session else ["claude"],
        "codex": ["codex", "resume", native_session] if native_session else ["codex"],
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


def mcp_inventory(env: Environment) -> list[dict[str, str]]:
    """Return redacted MCP identity/state from Hermes config."""
    path = env.home / ".hermes" / "config.yaml"
    try:
        config = yaml.safe_load(path.read_text(encoding="utf-8")) or {}
    except (OSError, ValueError, yaml.YAMLError):
        return []
    servers = config.get("mcp_servers") if isinstance(config, dict) else {}
    if not isinstance(servers, dict):
        return []
    result = []
    for name, raw in sorted(servers.items()):
        entry = raw if isinstance(raw, dict) else {}
        transport = "http" if entry.get("url") else "stdio" if entry.get("command") else "unknown"
        result.append({"name": str(name), "transport": transport,
                       "status": "disabled" if entry.get("enabled") is False else "configured"})
    return result


def skill_inventory(env: Environment) -> list[dict[str, str]]:
    """List skill identities and sources without reading skill contents."""
    roots = ((env.home / ".hermes/skills", "hermes"), (env.home / ".claude/skills", "claude"),
             (env.home / ".codex/skills", "codex"))
    found: dict[tuple[str, str], dict[str, str]] = {}
    for root, source in roots:
        if not root.is_dir():
            continue
        for manifest in root.glob("*/SKILL.md"):
            found[(manifest.parent.name, source)] = {
                "name": manifest.parent.name, "source": source, "status": "installed",
            }
    return sorted(found.values(), key=lambda item: (item["name"], item["source"]))


def _prompt(stdscr: "curses._CursesWindow", label: str) -> str:
    height, width = stdscr.getmaxyx()
    curses.echo(); curses.curs_set(1)
    stdscr.move(height - 1, 0); stdscr.clrtoeol(); stdscr.addnstr(height - 1, 0, label, width - 1)
    value = stdscr.getstr(height - 1, len(label), max(1, width - len(label) - 1)).decode(errors="replace").strip()
    curses.noecho(); curses.curs_set(0)
    return value


def _notice(stdscr: "curses._CursesWindow", message: str) -> None:
    height, width = stdscr.getmaxyx()
    stdscr.move(height - 1, 0); stdscr.clrtoeol(); stdscr.addnstr(height - 1, 0, message, width - 1)
    stdscr.getch()


def _create_from_tui(stdscr: "curses._CursesWindow", registry: RuntimeRegistry,
                     kind: str, cwd: Path | None = None, project: str | None = None) -> None:
    name = _prompt(stdscr, f"New {kind} session name: ")
    if not name:
        return
    try:
        registry.create(name=name, kind=kind, cwd=cwd or registry.env.home,
                        project=project, command=default_command(kind))
    except Exception as exc:
        _notice(stdscr, f"Error: {exc}")


def _safe_add(stdscr: "curses._CursesWindow", y: int, x: int, value: object,
              limit: int, attr: int = 0) -> None:
    height, width = stdscr.getmaxyx()
    if 0 <= y < height and 0 <= x < width and limit > 0:
        try:
            stdscr.addnstr(y, x, str(value), min(limit, width - x - 1), attr)
        except curses.error:
            pass


def tui(stdscr: "curses._CursesWindow", registry: RuntimeRegistry) -> None:
    curses.curs_set(0)
    selected, query, view = 0, "", "sessions"
    views = {ord("1"): "sessions", ord("2"): "projects", ord("3"): "agents",
             ord("4"): "os", ord("5"): "mcp", ord("6"): "skills", ord("s"): "system"}
    while True:
        registry.reconcile()
        session_rows = filtered(registry.rows(), query)
        if view == "projects":
            rows: list[dict[str, object] | sqlite3.Row] = canonical_projects(registry.env)
        elif view == "agents":
            rows = [row for row in session_rows if row["type"] in {"hermes", "claude", "codex", "agent", "workflow"}]
        elif view == "sessions":
            rows = session_rows
        elif view in {"mcp", "skills"}:
            capabilities = mcp_inventory(registry.env) if view == "mcp" else skill_inventory(registry.env)
            if not capabilities:
                _safe_add(stdscr, 5, 0, f"No {view.upper()} entries configured in this environment", width - 1)
            for idx, item in enumerate(capabilities[:visible]):
                detail = item.get("transport") or item.get("source") or ""
                _safe_add(stdscr, 5 + idx, 0, f"● {item['name']:<32} {detail:<10} {item['status']}", width - 1)
        else:
            rows = []
        selected = max(0, min(selected, max(0, len(rows) - 1)))
        stdscr.erase()
        height, width = stdscr.getmaxyx()
        header = f" AGK · {registry.env.name.upper()} · CONTROL MODE "
        stdscr.addnstr(0, 0, header + " " * max(1, width - len(header) - 10) + "● ONLINE", width - 1, curses.A_BOLD)
        stdscr.addnstr(1, 0, " 1 Session  2 Projects  3 Agents  4 OS  5 MCP  6 Skills  ──  s System  , Settings  ? Help ", width - 1)
        stdscr.addnstr(3, 0, view.upper() + (f"  / {query}" if query else ""), width - 1, curses.A_BOLD)
        if view in {"sessions", "agents"}:
            for idx, row in enumerate(rows[: max(0, height - 9)]):
                marker = "▶" if idx == selected else " "
                state = {"running": "●", "working": "◉", "idle": "○", "waiting": "◌", "failed": "×", "complete": "✓"}.get(str(row["status"]), "!")
                context = row["project"] or row["client"] or registry.env.name
                label = f"{marker} {state} {str(row['name']):<38} {str(row['type']).upper():<9} {str(context):<18} {str(row['status']).upper()}"
                stdscr.addnstr(5 + idx, 0, label, width - 1, curses.A_REVERSE if idx == selected else 0)
        elif view == "projects":
            for idx, row in enumerate(rows[: max(0, height - 9)]):
                linked = sum(1 for item in registry.rows() if item["project"] in {row["id"], row["slug"]})
                label = f"{'▶' if idx == selected else ' '} {'●' if row['status']=='active' else '○'} {str(row['name']):<42} {linked} sessions · {row['status']}"
                stdscr.addnstr(5 + idx, 0, label, width - 1, curses.A_REVERSE if idx == selected else 0)
        elif view == "os":
            stdscr.addnstr(5, 0, "No Operative Systems installed. Registry is ready; packages are never invented.", width - 1)
        elif view in {"mcp", "skills"}:
            stdscr.addnstr(5, 0, f"{view.upper()} capabilities are managed by Hermes in the current isolated environment.", width - 1)
        elif view == "system":
            stdscr.addnstr(5, 0, f"Machine AGK Core · Environment {registry.env.name.upper()} · RMUX {run('rmux','-V').stdout.strip()}", width - 1)
        footer = "↑↓/jk Navigate  Enter Open  n New  / Search  Ctrl-p Palette  R Restart  f Fork  A Archive  K Kill  q Quit"
        stdscr.addnstr(height - 2, 0, footer, width - 1)
        stdscr.refresh()
        key = stdscr.getch()
        if key == ord("q"):
            return
        if key == 27:
            view, query, selected = "sessions", "", 0
        elif key in views:
            view, selected = views[key], 0
        elif key in (curses.KEY_DOWN, ord("j")) and rows:
            selected = min(len(rows) - 1, selected + 1)
        elif key in (curses.KEY_UP, ord("k")) and rows:
            selected = max(0, selected - 1)
        elif key in (10, 13) and rows:
            row = rows[selected]
            if view in {"sessions", "agents"}:
                curses.endwin(); subprocess.run(["rmux", "attach-session", "-t", str(row["rmux_session"])]); stdscr.refresh()
            elif view == "projects":
                related = [item for item in registry.rows() if item["project"] in {row["id"], row["slug"]}]
                if related:
                    curses.endwin(); subprocess.run(["rmux", "attach-session", "-t", related[0]["rmux_session"]]); stdscr.refresh()
        elif key == ord("/"):
            query, selected = _prompt(stdscr, "Search/filter: "), 0
        elif key == 16:  # Ctrl-p command palette / quick switcher
            palette = _prompt(stdscr, "> ")
            if palette.startswith("open "):
                query, view, selected = palette[5:].strip(), "sessions", 0
            elif palette.startswith("new ") and palette[4:].strip() in {"hermes", "claude", "codex", "shell"}:
                _create_from_tui(stdscr, registry, palette[4:].strip())
            else:
                query, view, selected = palette, "sessions", 0
        elif key in (ord("h"), ord("c"), ord("x"), ord("t")) and view in {"sessions", "projects"}:
            kind = {ord("h"): "hermes", ord("c"): "claude", ord("x"): "codex", ord("t"): "shell"}[key]
            project = rows[selected] if view == "projects" and rows else None
            _create_from_tui(stdscr, registry, kind,
                             Path(str(project["path"])) if project and project["path"] else None,
                             str(project["id"]) if project else None)
        elif key == ord("n"):
            choice = _prompt(stdscr, "New [h]ermes [c]laude code[x] [t]erminal: ").lower()[:1]
            kind = {"h": "hermes", "c": "claude", "x": "codex", "t": "shell"}.get(choice)
            if kind: _create_from_tui(stdscr, registry, kind)
        elif view in {"sessions", "agents"} and rows and key == ord("i"):
            stdscr.erase(); stdscr.addnstr(0, 0, json.dumps(dict(rows[selected]), indent=2), max(1, height * width - 2)); _notice(stdscr, "Press any key")
        elif view in {"sessions", "agents"} and rows and key == ord("R"):
            registry.restart_frontend(rows[selected])
        elif view == "sessions" and rows and key == ord("f"):
            name = _prompt(stdscr, "Fork name: ")
            if name:
                try: registry.fork(rows[selected], name)
                except Exception as exc: _notice(stdscr, f"Error: {exc}")
        elif view in {"sessions", "agents"} and rows and key == ord("A"):
            registry.archive(rows[selected])
        elif view in {"sessions", "agents"} and rows and key == ord("K"):
            if _prompt(stdscr, f"Kill {rows[selected]['name']}? type YES: ") == "YES": registry.terminate(rows[selected])
        elif key == ord("?"):
            _notice(stdscr, "CONTROL MODE. Enter attaches; Ctrl-b d detaches. q exits UI only. Uppercase K kills after confirmation.")


def tui_v2(stdscr: "curses._CursesWindow", registry: RuntimeRegistry) -> None:
    """AGK V2 control surface, informed by (but not copied from) Omega UX."""
    curses.curs_set(0); curses.mousemask(curses.ALL_MOUSE_EVENTS); stdscr.keypad(True)
    saved = registry.load_ui()
    view, query = str(saved.get("view") or "sessions"), str(saved.get("filter") or "")
    selected, wanted = 0, saved.get("selected")
    focus, fullscreen, scroll, follow, last_tab = "list", False, 0, True, 0.0
    hotkeys = {ord("1"): "sessions", ord("2"): "projects", ord("3"): "agents", ord("4"): "os",
               ord("5"): "mcp", ord("6"): "skills", ord("s"): "system", ord(","): "settings", ord("?"): "help"}
    while True:
        registry.reconcile(); sessions = filtered(registry.rows(), query)
        if view == "projects": rows: list[dict[str, object] | sqlite3.Row] = canonical_projects(registry.env)
        elif view == "agents": rows = [r for r in sessions if r["type"] in {"hermes", "claude", "codex", "agent", "workflow"}]
        elif view == "sessions": rows = sessions
        else: rows = []
        if wanted and rows:
            selected = next((i for i, r in enumerate(rows) if str(r.get("id") if isinstance(r, dict) else r["id"]) == wanted), selected); wanted = None
        selected = min(max(0, selected), max(0, len(rows) - 1)); current = rows[selected] if rows else None
        current_id = str(current.get("id") if isinstance(current, dict) else current["id"]) if current else None
        registry.save_ui(view, current_id, query)
        stdscr.erase(); height, width = stdscr.getmaxyx(); mode = layout_mode(width, height)
        left, right = pane_widths(width, mode, fullscreen and focus == "detail")
        if fullscreen and focus == "list": left, right = width, 0
        _safe_add(stdscr, 0, 0, f" AGK · {registry.env.name.upper()} · CONTROL", width - 1, curses.A_BOLD)
        _safe_add(stdscr, 0, max(30, width - 11), "● ONLINE", 10, curses.A_BOLD)
        nav = " 1 Session  2 Projects  3 Agents │ 4 OS  5 MCP  6 Skills │ s System  , Settings  ? Help"
        _safe_add(stdscr, 1, 0, nav if mode != "compact" else " 1 Session  2 Projects  3 Agents  ···", width - 1)
        crumb = registry.env.name.upper()
        if current is not None and not isinstance(current, dict): crumb += f" › {current['client'] or '—'} › {current['project'] or '—'} › {current['name']}"
        _safe_add(stdscr, 2, 0, crumb, width - 1, curses.A_DIM); _safe_add(stdscr, 4, 0, view.upper() + (f"  / {query}" if query else ""), max(1, left - 1), curses.A_BOLD)
        list_limit, visible = (max(1, left - 2) if right else width - 1), max(1, height - 9)
        start = max(0, selected - visible + 1)
        if view in {"sessions", "agents"}:
            for screen_i, row in enumerate(rows[start:start + visible]):
                idx = start + screen_i; icon = {"running": "●", "working": "◉", "idle": "○", "waiting": "◌", "failed": "×", "complete": "✓"}.get(str(row["status"]), "!")
                marker = "▶" if idx == selected else " "; context = row["project"] or row["client"] or registry.env.name
                label = f"{marker} {icon} {row['name']} · {str(row['type']).upper()}" if mode == "compact" else f"{marker} {icon} {str(row['name']):<28} {str(row['type']).upper():<8} {str(context):<12} {str(row['status']).upper()}"
                _safe_add(stdscr, 5 + screen_i, 0, label, list_limit, curses.A_REVERSE if idx == selected and focus == "list" else 0)
        elif view == "projects":
            for screen_i, row in enumerate(rows[:visible]):
                linked = sum(1 for item in registry.rows() if item["project"] in {row["id"], row["slug"]})
                _safe_add(stdscr, 5 + screen_i, 0, f"{'▶' if screen_i == selected else ' '} {row['name']} · {linked} sessions · {row['status']}", list_limit, curses.A_REVERSE if screen_i == selected and focus == "list" else 0)
        else:
            messages = {"os": "Zero Operative Systems installed · registry ready · no package is invented", "mcp": "MCP inventory is scoped to this Hermes environment", "skills": "Skills are capabilities; OS remain separate methodologies", "system": f"AGK Core · {registry.env.name.upper()} · {run('rmux','-V').stdout.strip()}", "settings": "Persistent Control Mode · RMUX runtime · secrets never displayed", "help": "Tab focus · Tab Tab expand · Enter attach · Ctrl-b d detach · q leaves Control only"}
            _safe_add(stdscr, 5, 0, messages.get(view, ""), width - 1)
        max_scroll = 0
        if right and current is not None and not isinstance(current, dict) and view in {"sessions", "agents"}:
            x = left + 1; _safe_add(stdscr, 4, x, f"{str(current['name']).upper()} · LIVE OUTPUT", right - 1, curses.A_BOLD)
            content = registry.runtime.snapshot(str(current["rmux_session"]), visible); max_scroll = max(0, len(content) - visible)
            if follow: scroll = max_scroll
            scroll = min(max(0, scroll), max_scroll)
            for n, line in enumerate(content[scroll:scroll + visible]): _safe_add(stdscr, 5 + n, x, line, right - 1)
            _safe_add(stdscr, height - 3, x, "LIVE ↓" if follow else f"↑ SCROLLBACK · {max_scroll-scroll} lines from live", right - 1, curses.A_BOLD)
        footer = "↑↓ Navigate  Enter Open  Tab Focus  Tab·Tab Expand  n New  / Search  Ctrl-p Palette  q Quit"
        _safe_add(stdscr, height - 2, 0, footer if mode != "compact" else "↑↓ Enter  n New  / Search  ? Help  q Quit", width - 1); stdscr.refresh(); key = stdscr.getch()
        if key == ord("q"): return
        if key == 27: view, query, selected, focus, fullscreen = "sessions", "", 0, "list", False
        elif key in hotkeys: view, selected, focus, fullscreen = hotkeys[key], 0, "list", False
        elif key in (9, curses.KEY_BTAB):
            now = time.monotonic()
            if key == 9 and (now - last_tab) * 1000 < TAB_DOUBLE_MS: fullscreen, last_tab = not fullscreen, 0.0
            elif mode == "wide" and view in {"sessions", "agents", "projects", "os", "settings"}: focus, last_tab = ("detail" if focus == "list" else "list"), now
            else: view, selected, focus, fullscreen, last_tab = cycle_view(view, key == curses.KEY_BTAB), 0, "list", False, now
        elif key in (curses.KEY_DOWN, ord("j")) and rows:
            if focus == "detail" and right: scroll, follow = min(max_scroll, scroll + 1), scroll + 1 >= max_scroll
            else: selected = min(len(rows) - 1, selected + 1)
        elif key in (curses.KEY_UP, ord("k")) and rows:
            if focus == "detail" and right: scroll, follow = max(0, scroll - 1), False
            else: selected = max(0, selected - 1)
        elif key == curses.KEY_PPAGE and right: scroll, follow = max(0, scroll - visible), False
        elif key == curses.KEY_NPAGE and right: scroll, follow = min(max_scroll, scroll + visible), scroll + visible >= max_scroll
        elif key == ord("g") and focus == "detail": scroll, follow = 0, False
        elif key == ord("G") and focus == "detail": scroll, follow = max_scroll, True
        elif key == curses.KEY_MOUSE:
            try:
                _, mouse_x, mouse_y, _, mouse_state = curses.getmouse()
                if mouse_state & curses.BUTTON4_PRESSED:
                    if right and mouse_x > left: focus, scroll, follow = "detail", max(0, scroll - 3), False
                    elif rows: focus, selected = "list", max(0, selected - 1)
                elif mouse_state & curses.BUTTON5_PRESSED:
                    if right and mouse_x > left: focus, scroll, follow = "detail", min(max_scroll, scroll + 3), scroll + 3 >= max_scroll
                    elif rows: focus, selected = "list", min(len(rows) - 1, selected + 1)
                elif mouse_state & curses.BUTTON1_CLICKED and 5 <= mouse_y < 5 + visible:
                    if right and mouse_x > left: focus = "detail"
                    elif rows:
                        focus = "list"; selected = min(len(rows) - 1, start + mouse_y - 5)
            except curses.error:
                pass
        elif key in (10, 13) and current is not None and view in {"sessions", "agents"}:
            curses.endwin(); subprocess.run(["rmux", "attach-session", "-t", str(current["rmux_session"])]); stdscr.refresh()
        elif key == ord("/"): query, selected = _prompt(stdscr, "Search/filter: "), 0
        elif key == 16:
            palette = _prompt(stdscr, "> ")
            if palette.startswith("open "): query, view, selected = palette[5:].strip(), "sessions", 0
            elif palette.startswith("new ") and palette[4:].strip() in {"hermes", "claude", "codex", "shell"}: _create_from_tui(stdscr, registry, palette[4:].strip())
            else: query, view, selected = palette, "sessions", 0
        elif key in (ord("h"), ord("c"), ord("x"), ord("t")) and view in {"sessions", "projects"}:
            kind = {ord("h"): "hermes", ord("c"): "claude", ord("x"): "codex", ord("t"): "shell"}[key]; project = current if view == "projects" and isinstance(current, dict) else None
            _create_from_tui(stdscr, registry, kind, Path(str(project["path"])) if project and project["path"] else None, str(project["id"]) if project else None)
        elif key == ord("n"):
            choice = _prompt(stdscr, "New [h]ermes [c]laude code[x] [t]erminal: ").lower()[:1]; kind = {"h": "hermes", "c": "claude", "x": "codex", "t": "shell"}.get(choice)
            if kind: _create_from_tui(stdscr, registry, kind)
        elif view in {"sessions", "agents"} and current is not None and key == ord("R"): registry.restart_frontend(current)
        elif view == "sessions" and current is not None and key == ord("f"):
            name = _prompt(stdscr, "Fork name: ")
            if name:
                try: registry.fork(current, name)
                except Exception as exc: _notice(stdscr, f"Error: {exc}")
        elif view in {"sessions", "agents"} and current is not None and key == ord("A"): registry.archive(current)
        elif view in {"sessions", "agents"} and current is not None and key == ord("K") and _prompt(stdscr, f"Kill {current['name']}? type YES: ") == "YES": registry.terminate(current)


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


def canonical_projects(env: Environment) -> list[dict[str, object]]:
    db_path = env.home / ".agentik" / "control.db"
    if not db_path.exists():
        return []
    db = sqlite3.connect(f"file:{db_path}?mode=ro", uri=True)
    db.row_factory = sqlite3.Row
    try:
        return [dict(row) for row in db.execute(
            "SELECT id,slug,name,status,path,parent_id FROM objects "
            "WHERE environment=? AND kind='project' ORDER BY updated_at DESC",
            (env.name,),
        )]
    finally:
        db.close()


def require_runtime(registry: RuntimeRegistry, target: str) -> sqlite3.Row:
    row = registry.get(target)
    if row is None:
        raise SystemExit(f"Runtime session not found: {target}")
    return row


def main() -> int:
    parser = argparse.ArgumentParser(prog="agk")
    sub = parser.add_subparsers(dest="command")
    sub.add_parser("status"); sub.add_parser("doctor"); sub.add_parser("sessions")
    new = sub.add_parser("new")
    new.add_argument("type", choices=sorted(TYPES)); new.add_argument("name")
    new.add_argument("--cwd", type=Path); new.add_argument("--client"); new.add_argument("--project"); new.add_argument("--mission"); new.add_argument("--native-session")
    resume = sub.add_parser("resume"); resume.add_argument("target", nargs="?")
    open_p = sub.add_parser("open"); open_p.add_argument("target")
    agent = sub.add_parser("agent"); agent.add_argument("type", choices=("hermes", "claude", "codex")); agent.add_argument("name", nargs="?")
    for action in ("info", "archive", "kill", "restart"):
        item = sub.add_parser(action); item.add_argument("target")
    rename = sub.add_parser("rename"); rename.add_argument("target"); rename.add_argument("name")
    fork = sub.add_parser("fork"); fork.add_argument("target"); fork.add_argument("name")
    sub.add_parser("reconcile")
    sub.add_parser("projects"); sub.add_parser("agents"); sub.add_parser("os"); sub.add_parser("mcp"); sub.add_parser("skills"); sub.add_parser("system")
    args = parser.parse_args()
    env = Environment.current(); registry = RuntimeRegistry(env); registry.reconcile()
    if args.command is None:
        if not sys.stdin.isatty() or not sys.stdout.isatty():
            print("agk Control Shell requires a TTY; use `agk status` for non-interactive use.", file=sys.stderr); return 2
        curses.wrapper(tui_v2, registry); return 0
    if args.command in {"status", "sessions"}:
        print(f"AGENTIK OS · {env.name.upper()}\nRMUX {run('rmux','-V').stdout.strip()}")
        for row in registry.rows(): print(f"{row['status']:<12} {row['type']:<9} {row['name']}  {row['project'] or '—'}")
        return 0
    if args.command == "doctor": return doctor(env, registry)
    if args.command == "new":
        row = registry.create(name=args.name, kind=args.type, cwd=args.cwd or env.home,
                              client=args.client, project=args.project, mission=args.mission,
                              command=default_command(args.type, args.native_session),
                              native_session=args.native_session)
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
    if args.command == "info":
        print(json.dumps(dict(require_runtime(registry, args.target)), indent=2, sort_keys=True)); return 0
    if args.command == "archive":
        row = registry.archive(require_runtime(registry, args.target)); print(f"Archived {row['name']}"); return 0
    if args.command == "kill":
        if not sys.stdin.isatty() or input(f"Kill runtime {args.target}? History remains. [y/N] ").lower() != "y":
            print("Cancelled."); return 1
        row = registry.terminate(require_runtime(registry, args.target)); print(f"Stopped {row['name']}"); return 0
    if args.command == "restart":
        row = registry.restart_frontend(require_runtime(registry, args.target)); print(f"Restarted frontend {row['name']}"); return 0
    if args.command == "rename":
        row = registry.rename(require_runtime(registry, args.target), args.name); print(f"Renamed to {row['name']}"); return 0
    if args.command == "fork":
        row = registry.fork(require_runtime(registry, args.target), args.name); print(f"Forked {row['name']} from {row['parent_session_id']}"); return 0
    if args.command == "reconcile":
        changed, unmanaged = registry.reconcile(); print(f"Updated: {changed}\nUnmanaged: {', '.join(unmanaged) if unmanaged else 'none'}"); return 0
    if args.command == "projects":
        projects = canonical_projects(env)
        if projects:
            for row in projects: print(f"{row['status']:<10} {row['name']} · {row['id']} · {row['path'] or '—'}")
        else:
            for row in sorted(env.projects.glob("*")) if env.projects.exists() else []: print(row.name)
        return 0
    if args.command == "agents":
        for row in registry.rows():
            if row["type"] in {"hermes", "claude", "codex", "agent"}: print(f"{row['status']:<12} {row['type']:<8} {row['name']}")
        return 0
    if args.command == "os":
        index = Path("/opt/agentik/os-registry/state/index.json")
        data = json.loads(index.read_text(encoding="utf-8")) if index.exists() else {"packages": []}
        print(f"Installed Operative Systems: {len(data.get('packages', []))}"); return 0
    if args.command == "mcp":
        items = mcp_inventory(env); print(f"MCP · {env.name.upper()} · {len(items)} configured")
        for item in items: print(f"{item['status']:<10} {item['name']} · {item['transport']}")
        return 0
    if args.command == "skills":
        items = skill_inventory(env); print(f"SKILLS · {env.name.upper()} · {len(items)} installed")
        for item in items: print(f"{item['status']:<10} {item['name']} · {item['source']}")
        return 0
    if args.command == "system":
        print(f"SYSTEM · {env.name.upper()} · {run('rmux','-V').stdout.strip()}"); return 0
    return 2


if __name__ == "__main__":
    raise SystemExit(main())
