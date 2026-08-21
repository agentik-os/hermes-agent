from __future__ import annotations

from tui_gateway import server


class FakeDb:
    def __init__(self, _path):
        self.closed = False

    def distinct_session_cwds(self):
        return [{"cwd": "/workspace", "sessions": 2, "last_active": 4}]

    def close(self):
        self.closed = True


class FakeBroker:
    def list_sessions(self):
        return {"available": True, "engine": "rmux", "sessions": [{"name": "arch"}]}

    def create(self, session, *, cwd, command=None):
        return {"ok": True, "session": session, "cwd": cwd, "command": command}

    def capture(self, session, *, lines=500):
        return {"session": session, "ansi": f"last:{lines}"}

    def resize(self, session, *, cols, rows):
        return {"ok": True, "session": session, "cols": cols, "rows": rows}

    def send_input(self, session, *, text=None, key=None):
        return {"ok": True, "session": session, "text": text, "key": key}

    def close(self, session):
        return {"ok": True, "session": session}


def call(method: str, params: dict | None = None):
    return server.handle_request({"id": "mux-test", "method": method, "params": params or {}})


def test_mux_list_is_a_typed_gateway_rpc(monkeypatch):
    monkeypatch.setattr("hermes_cli.mux_broker.MuxBroker", FakeBroker)
    response = call("mux.sessions.list")
    assert response["result"]["engine"] == "rmux"
    assert response["result"]["sessions"] == [{"name": "arch"}]


def test_mux_capture_and_input_forward_only_typed_fields(monkeypatch):
    monkeypatch.setattr("hermes_cli.mux_broker.MuxBroker", FakeBroker)
    captured = call("mux.sessions.capture", {"session": "arch", "lines": 80})
    sent = call("mux.sessions.input", {"session": "arch", "key": "Enter"})
    assert captured["result"] == {"session": "arch", "ansi": "last:80"}
    assert sent["result"]["key"] == "Enter"
    assert sent["result"]["text"] is None


def test_mux_resize_is_typed(monkeypatch):
    monkeypatch.setattr("hermes_cli.mux_broker.MuxBroker", FakeBroker)
    response = call("mux.sessions.resize", {"session": "arch", "cols": 120, "rows": 40})
    assert response["result"] == {"ok": True, "session": "arch", "cols": 120, "rows": 40}


def test_mux_projects_merge_history_with_live_sessions(monkeypatch, tmp_path):
    monkeypatch.setattr("hermes_cli.mux_broker.MuxBroker", FakeBroker)
    monkeypatch.setattr("hermes_state.SessionDB", FakeDb)
    monkeypatch.setattr("hermes_constants.get_hermes_home", lambda: tmp_path)
    monkeypatch.setattr(
        "hermes_cli.project_inventory.merge_project_inventory",
        lambda history, live, limit=200: [{"name": "AGK", "history": history, "live": live, "limit": limit}],
    )
    response = call("mux.projects.list", {"limit": 25})
    assert response["result"]["projects"][0]["name"] == "AGK"
    assert response["result"]["projects"][0]["limit"] == 25


def test_mux_create_does_not_accept_renderer_commands(monkeypatch, tmp_path):
    monkeypatch.setattr("hermes_cli.mux_broker.MuxBroker", FakeBroker)
    response = call(
        "mux.sessions.create",
        {"session": "shell", "cwd": str(tmp_path), "command": "rm -rf /"},
    )
    assert response["result"] == {
        "ok": True,
        "session": "shell",
        "cwd": str(tmp_path),
        "command": None,
    }


def test_mux_close_requires_explicit_confirmation(monkeypatch):
    monkeypatch.setattr("hermes_cli.mux_broker.MuxBroker", FakeBroker)
    denied = call("mux.sessions.close", {"session": "arch"})
    allowed = call("mux.sessions.close", {"session": "arch", "confirm": True})
    assert denied["error"]["code"] == 4003
    assert allowed["result"] == {"ok": True, "session": "arch"}
