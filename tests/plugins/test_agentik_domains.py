from pathlib import Path

import pytest

from plugins.agentik_os.commands import AgentikCommandService
from plugins.agentik_os.paths import PathResolver
from plugins.agentik_os.store import ControlStore


@pytest.fixture(params=["agentik", "mission", "private"])
def service(request, tmp_path: Path):
    env = request.param
    return AgentikCommandService(env, ControlStore(tmp_path / env / "control.db"), PathResolver(env, tmp_path / env))


def test_environment_commands_do_not_cross_boundaries(service):
    commands = set(service.command_names)
    if service.environment == "agentik":
        assert {"org", "product", "content", "growth", "research"} <= commands
        assert "client" not in commands and "journal" not in commands
    elif service.environment == "mission":
        assert {"client", "deliverable", "deploy", "report"} <= commands
        assert "org" not in commands and "journal" not in commands
    else:
        assert {"journal", "decision", "routine", "idea", "review"} <= commands
        assert "client" not in commands and "org" not in commands


def test_domain_records_use_shared_persistent_store(tmp_path):
    first = AgentikCommandService("private", ControlStore(tmp_path / "control.db"), PathResolver("private", tmp_path))
    created = first.dispatch("idea", 'new "Travel planner"')
    assert "Idea created" in created
    second = AgentikCommandService("private", ControlStore(tmp_path / "control.db"), PathResolver("private", tmp_path))
    assert "Travel planner" in second.dispatch("idea", "list")


def test_domain_lifecycle_is_auditable(tmp_path):
    svc = AgentikCommandService("mission", ControlStore(tmp_path / "control.db"), PathResolver("mission", tmp_path))
    created = svc.dispatch("deliverable", 'new "Weekly report"')
    object_id = created.split("(", 1)[1].split(")", 1)[0]
    assert "in-review" in svc.dispatch("deliverable", f"review {object_id}")
    assert "approved" in svc.dispatch("deliverable", f"approve {object_id}")
