from __future__ import annotations

import importlib.util
import subprocess
import sys
from pathlib import Path


MODULE_PATH = Path(__file__).parents[2] / "scripts" / "agk_control.py"
SPEC = importlib.util.spec_from_file_location("agk_control_tested", MODULE_PATH)
assert SPEC and SPEC.loader
agk = importlib.util.module_from_spec(SPEC)
sys.modules[SPEC.name] = agk
SPEC.loader.exec_module(agk)


def completed(stdout: str = "", returncode: int = 0):
    return subprocess.CompletedProcess([], returncode, stdout=stdout, stderr="")


def test_session_types_and_filter_language():
    assert agk.TYPES == {"hermes", "claude", "codex", "shell", "agent", "workflow", "monitor"}
    rows = [{"type": "hermes", "environment": "mission", "client": "moonbase",
             "project": "growth", "status": "running", "name": "mission-moonbase-growth"}]
    assert agk.filtered(rows, "type:hermes env:mission client:moonbase") == rows
    assert agk.filtered(rows, "status:failed") == []


def test_create_persists_runtime_metadata_and_rmux_marker(tmp_path, monkeypatch):
    calls = []
    def fake_run(*args, check=True):
        calls.append(args)
        return completed(returncode=1 if args[1:3] == ("has-session", "-t") else 0)
    monkeypatch.setattr(agk, "run", fake_run)
    env = agk.Environment("agentik", tmp_path, tmp_path / "workspace" / "projects")
    registry = agk.RuntimeRegistry(env)
    row = registry.create(name="agentik-hermes-dev", kind="hermes", cwd=tmp_path,
                          project="PRJ-1", native_session="S-1",
                          command=["hermes", "--resume", "S-1"])
    assert row["type"] == "hermes"
    assert row["native_session"] == "S-1"
    assert row["project"] == "PRJ-1"
    create_call = next(call for call in calls if call[1] == "new-session")
    assert "AGENTIK_RMUX=1" in create_call
    assert "AGENTIK_ENVIRONMENT=agentik" in create_call


def test_create_rejects_cwd_outside_linux_identity(tmp_path, monkeypatch):
    monkeypatch.setattr(agk, "run", lambda *args, **kwargs: completed(returncode=1))
    registry = agk.RuntimeRegistry(agk.Environment("private", tmp_path / "private", tmp_path / "private" / "projects"))
    registry.env.home.mkdir(parents=True, exist_ok=True)
    try:
        registry.create(name="private-invalid-work", kind="shell", cwd=tmp_path / "mission")
    except ValueError as exc:
        assert "trust boundary" in str(exc)
    else:
        raise AssertionError("cross-environment cwd was accepted")


def test_reconcile_marks_missing_runtime_interrupted(tmp_path, monkeypatch):
    monkeypatch.setattr(agk, "run", lambda *args, **kwargs: completed(returncode=1))
    registry = agk.RuntimeRegistry(agk.Environment("operator", tmp_path, tmp_path))
    now = 1.0
    registry.db.execute("""
      INSERT INTO runtime_sessions(
        id,name,type,environment,rmux_session,cwd,status,created_at,last_activity,
        native_session,command_json
      ) VALUES (?,?,?,?,?,?,?,?,?,?,?)
    """, ("RT-1", "operator-maintenance", "shell", "operator",
           "operator-maintenance", str(tmp_path), "running", now, now, None, "[]"))
    registry.db.commit()
    changed, unmanaged = registry.reconcile()
    assert changed == 1 and unmanaged == []
    assert registry.get("RT-1")["status"] == "interrupted"


def test_default_resume_commands_use_documented_cli():
    assert agk.default_command("hermes", "S-1") == ["hermes", "--resume", "S-1"]
    assert agk.default_command("claude", "C-1") == ["claude", "--resume", "C-1"]
    assert agk.default_command("codex", "X-1") == ["codex", "resume", "X-1"]


def test_responsive_layout_and_navigation_model():
    assert agk.layout_mode(60, 30) == "compact"
    assert agk.layout_mode(90, 24) == "standard"
    assert agk.layout_mode(140, 40) == "wide"
    left, right = agk.pane_widths(140, "wide")
    assert left >= 38 and right > left
    assert agk.pane_widths(80, "standard") == (80, 0)
    assert agk.cycle_view("sessions") == "projects"
    assert agk.cycle_view("sessions", reverse=True) == "help"


def test_session_sections_prioritize_attention_then_active_then_recent():
    rows = [
        {"status": "idle", "name": "recent"},
        {"status": "working", "name": "active"},
        {"status": "failed", "name": "failed"},
    ]
    sections = agk.session_sections(rows)
    assert [name for name, _ in sections] == ["ATTENTION", "ACTIVE", "RECENT"]
    assert [values[0]["name"] for _, values in sections] == ["failed", "active", "recent"]


def test_age_format_is_compact_and_stable():
    assert agk.format_age(990, now=1000) == "10s"
    assert agk.format_age(700, now=1000) == "5m"
    assert agk.format_age(1000 - 7200, now=1000) == "2h"


def test_mcp_inventory_is_redacted(tmp_path):
    env = agk.Environment("mission", tmp_path, tmp_path / "workspace/clients")
    (tmp_path / ".hermes").mkdir()
    (tmp_path / ".hermes/config.yaml").write_text(
        "mcp_servers:\n  github:\n    command: secret-command\n    env:\n      TOKEN: secret\n  browser:\n    url: https://example.invalid\n",
        encoding="utf-8",
    )
    assert agk.mcp_inventory(env) == [
        {"name": "browser", "transport": "http", "status": "configured"},
        {"name": "github", "transport": "stdio", "status": "configured"},
    ]
    assert "secret" not in repr(agk.mcp_inventory(env))


def test_skill_inventory_reports_identity_and_source_only(tmp_path):
    env = agk.Environment("private", tmp_path, tmp_path / "workspace/projects")
    skill = tmp_path / ".hermes/skills/research"
    skill.mkdir(parents=True)
    (skill / "SKILL.md").write_text("private instructions", encoding="utf-8")
    assert agk.skill_inventory(env) == [
        {"name": "research", "source": "hermes", "status": "installed"},
    ]


def test_rmux_adapter_uses_stable_pane_id_for_respawn(monkeypatch):
    calls = []
    def fake_run(*args, check=True):
        calls.append(args)
        if args[1] == "list-panes":
            return completed("%42\n")
        return completed()
    monkeypatch.setattr(agk, "run", fake_run)
    runtime = agk.RmuxRuntime()
    runtime.respawn("mission-moonbase", "/home/mission/workspace", ["hermes", "--resume", "S-1"])
    command = calls[-1]
    assert command[1:5] == ("respawn-pane", "-k", "-t", "%42")
    assert ":1.1" not in command
    runtime.send_input("mission-moonbase", "continue safely")
    assert calls[-2][1:] == ("send-keys", "-t", "%42", "-l", "continue safely")
    assert calls[-1][1:] == ("send-keys", "-t", "%42", "Enter")
