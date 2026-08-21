from __future__ import annotations

import os
import subprocess

import pytest

from hermes_cli.cli_auth_broker import CliAuthBroker, CliAuthError, parse_login_view


class FakeMux:
    def __init__(self):
        self.created = []
        self.inputs = []
        self.closed = []
        self.sessions = []
        self.ansi = ""
        self.next_pid = 100

    def create(self, session, *, cwd, command=None):
        self.created.append((session, cwd, command))
        self.sessions = [{"name": session, "pane_pid": self.next_pid}]
        self.next_pid += 1
        return {"ok": True, "session": session}

    def list_sessions(self):
        return {"available": True, "engine": "rmux", "sessions": self.sessions}

    def capture(self, session, *, lines=500):
        return {"session": session, "ansi": self.ansi, "lines": lines}

    def send_input(self, session, *, text=None, key=None):
        self.inputs.append((session, text, key))
        return {"ok": True}

    def close(self, session):
        self.closed.append(session)
        self.sessions = []
        return {"ok": True}


def test_parse_login_view_returns_only_authorization_metadata() -> None:
    text = "\x1b[34mOpen https://example.test/oauth?state=abc\x1b[0m\nPaste authorization code here:"
    view = parse_login_view(text)
    assert view == {
        "auth_url": "https://example.test/oauth?state=abc",
        "expects_code": True,
        "status": "pending",
    }
    assert "Paste" not in str(view)


def test_start_uses_isolated_provider_slot_and_fixed_command(tmp_path) -> None:
    mux = FakeMux()
    broker = CliAuthBroker(home=tmp_path, mux=mux, which=lambda name: f"/bin/{name}")
    result = broker.start("claude-code", "work")
    session, cwd, command = mux.created[0]
    slot = tmp_path / "accounts" / "claude-code" / "work"
    assert result == {
        "account_id": "work",
        "provider": "claude-code",
        "session_id": session,
        "status": "pending",
    }
    assert cwd == str(slot)
    assert command == [
        "env",
        "-u",
        "ANTHROPIC_API_KEY",
        "-u",
        "ANTHROPIC_AUTH_TOKEN",
        "-u",
        "ANTHROPIC_TOKEN",
        "-u",
        "CLAUDE_CODE_OAUTH_TOKEN",
        f"CLAUDE_CONFIG_DIR={slot}",
        "/bin/claude",
        "auth",
        "login",
        "--claudeai",
    ]
    assert oct(slot.stat().st_mode & 0o777) == "0o700"


def test_start_resumes_an_existing_persistent_login_session(tmp_path) -> None:
    mux = FakeMux()
    broker = CliAuthBroker(home=tmp_path, mux=mux, which=lambda name: f"/bin/{name}")
    first = broker.start("claude-code", "work")
    mux.created.clear()
    second = CliAuthBroker(home=tmp_path, mux=mux, which=lambda name: f"/bin/{name}").start("claude-code", "work")
    assert second["session_id"] == first["session_id"]
    assert mux.created == []


def test_start_rejects_an_unowned_mux_name_collision(tmp_path) -> None:
    mux = FakeMux()
    mux.sessions = [{"name": "hermes-auth-claude-code-work-a1b2c3d4e5f6", "pane_pid": 999}]
    broker = CliAuthBroker(
        home=tmp_path,
        mux=mux,
        which=lambda name: f"/bin/{name}",
        nonce=lambda: "a1b2c3d4e5f6",
    )
    with pytest.raises(CliAuthError, match="not owned"):
        broker.start("claude-code", "work")


def test_stale_marker_does_not_resume_a_recreated_session_with_different_pid(tmp_path) -> None:
    mux = FakeMux()
    nonces = iter(["a1b2c3d4e5f6", "001122334455"])
    broker = CliAuthBroker(
        home=tmp_path,
        mux=mux,
        which=lambda name: f"/bin/{name}",
        nonce=lambda: next(nonces),
    )
    first = broker.start("claude-code", "work")
    mux.sessions = [{"name": first["session_id"], "pane_pid": 999}]
    second = broker.start("claude-code", "work")
    assert second["session_id"] != first["session_id"]
    assert second["session_id"].endswith("001122334455")


def test_openai_start_uses_codex_home_and_browser_login(tmp_path) -> None:
    mux = FakeMux()
    broker = CliAuthBroker(home=tmp_path, mux=mux, which=lambda name: f"/bin/{name}")
    broker.start("openai-cli", "personal")
    _, _, command = mux.created[0]
    assert command == [
        "env",
        "-u",
        "OPENAI_API_KEY",
        "-u",
        "CODEX_API_KEY",
        "-u",
        "CODEX_ACCESS_TOKEN",
        f"CODEX_HOME={tmp_path / 'accounts' / 'openai-cli' / 'personal'}",
        "/bin/codex",
        "login",
    ]


def test_submit_code_is_literal_and_separate_from_enter(tmp_path) -> None:
    mux = FakeMux()
    broker = CliAuthBroker(home=tmp_path, mux=mux, which=lambda name: f"/bin/{name}")
    started = broker.start("claude-code", "work")
    broker.submit("claude-code", "work", started["session_id"], "abc-$(touch /tmp/nope)")
    assert mux.inputs == [
        (started["session_id"], "abc-$(touch /tmp/nope)", None),
        (started["session_id"], None, "Enter"),
    ]
    with pytest.raises(CliAuthError, match="invalid authorization code"):
        broker.submit("claude-code", "work", started["session_id"], "bad\ncode")


def test_poll_returns_url_while_mux_lives_then_verifies_cli_status(tmp_path) -> None:
    mux = FakeMux()
    statuses = []

    def run(argv, **kwargs):
        statuses.append((argv, kwargs.get("env")))
        return subprocess.CompletedProcess(argv, 0, stdout="Logged in", stderr="")

    broker = CliAuthBroker(home=tmp_path, mux=mux, which=lambda name: f"/bin/{name}", run=run)
    started = broker.start("openai-cli", "personal")
    mux.ansi = "Open this URL: https://auth.openai.com/example\nPaste the code from your browser"
    assert broker.poll("openai-cli", "personal", started["session_id"]) == {
        "auth_url": "https://auth.openai.com/example",
        "expects_code": True,
        "status": "pending",
    }

    mux.sessions = []
    assert broker.poll("openai-cli", "personal", started["session_id"])["status"] == "approved"
    assert statuses[0][0] == ["/bin/codex", "login", "status"]
    assert statuses[0][1]["CODEX_HOME"].endswith("accounts/openai-cli/personal")


def test_poll_fails_closed_when_status_command_is_ambiguous(tmp_path) -> None:
    mux = FakeMux()
    broker = CliAuthBroker(
        home=tmp_path,
        mux=mux,
        which=lambda name: f"/bin/{name}",
        run=lambda argv, **kwargs: subprocess.CompletedProcess(argv, 0, stdout="Not authenticated", stderr=""),
    )
    started = broker.start("claude-code", "work")
    mux.sessions = []
    assert broker.poll("claude-code", "work", started["session_id"])["status"] == "error"


def test_submit_rejects_an_unowned_deterministic_session(tmp_path) -> None:
    mux = FakeMux()
    session_id = "hermes-auth-claude-code-work-a1b2c3d4e5f6"
    mux.sessions = [{"name": session_id, "pane_pid": 999}]
    broker = CliAuthBroker(home=tmp_path, mux=mux, which=lambda name: f"/bin/{name}")
    with pytest.raises(CliAuthError, match="not owned"):
        broker.submit("claude-code", "work", session_id, "code")
    assert mux.inputs == []


def test_account_slot_rejects_symlinks(tmp_path) -> None:
    outside = tmp_path / "outside"
    outside.mkdir()
    slot = tmp_path / "accounts" / "claude-code" / "work"
    slot.parent.mkdir(parents=True)
    slot.symlink_to(outside, target_is_directory=True)
    broker = CliAuthBroker(home=tmp_path, mux=FakeMux(), which=lambda name: f"/bin/{name}")
    with pytest.raises(CliAuthError, match="symlink"):
        broker.start("claude-code", "work")


def test_cancel_and_identifiers_are_fail_closed(tmp_path) -> None:
    mux = FakeMux()
    broker = CliAuthBroker(home=tmp_path, mux=mux, which=lambda name: f"/bin/{name}")
    started = broker.start("claude-code", "work")
    assert broker.cancel("claude-code", "work", started["session_id"])["status"] == "cancelled"
    assert mux.closed == [started["session_id"]]
    assert not (tmp_path / "accounts" / "claude-code" / "work" / ".hermes-auth-session").exists()
    with pytest.raises(CliAuthError):
        broker.start("claude-code", "../escape")
    with pytest.raises(CliAuthError):
        broker.poll("claude-code", "work", "other-session")
    with pytest.raises(CliAuthError):
        broker.start("unknown", "work")
