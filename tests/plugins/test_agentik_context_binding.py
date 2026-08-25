from pathlib import Path

from hermes_cli.plugins import (
    reset_plugin_command_invocation_context,
    set_plugin_command_invocation_context,
)
from plugins.agentik_os.commands import AgentikCommandService
from plugins.agentik_os.paths import PathResolver
from plugins.agentik_os.store import ControlStore


def test_context_is_isolated_by_actor_and_surface_conversation(tmp_path: Path):
    svc = AgentikCommandService(
        "mission", ControlStore(tmp_path / "control.db"), PathResolver("mission", tmp_path)
    )
    first = set_plugin_command_invocation_context({
        "surface": "discord", "scope_id": "guild", "chat_id": "channel-a", "actor_id": "user-1"
    })
    try:
        svc.dispatch("client", "new Moonbase")
        assert svc.context()["client_id"]
    finally:
        reset_plugin_command_invocation_context(first)

    second = set_plugin_command_invocation_context({
        "surface": "discord", "scope_id": "guild", "chat_id": "channel-a", "actor_id": "user-2"
    })
    try:
        assert svc.context()["client_id"] is None
        svc.dispatch("client", "open moonbase")
        assert svc.context()["client_id"]
    finally:
        reset_plugin_command_invocation_context(second)

    local = svc.context()
    assert local["client_id"] is None
