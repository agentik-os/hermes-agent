from pathlib import Path
from types import SimpleNamespace

from plugins.agentik_os import runtime_tool


def test_spawn_is_bounded_to_home_and_fixed_agent_types(tmp_path, monkeypatch):
    monkeypatch.setattr(runtime_tool, "_home", lambda: tmp_path)
    calls = []
    monkeypatch.setattr(runtime_tool, "_bounded_run", lambda argv, timeout=20: calls.append(argv) or SimpleNamespace(returncode=0, stdout="ok", stderr=""))
    result = runtime_tool.handle_runtime({"action": "spawn", "agent_type": "codex", "session": "agentik-build", "cwd": str(tmp_path)})
    assert "success" in result
    assert calls == [["/usr/local/bin/agk", "new", "codex", "agentik-build", "--cwd", str(tmp_path)]]
    assert "escapes" in runtime_tool.handle_runtime({"action": "spawn", "agent_type": "codex", "session": "agentik-bad", "cwd": "/tmp"})


def test_send_refuses_unmanaged_runtime(monkeypatch):
    monkeypatch.setattr(runtime_tool, "_registry_rows", lambda: [])
    result = runtime_tool.handle_runtime({"action": "send", "session": "unknown", "instruction": "do it"})
    assert "not managed" in result


def test_snapshot_uses_registered_rmux_name(monkeypatch):
    monkeypatch.setattr(runtime_tool, "_registry_rows", lambda: [{"id": "RT-1", "name": "mission-work", "rmux_session": "mission-work"}])
    monkeypatch.setattr(runtime_tool, "_bounded_run", lambda argv, timeout=20: SimpleNamespace(returncode=0, stdout="safe output", stderr=""))
    result = runtime_tool.handle_runtime({"action": "snapshot", "session": "RT-1"})
    assert "safe output" in result
