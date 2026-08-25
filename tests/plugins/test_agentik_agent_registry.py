import json
from pathlib import Path
from types import SimpleNamespace

from plugins.agentik_os import agent_registry


def _catalog(tmp_path: Path) -> Path:
    root = tmp_path / "catalog" / "master-os-builder"
    root.mkdir(parents=True)
    (root / "agent.yaml").write_text(
        "id: master-os-builder\nname: Master OS Builder\nversion: 1.0.0\n"
        "description: test\nscope: [agentik]\nprompt: prompt.md\n",
        encoding="utf-8",
    )
    (root / "prompt.md").write_text("EXACT PROMPT\n", encoding="utf-8")
    return root.parent


def test_list_exposes_bundled_agent_without_installing_an_os(tmp_path, monkeypatch):
    monkeypatch.setattr(agent_registry, "_catalog_root", lambda: _catalog(tmp_path))
    payload = json.loads(agent_registry.handle_agent({"action": "list"}))
    assert payload["agents"][0]["id"] == "master-os-builder"


def test_start_creates_durable_agk_runtime_and_freezes_prompt(tmp_path, monkeypatch):
    monkeypatch.setattr(agent_registry, "_catalog_root", lambda: _catalog(tmp_path))
    monkeypatch.setattr(Path, "home", lambda: tmp_path)
    monkeypatch.setattr(agent_registry, "_environment", lambda: "agentik")
    monkeypatch.setattr(agent_registry, "_runtime_row", lambda _name: None)
    calls = []
    monkeypatch.setattr(
        agent_registry,
        "_run",
        lambda argv, timeout=30: calls.append(argv)
        or SimpleNamespace(returncode=0, stdout="", stderr=""),
    )
    payload = json.loads(agent_registry.handle_agent({"action": "start", "agent": "master-os-builder"}))
    assert payload["created"] is True
    assert calls[0][:4] == ["/usr/local/bin/agk", "new", "hermes", "agentik-master-os-builder"]
    assert (tmp_path / ".agentik/agents/master-os-builder/workspace/AGENTS.md").read_text() == "EXACT PROMPT\n"


def test_scope_blocks_cross_environment_launch(tmp_path, monkeypatch):
    monkeypatch.setattr(agent_registry, "_catalog_root", lambda: _catalog(tmp_path))
    monkeypatch.setattr(agent_registry, "_environment", lambda: "operator")
    payload = json.loads(agent_registry.handle_agent({"action": "start", "agent": "master-os-builder"}))
    assert "error" in payload
    assert "not allowed" in payload["error"]
