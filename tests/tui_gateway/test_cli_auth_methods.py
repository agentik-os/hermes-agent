from __future__ import annotations

from tui_gateway import server


class FakeAuth:
    def start(self, provider, account_id):
        return {"provider": provider, "account_id": account_id, "session_id": "auth-1", "status": "pending"}

    def poll(self, provider, account_id, session_id):
        return {"status": "pending", "auth_url": "https://example.test", "expects_code": True}

    def submit(self, provider, account_id, session_id, code):
        return {"status": "pending", "code_seen": code}

    def cancel(self, provider, account_id, session_id):
        return {"status": "cancelled"}


def call(method: str, params: dict):
    return server.handle_request({"jsonrpc": "2.0", "id": "r1", "method": method, "params": params})


def test_cli_auth_rpc_lifecycle(monkeypatch):
    monkeypatch.setattr("hermes_cli.cli_auth_broker.CliAuthBroker", FakeAuth)
    started = call("auth.cli.start", {"provider": "claude-code", "account_id": "work"})
    assert started["result"]["session_id"] == "auth-1"
    polled = call(
        "auth.cli.poll",
        {"provider": "claude-code", "account_id": "work", "session_id": "auth-1"},
    )
    assert polled["result"] == {
        "status": "pending",
        "auth_url": "https://example.test",
        "expects_code": True,
    }
    submitted = call(
        "auth.cli.submit",
        {
            "provider": "claude-code",
            "account_id": "work",
            "session_id": "auth-1",
            "code": "web-code",
        },
    )
    assert submitted["result"]["status"] == "pending"
    cancelled = call(
        "auth.cli.cancel",
        {"provider": "claude-code", "account_id": "work", "session_id": "auth-1"},
    )
    assert cancelled["result"]["status"] == "cancelled"


def test_cli_auth_rpc_requires_all_scoping_fields(monkeypatch):
    monkeypatch.setattr("hermes_cli.cli_auth_broker.CliAuthBroker", FakeAuth)
    for method in ("auth.cli.poll", "auth.cli.submit", "auth.cli.cancel"):
        response = call(method, {"provider": "claude-code", "account_id": "work"})
        assert response["error"]["code"] == 4003
