"""Test Discord slash command sync respects the 100-command hard limit."""

from types import SimpleNamespace
from unittest.mock import AsyncMock, MagicMock, patch
import sys

import pytest

from gateway.config import PlatformConfig


def _ensure_discord_mock():
    if "discord" in sys.modules and hasattr(sys.modules["discord"], "__file__"):
        return
    if sys.modules.get("discord") is None:
        discord_mod = MagicMock()
        discord_mod.Intents.default.return_value = MagicMock()
        sys.modules["discord"] = discord_mod
        sys.modules["discord.ext"] = MagicMock()
        sys.modules["discord.ext.commands"] = MagicMock()


_ensure_discord_mock()

from plugins.platforms.discord.adapter import DiscordAdapter


class _FakeTreeCommand:
    """Minimal command stub matching discord.py tree command API."""

    def __init__(self, name: str, command_type: int = 1):
        self.name = name
        self.type = command_type

    def to_dict(self, _tree):
        return {"name": self.name, "type": self.type}


@pytest.fixture
def adapter():
    """Create a Discord adapter with mocked Discord client."""
    _ensure_discord_mock()
    config = PlatformConfig(enabled=True, token="fake-token")
    adapter = DiscordAdapter(config)

    # Mock the Discord client and tree
    adapter._client = MagicMock()
    adapter._client.tree = MagicMock()
    adapter._client.http = AsyncMock()
    adapter._client.application_id = "test_app_id"

    adapter._sleep_between_command_sync_mutations = AsyncMock()
    adapter._existing_command_to_payload = MagicMock(side_effect=lambda cmd: {"name": cmd.name})
    adapter._canonicalize_app_command_payload = MagicMock(side_effect=lambda p: p)
    adapter._patchable_app_command_payload = MagicMock(side_effect=lambda p: p)

    return adapter


@pytest.mark.asyncio
async def test_safe_sync_renames_obsolete_commands_at_the_hard_cap():
    """Sync reuses obsolete IDs rather than exceeding the hard cap.

    Discord's 100-command limit is enforced when trying to upsert. If we
    have 100 commands on Discord, try to add 1 new one, and haven't deleted
    any yet, Discord rejects with error 30032.

    The fix: identify and delete obsolete commands first, then create/update.
    This ensures we never temporarily exceed 100 during the sync operation.

    This is a regression guard for the samuraiheart bug where sync would fail
    with error 30032 even though the registration code properly capped at 100.
    """
    _ensure_discord_mock()
    config = PlatformConfig(enabled=True, token="fake-token")
    adapter = DiscordAdapter(config)

    adapter._client = MagicMock()
    adapter._client.tree = MagicMock()
    adapter._client.http = AsyncMock()
    adapter._client.application_id = "test_app_id"
    adapter._sleep_between_command_sync_mutations = AsyncMock()
    adapter._existing_command_to_payload = MagicMock(side_effect=lambda cmd: {"name": cmd.name})
    adapter._canonicalize_app_command_payload = MagicMock(side_effect=lambda p: p)
    adapter._patchable_app_command_payload = MagicMock(side_effect=lambda p: p)

    # Simulate having 100 commands on Discord, with 1 that's no longer desired
    # and 1 new command that should be created.
    # Existing on Discord: cmd_0, cmd_1, ..., cmd_99 (100 total)
    # Desired locally: cmd_1, cmd_2, ..., cmd_99, cmd_new (100 total)
    # So: delete cmd_0 (1 deletion), create cmd_new (1 creation)

    existing_commands = [
        SimpleNamespace(id=f"id_{i}", name=f"cmd_{i}", type=1)
        for i in range(100)
    ]
    adapter._client.tree.fetch_commands = AsyncMock(return_value=existing_commands)

    adapter._client.tree.get_commands = MagicMock(
        return_value=[
            _FakeTreeCommand(name=f"cmd_{i}", command_type=1)
            for i in range(1, 100)
        ] + [_FakeTreeCommand(name="cmd_new", command_type=1)]
    )

    # Track the order of mutations
    mutation_log = []

    async def mock_delete(*args):
        mutation_log.append(("delete", args[-1]))

    async def mock_upsert(*args):
        mutation_log.append(("create", args[-1].get("name")))

    adapter._client.http.delete_global_command = mock_delete
    adapter._client.http.upsert_global_command = mock_upsert
    adapter._client.http.edit_global_command = AsyncMock()
    adapter._client.http.bulk_upsert_global_commands = None

    # Call sync
    await adapter._safe_sync_slash_commands()

    assert mutation_log == []
    assert adapter._client.http.edit_global_command.await_count >= 1
    assert any(call.args[-1]["name"] == "cmd_new" for call in adapter._client.http.edit_global_command.await_args_list)


@pytest.mark.asyncio
async def test_safe_sync_renames_when_one_old_command_can_be_reused():
    """A rename avoids deletion gaps and the daily creation bucket."""
    adapter = DiscordAdapter(PlatformConfig(enabled=True, token="fake-token"))
    adapter._client = MagicMock()
    adapter._client.tree = MagicMock()
    adapter._client.http = AsyncMock()
    adapter._client.application_id = "test_app_id"
    adapter._sleep_between_command_sync_mutations = AsyncMock()
    adapter._existing_command_to_payload = MagicMock(side_effect=lambda cmd: {"name": cmd.name})
    adapter._canonicalize_app_command_payload = MagicMock(side_effect=lambda p: p)
    adapter._patchable_app_command_payload = MagicMock(side_effect=lambda p: p)
    old = SimpleNamespace(id="old-id", name="old", type=1)
    adapter._client.tree.fetch_commands = AsyncMock(return_value=[old])
    adapter._client.tree.get_commands = MagicMock(return_value=[_FakeTreeCommand("new")])
    mutations = []

    async def create(*_args):
        mutations.append("create")

    async def delete(*_args):
        mutations.append("delete")

    adapter._client.http.upsert_global_command = create
    adapter._client.http.delete_global_command = delete
    adapter._client.http.edit_global_command = AsyncMock()

    await adapter._safe_sync_slash_commands()

    assert mutations == []
    adapter._client.http.edit_global_command.assert_awaited_once()


@pytest.mark.asyncio
async def test_safe_sync_uses_atomic_bulk_route_for_large_diff(adapter):
    existing = []
    desired = [_FakeTreeCommand(f"new-{i}") for i in range(8)]
    adapter._client.tree.fetch_commands = AsyncMock(return_value=existing)
    adapter._client.tree.get_commands = MagicMock(return_value=desired)

    result = await adapter._safe_sync_slash_commands()

    adapter._client.http.bulk_upsert_global_commands.assert_awaited_once()
    payload = adapter._client.http.bulk_upsert_global_commands.await_args.args[1]
    assert [item["name"] for item in payload] == [f"new-{i}" for i in range(8)]
    adapter._client.http.upsert_global_command.assert_not_awaited()
    adapter._client.http.delete_global_command.assert_not_awaited()
    assert result["created"] == 8
    assert result["deleted"] == 0


@pytest.mark.asyncio
async def test_safe_sync_reuses_existing_ids_when_creation_budget_is_exhausted(adapter):
    existing = [SimpleNamespace(id=f"old-{i}", name=f"old-{i}", type=1) for i in range(6)]
    desired = [_FakeTreeCommand(name) for name in ("help", "status", "client", "project", "mission", "task", "run", "os")]
    adapter._client.tree.fetch_commands = AsyncMock(return_value=existing)
    adapter._client.tree.get_commands = MagicMock(return_value=desired)

    with patch("hermes_cli.commands._iter_plugin_command_entries", return_value=[
        (name, name, "<action>") for name in ("client", "project", "mission", "task", "run", "os")
    ]):
        result = await adapter._safe_sync_slash_commands()

    assert result["total"] == len(existing)
    assert adapter._client.http.edit_global_command.await_count == len(existing)
    adapter._client.http.upsert_global_command.assert_not_awaited()
    adapter._client.http.bulk_upsert_global_commands.assert_not_awaited()


@pytest.mark.asyncio
async def test_budget_convergence_keeps_all_agentik_commands_before_other_plugins(adapter):
    existing = [SimpleNamespace(id=f"old-{i}", name=f"old-{i}", type=1) for i in range(6)]
    desired_names = ("help", "status", "client", "project", "mission", "task", "other-a", "other-b")
    adapter._client.tree.fetch_commands = AsyncMock(return_value=existing)
    adapter._client.tree.get_commands = MagicMock(return_value=[_FakeTreeCommand(n) for n in desired_names])
    entries = [(n, n, "<action>") for n in desired_names[2:]]
    metadata = {
        n: {"plugin": "agentik-os" if n in {"client", "project", "mission", "task"} else "other"}
        for n in desired_names[2:]
    }
    with (
        patch("hermes_cli.commands._iter_plugin_command_entries", return_value=entries),
        patch("hermes_cli.plugins.get_plugin_commands", return_value=metadata),
    ):
        await adapter._safe_sync_slash_commands()
    installed = {call.args[-1]["name"] for call in adapter._client.http.edit_global_command.await_args_list}
    assert installed == {"help", "status", "client", "project", "mission", "task"}
