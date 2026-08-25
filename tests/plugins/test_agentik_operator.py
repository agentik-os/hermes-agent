from pathlib import Path

from plugins.agentik_os.commands import AgentikCommandService
from plugins.agentik_os.paths import PathResolver
from plugins.agentik_os.store import ControlStore


def service(tmp_path: Path) -> AgentikCommandService:
    return AgentikCommandService(
        "operator", ControlStore(tmp_path / "control.db"),
        PathResolver("operator", tmp_path),
    )


def test_operator_command_surface_is_complete(tmp_path):
    commands = set(service(tmp_path).command_names)
    assert {"machine", "system", "service", "gateway", "docker", "security", "tailscale", "backup", "hermes"} <= commands
    assert "client" not in commands


def test_operator_system_status_is_live_and_bounded(tmp_path):
    output = service(tmp_path).dispatch("system", "resources")
    assert "SYSTEM HEALTH" in output
    assert "Memory:" in output
    assert "Disk:" in output


def test_operator_mutations_require_typed_approval(tmp_path):
    output = service(tmp_path).dispatch("gateway", "restart mission")
    assert "Approval required" in output
    assert "arbitrary sudo execution is disabled" in output


def test_operator_gateway_status_uses_known_targets_only(tmp_path):
    output = service(tmp_path).dispatch("gateway", "status mission")
    assert "mission:" in output
    assert "operator:" not in output
