"""Typed rmux/tmux RPC handlers for Desktop Local/VPS terminal surfaces."""
from __future__ import annotations

from .method_ctx import HandlerRegistry

_registry = HandlerRegistry()
method = _registry.method


@method("mux.sessions.list")
def _(rid, params: dict) -> dict:
    try:
        from hermes_cli.mux_broker import MuxBroker

        return _ok(rid, MuxBroker().list_sessions())
    except Exception as exc:
        return _err(rid, 5028, str(exc))


@method("mux.projects.list")
def _(rid, params: dict) -> dict:
    try:
        from hermes_cli.mux_broker import MuxBroker
        from hermes_cli.project_inventory import merge_project_inventory
        from hermes_constants import get_hermes_home
        from hermes_state import SessionDB

        limit = max(1, min(1000, int(params.get("limit") or 200)))
        live = MuxBroker().list_sessions().get("sessions", [])
        db = SessionDB(get_hermes_home() / "state.db")
        try:
            history = db.distinct_session_cwds()
        finally:
            db.close()
        return _ok(rid, {"projects": merge_project_inventory(history, live, limit=limit)})
    except Exception as exc:
        return _err(rid, 5028, str(exc))


@method("mux.sessions.create")
def _(rid, params: dict) -> dict:
    try:
        from hermes_cli.mux_broker import MuxBroker

        return _ok(
            rid,
            MuxBroker().create(
                str(params.get("session") or ""),
                cwd=str(params.get("cwd") or ""),
                command=None,
            ),
        )
    except Exception as exc:
        return _err(rid, 5028, str(exc))


@method("mux.sessions.capture")
def _(rid, params: dict) -> dict:
    try:
        from hermes_cli.mux_broker import MuxBroker

        session = str(params.get("session") or "")
        lines = int(params.get("lines") or 500)
        return _ok(rid, MuxBroker().capture(session, lines=lines))
    except (TypeError, ValueError):
        return _err(rid, 4003, "lines must be an integer")
    except Exception as exc:
        return _err(rid, 5028, str(exc))


@method("mux.sessions.resize")
def _(rid, params: dict) -> dict:
    try:
        from hermes_cli.mux_broker import MuxBroker

        session = str(params.get("session") or "")
        cols = int(params.get("cols") or 0)
        rows = int(params.get("rows") or 0)
        return _ok(rid, MuxBroker().resize(session, cols=cols, rows=rows))
    except Exception as exc:
        return _err(rid, 5028, str(exc))


@method("mux.sessions.input")
def _(rid, params: dict) -> dict:
    try:
        from hermes_cli.mux_broker import MuxBroker

        session = str(params.get("session") or "")
        text = params.get("text")
        key = params.get("key")
        if text is not None and not isinstance(text, str):
            return _err(rid, 4003, "text must be a string")
        if key is not None and not isinstance(key, str):
            return _err(rid, 4003, "key must be a string")
        return _ok(rid, MuxBroker().send_input(session, text=text, key=key))
    except Exception as exc:
        return _err(rid, 5028, str(exc))


@method("mux.sessions.close")
def _(rid, params: dict) -> dict:
    if params.get("confirm") is not True:
        return _err(rid, 4003, "confirm=true required")
    try:
        from hermes_cli.mux_broker import MuxBroker

        return _ok(rid, MuxBroker().close(str(params.get("session") or "")))
    except Exception as exc:
        return _err(rid, 5028, str(exc))


def register(server) -> None:
    _registry.install(server)
