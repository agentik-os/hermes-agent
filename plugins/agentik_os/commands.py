"""Canonical object/action command router for Agentik OS."""

from __future__ import annotations

import json
import hashlib
import shlex
from pathlib import Path
from typing import Callable

import yaml

from hermes_cli.config import read_raw_config

from .paths import (
    PathResolver, create_client_layout, create_mission_layout,
    create_project_layout, normalize_slug,
)
from .store import ControlObject, ControlStore
from .operator import COMMANDS as OPERATOR_COMMANDS, OperatorCommandService
from .domain import DESCRIPTIONS as DOMAIN_DESCRIPTIONS, DOMAIN_COMMANDS, DomainCommandService
from .os_registry import OSRegistry, resolve_assignments


DESCRIPTIONS = {
    "home": "Return to the current Agentik OS environment home context.",
    "active": "Show active context and work.",
    "client": "Create, list, open and inspect clients.",
    "project": "Create, list, open and inspect projects.",
    "mission": "Create, list, open and manage missions.",
    "task": "Create, list, open and manage tasks.",
    "run": "List and inspect execution runs.",
    "os": "Inspect the Operative System registry and active assignments.",
    **OperatorCommandService.descriptions,
    **DOMAIN_DESCRIPTIONS,
}


class AgentikCommandService:
    def __init__(self, environment: str, store: ControlStore, resolver: PathResolver):
        self.environment = environment
        self.data_environment = "mission" if environment == "collective" else environment
        self.store = store
        self.resolver = resolver
        self.operator = OperatorCommandService() if environment == "operator" else None
        self.domain = DomainCommandService(environment, store)
        common = ["home", "active", "os"]
        if environment in {"mission", "collective"}:
            common += ["client", "project", "mission", "task", "run"]
        elif environment in {"agentik", "private"}:
            common += ["project", "mission", "task", "run"]
        elif environment == "operator":
            common += list(OPERATOR_COMMANDS)
        common += list(DOMAIN_COMMANDS.get(environment, ()))
        self.command_names = tuple(common)

    @classmethod
    def from_runtime(cls) -> "AgentikCommandService":
        cfg = read_raw_config() or {}
        environment = str((cfg.get("runtime_identity") or {}).get("environment_id") or "unknown")
        home = Path.home()
        return cls(environment, ControlStore(home / ".agentik" / "control.db"),
                   PathResolver.current(environment))

    def description(self, name: str) -> str:
        return DESCRIPTIONS[name]

    def handler(self, command: str) -> Callable[[str], str]:
        return lambda raw_args="": self.dispatch(command, raw_args)

    @property
    def context_key(self) -> str:
        from hermes_cli.plugins import get_plugin_command_invocation_context

        invocation = get_plugin_command_invocation_context()
        if not invocation:
            return f"environment:{self.environment}:surface:local"
        canonical = json.dumps(invocation, sort_keys=True, separators=(",", ":"))
        digest = hashlib.sha256(canonical.encode("utf-8")).hexdigest()[:24]
        surface = str(invocation.get("surface") or "unknown")
        return f"environment:{self.environment}:surface:{surface}:binding:{digest}"

    def context(self) -> dict:
        return self.store.context(self.context_key, self.data_environment)

    def dispatch(self, command: str, raw_args: str) -> str:
        try:
            argv = shlex.split(raw_args)
        except ValueError as exc:
            return f"Invalid arguments: {exc}"
        try:
            if command == "home":
                self.store.clear_context(self.context_key, self.data_environment)
                return f"Home context restored: {self.environment}."
            if command == "active":
                return self._active()
            if command == "os":
                return self._os(argv)
            if self.operator and command in OPERATOR_COMMANDS:
                return self.operator.dispatch(command, argv)
            if command in DOMAIN_COMMANDS.get(self.environment, ()):
                return self.domain.dispatch(command, argv)
            return self._object(command, argv)
        except (ValueError, PermissionError) as exc:
            return f"Error: {exc}"
        except Exception as exc:
            return f"Agentik OS command failed safely: {exc}"

    def _active(self) -> str:
        ctx = self.context()
        lines = [f"AGENTIK OS · {self.environment.upper()}", "", "ACTIVE CONTEXT"]
        for kind in ("client", "project", "mission", "task"):
            object_id = ctx.get(f"{kind}_id")
            obj = self.store.get(self.data_environment, kind, object_id) if object_id else None
            lines.append(f"{kind.title()}: {obj.name} ({obj.id})" if obj else f"{kind.title()}: —")
        active_tasks = [o for o in self.store.list(self.data_environment, "task") if o.status in {"active", "running", "paused"}]
        active_runs = [o for o in self.store.list(self.data_environment, "run") if o.status in {"active", "running", "paused"}]
        lines += ["", f"Active tasks: {len(active_tasks)}", f"Active runs: {len(active_runs)}"]
        return "\n".join(lines)

    def _object(self, kind: str, argv: list[str]) -> str:
        action = argv[0].lower() if argv else "list"
        rest = argv[1:]
        if action == "new":
            if not rest:
                return f"Usage: /{kind} new <name>"
            return self._create(kind, " ".join(rest))
        if action == "list":
            return self._list(kind)
        if action in {"open", "status", "current", "info"}:
            return self._inspect(kind, action, rest)
        transitions = {
            "start": "running", "pause": "paused", "resume": "running",
            "complete": "completed", "cancel": "cancelled", "archive": "archived",
            "reactivate": "active",
        }
        if action in transitions:
            if not rest:
                return f"Usage: /{kind} {action} <id-or-slug>"
            obj = self.store.get(self.data_environment, kind, rest[0])
            if not obj:
                return f"{kind.title()} not found: {rest[0]}"
            obj = self.store.transition(obj, transitions[action])
            return f"{kind.title()} {obj.id} → {obj.status}."
        return f"Unknown action `{action}` for /{kind}. Supported: new, list, open, current, status."

    def _parent(self, kind: str) -> ControlObject | None:
        parent_kind = {"project": "client", "mission": "project", "task": "mission", "run": "task"}.get(kind)
        if not parent_kind:
            return None
        object_id = self.context().get(f"{parent_kind}_id")
        return self.store.get(self.data_environment, parent_kind, object_id) if object_id else None

    def _create(self, kind: str, name: str) -> str:
        slug = normalize_slug(name)
        parent = self._parent(kind)
        if kind in {"project", "mission", "task", "run"} and not parent:
            required = {"project": "client" if self.data_environment == "mission" else None,
                        "mission": "project", "task": "mission", "run": "task"}[kind]
            if required:
                raise ValueError(f"open a {required} before creating a {kind}")
        path: Path | None = None
        if kind == "client":
            path = self.resolver.client(slug)
        elif kind == "project":
            client = self.store.get(self.data_environment, "client", self.context().get("client_id")) if self.context().get("client_id") else None
            path = self.resolver.project(slug, client_slug=client.slug if client else None)
        elif kind == "mission" and parent and parent.path:
            path = self.resolver.mission(slug, project_path=Path(parent.path))
        if path and path.exists():
            raise ValueError(f"filesystem target already exists: {path}")
        obj = self.store.create(environment=self.data_environment, kind=kind, slug=slug,
                                name=name, parent_id=parent.id if parent else None,
                                status="planned" if kind in {"mission", "task", "run"} else "active",
                                path=str(path) if path else None)
        try:
            if kind == "client" and path:
                create_client_layout(path, object_id=obj.id, name=name, slug=slug)
            elif kind == "project" and path:
                create_project_layout(path, object_id=obj.id, name=name, slug=slug)
            elif kind == "mission" and path:
                create_mission_layout(path, object_id=obj.id, name=name)
        except Exception:
            # The database event makes the failure auditable; mark the object
            # cancelled so it can never masquerade as a successful provision.
            self.store.transition(obj, "cancelled")
            raise
        self._open(obj)
        suffix = f"\nPath: {path}" if path else ""
        return f"{kind.title()} created: {obj.name} ({obj.id}){suffix}"

    def _scope_parent_id(self, kind: str) -> str | None:
        return self._parent(kind).id if self._parent(kind) else None

    def _list(self, kind: str) -> str:
        objects = self.store.list(self.data_environment, kind, self._scope_parent_id(kind))
        if not objects:
            return f"No {kind}s in the current authorized scope."
        lines = [f"{kind.upper()}S"]
        lines += [f"{'●' if o.status in {'active','running'} else '○'} {o.name} · {o.id} · {o.status}" for o in objects]
        return "\n".join(lines)

    def _inspect(self, kind: str, action: str, rest: list[str]) -> str:
        if action == "current" or not rest:
            object_id = self.context().get(f"{kind}_id")
            obj = self.store.get(self.data_environment, kind, object_id) if object_id else None
        else:
            obj = self.store.get(self.data_environment, kind, rest[0])
        if not obj:
            return f"No current {kind}." if not rest else f"{kind.title()} not found: {rest[0]}"
        if action == "open":
            self._open(obj)
            return f"Opened {kind}: {obj.name} ({obj.id})."
        return "\n".join([
            f"{kind.upper()} · {obj.name}", f"ID: {obj.id}", f"Slug: {obj.slug}",
            f"Status: {obj.status}", f"Parent: {obj.parent_id or '—'}", f"Path: {obj.path or '—'}",
        ])

    def _open(self, obj: ControlObject) -> None:
        clears = {"client": {"project_id": None, "mission_id": None, "task_id": None},
                  "project": {"mission_id": None, "task_id": None},
                  "mission": {"task_id": None}, "task": {}, "run": {}}
        self.store.set_context(self.context_key, self.data_environment,
                               **{f"{obj.kind}_id": obj.id}, **clears.get(obj.kind, {}))

    def _os(self, argv: list[str]) -> str:
        action = argv[0].lower() if argv else "list"
        registry = Path("/opt/agentik/os-registry")
        registry_api = OSRegistry(registry)
        packages = registry_api.packages()
        assignment_path = (Path("/etc/agentik/operator-os/assignments.yaml")
                           if self.environment == "operator" else Path.home() / ".agentik" / "os-assignments.yaml")
        try:
            assignments = (yaml.safe_load(assignment_path.read_text(encoding="utf-8")) or {}).get("assignments", [])
        except Exception:
            assignments = []
        if action in {"list", "available"}:
            if not packages:
                return "OPERATIVE SYSTEM REGISTRY\nInstalled packages: 0\nNo Operative Systems are installed."
            return "OPERATIVE SYSTEM REGISTRY\n" + "\n".join(
                f"• {p.get('id')}@{p.get('version')}" for p in packages if isinstance(p, dict)
            )
        if action in {"active", "stack"}:
            records = [item for item in assignments if isinstance(item, dict)]
            stack = resolve_assignments(records, {
                "environment_id": self.data_environment,
                "client_id": self.context().get("client_id"),
                "project_id": self.context().get("project_id"),
                "session_id": None,
            })
            if not stack:
                return "ACTIVE OS STACK\n(empty)"
            return "ACTIVE OS STACK\n" + "\n".join(f"• {a}" for a in stack)
        if action == "info":
            if len(argv) < 2:
                return "Usage: /os info <id>"
            matches = [p for p in packages if isinstance(p, dict) and p.get("id") == argv[1]]
            return json.dumps(matches, indent=2, sort_keys=True) if matches else f"Operative System not installed: {argv[1]}"
        if action == "doctor":
            healthy, errors = registry_api.doctor([assignment_path])
            if healthy:
                return f"OPERATIVE SYSTEM DOCTOR\n✓ Registry valid\nInstalled packages: {len(packages)}\nAssignments: valid"
            return "OPERATIVE SYSTEM DOCTOR\n✗ " + "\n✗ ".join(errors)
        return ("OS mutation commands are intentionally unavailable until the signed package "
                "installer and validator are deployed. No OS was changed.")
