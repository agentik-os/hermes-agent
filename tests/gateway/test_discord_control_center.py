from datetime import datetime, timedelta, timezone
from types import SimpleNamespace
from unittest.mock import AsyncMock

import pytest

from gateway.config import PlatformConfig
from plugins.platforms.discord.adapter import DiscordAdapter


class _History:
    def __init__(self, messages):
        self.messages = messages

    def __aiter__(self):
        self._iter = iter(self.messages)
        return self

    async def __anext__(self):
        try:
            return next(self._iter)
        except StopIteration as exc:
            raise StopAsyncIteration from exc


class _Channel:
    def __init__(self, channel_id, messages=()):
        self.id = channel_id
        self._messages = list(messages)
        self.delete_messages = AsyncMock()

    def history(self, **kwargs):
        assert kwargs.get("limit") is None
        return _History(self._messages)


def _interaction(channel, *, user_id=7, administrator=True, values=None):
    return SimpleNamespace(
        user=SimpleNamespace(
            id=user_id,
            display_name="Operator",
            guild_permissions=SimpleNamespace(administrator=administrator),
        ),
        channel=channel,
        channel_id=channel.id,
        guild_id=99,
        data={"values": list(values or [])},
        response=SimpleNamespace(
            send_message=AsyncMock(),
            edit_message=AsyncMock(),
            defer=AsyncMock(),
            send_modal=AsyncMock(),
        ),
        edit_original_response=AsyncMock(),
        delete_original_response=AsyncMock(),
        followup=SimpleNamespace(send=AsyncMock()),
    )


@pytest.fixture
def adapter():
    result = DiscordAdapter(PlatformConfig(enabled=True, token="fake"))
    result._allowed_user_ids = {"7"}
    result._allowed_role_ids = set()
    result._client = SimpleNamespace()
    return result


@pytest.mark.asyncio
async def test_clear_rejects_non_admin_ephemerally(adapter):
    interaction = _interaction(_Channel(10), administrator=False)

    await adapter._send_clear_confirmation_interaction(interaction)

    interaction.response.send_message.assert_awaited_once()
    assert interaction.response.send_message.await_args.kwargs["ephemeral"] is True
    assert "admin" in interaction.response.send_message.await_args.args[0].lower()


@pytest.mark.asyncio
async def test_clear_confirmation_cancel_and_success_are_ephemeral_and_exact_scope(adapter):
    channel = _Channel(10)
    other = _Channel(11)
    interaction = _interaction(channel)
    adapter._clear_current_discord_scope = AsyncMock(return_value=(12, 2))

    await adapter._send_clear_confirmation_interaction(interaction)
    sent = interaction.response.send_message.await_args
    assert sent.kwargs["ephemeral"] is True
    view = sent.kwargs["view"]

    cancel = next(item for item in view.children if item.custom_id == "clear_cancel")
    await cancel.callback(interaction)
    adapter._clear_current_discord_scope.assert_not_awaited()
    assert "cancel" in interaction.response.edit_message.await_args.kwargs["content"].lower()

    interaction2 = _interaction(channel)
    await adapter._send_clear_confirmation_interaction(interaction2)
    view2 = interaction2.response.send_message.await_args.kwargs["view"]
    confirm = next(item for item in view2.children if item.custom_id == "clear_confirm")
    await confirm.callback(interaction2)
    adapter._clear_current_discord_scope.assert_not_awaited()
    final_confirm = next(
        item for item in view2.children if item.custom_id == "clear_final_confirm"
    )
    await final_confirm.callback(interaction2)

    adapter._clear_current_discord_scope.assert_awaited_once_with(channel)
    assert other.id != adapter._clear_current_discord_scope.await_args.args[0].id
    text = interaction2.response.edit_message.await_args.kwargs["content"]
    assert "12 deleted" in text and "2 failed" in text


@pytest.mark.asyncio
async def test_clear_scope_paginates_bulk_deletes_recent_and_individually_deletes_old(adapter):
    now = datetime.now(timezone.utc)
    recent = [SimpleNamespace(id=i, created_at=now, delete=AsyncMock()) for i in range(205)]
    old_ok = SimpleNamespace(id=300, created_at=now - timedelta(days=15), delete=AsyncMock())
    old_bad = SimpleNamespace(
        id=301,
        created_at=now - timedelta(days=30),
        delete=AsyncMock(side_effect=RuntimeError("forbidden SECRET_TOKEN")),
    )
    channel = _Channel(77, [*recent, old_ok, old_bad])

    deleted, failed = await adapter._clear_current_discord_scope(channel)

    assert [len(call.args[0]) for call in channel.delete_messages.await_args_list] == [100, 100, 5]
    assert deleted == 206
    assert failed == 1
    old_ok.delete.assert_awaited_once()
    old_bad.delete.assert_awaited_once()


@pytest.mark.asyncio
async def test_panel_is_ephemeral_and_generated_from_live_registry(adapter, monkeypatch):
    registry = [
        SimpleNamespace(name="status", description="Status", category="Info", args_hint=""),
        SimpleNamespace(name="title", description="Title", category="Session", args_hint="<name>"),
        SimpleNamespace(name="reasoning", description="Reason", category="Configuration", args_hint="[low|high]"),
    ]
    monkeypatch.setattr("hermes_cli.commands.COMMAND_REGISTRY", registry)
    interaction = _interaction(_Channel(10))

    await adapter._send_command_panel_interaction(interaction)

    sent = interaction.response.send_message.await_args
    assert sent.kwargs["ephemeral"] is True
    view = sent.kwargs["view"]
    category = next(item for item in view.children if item.custom_id == "panel_category")
    assert {option.value for option in category.options} == {"Info", "Session", "Configuration"}


@pytest.mark.asyncio
async def test_account_panel_lists_four_providers_without_secret_leakage(adapter, monkeypatch):
    secret = "sk-secret@example.com"
    entry = SimpleNamespace(id="safe-id", label=secret, priority=0, last_status="ok", access_token=secret)
    monkeypatch.setattr(
        "agent.credential_pool.load_pool",
        lambda provider: SimpleNamespace(entries=lambda: [entry]),
    )
    interaction = _interaction(_Channel(10))

    await adapter._send_account_picker_interaction(interaction)

    sent = interaction.response.send_message.await_args
    assert sent.kwargs["ephemeral"] is True
    description = sent.kwargs["embed"].description
    assert all(name in description for name in ("OpenAI", "Anthropic", "OpenRouter", "Nous"))
    assert "safe-id" in description
    assert secret not in description
    provider_select = next(
        item for item in sent.kwargs["view"].children if item.custom_id == "account_provider_select"
    )
    assert {option.value for option in provider_select.options} == {
        "openai-codex", "anthropic", "openrouter", "nous"
    }


@pytest.mark.asyncio
async def test_account_switch_and_confirmed_delete_use_canonical_calls(adapter, monkeypatch):
    entry = SimpleNamespace(id="safe-id", label="private@example.com", priority=0, last_status="ok", source="manual")
    pool = SimpleNamespace(entries=lambda: [entry])
    monkeypatch.setattr("agent.credential_pool.load_pool", lambda provider: pool)
    prefer = AsyncMock(return_value="saved")
    remove = AsyncMock(return_value=True)
    monkeypatch.setattr(adapter, "_prefer_account_credential", prefer)
    monkeypatch.setattr(adapter, "_remove_account_credential", remove)
    interaction = _interaction(_Channel(10))
    await adapter._send_account_picker_interaction(interaction)
    view = interaction.response.send_message.await_args.kwargs["view"]

    provider = next(item for item in view.children if item.custom_id == "account_provider_select")
    interaction.data = {"values": ["openrouter"]}
    await provider.callback(interaction)
    account = next(item for item in view.children if item.custom_id == "account_select:openrouter")
    interaction.data = {"values": ["safe-id"]}
    await account.callback(interaction)
    switch = next(item for item in view.children if item.custom_id == "account_switch:openrouter")
    await switch.callback(interaction)
    prefer.assert_awaited_once_with("openrouter", "safe-id")

    delete = next(item for item in view.children if item.custom_id == "account_delete:openrouter")
    await delete.callback(interaction)
    confirm = next(item for item in view.children if item.custom_id == "account_delete_confirm:openrouter")
    await confirm.callback(interaction)
    remove.assert_awaited_once_with("openrouter", "safe-id")
    rendered = str(interaction.response.edit_message.await_args_list)
    assert "private@example.com" not in rendered

