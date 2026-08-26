"""Interactive Discord /usage panel contracts.

Provider quota calls are always mocked: these tests never contact OpenAI or
Anthropic and never persist credential changes.
"""

from datetime import datetime, timedelta, timezone
from types import SimpleNamespace
import threading
from unittest.mock import AsyncMock, Mock

import pytest

from agent.account_usage import AccountUsageSnapshot, AccountUsageWindow
from gateway.config import PlatformConfig
from plugins.platforms.discord.adapter import DiscordAdapter


def _entry(
    credential_id: str,
    secret: str,
    *,
    priority: int,
    status: str = "ok",
    label: str = "private@example.com",
):
    return SimpleNamespace(
        id=credential_id,
        priority=priority,
        last_status=status,
        label=label,
        access_token=secret,
        runtime_api_key=secret,
        runtime_base_url="https://chatgpt.com/backend-api/codex",
    )


def _interaction(*, values=(), user_id=7):
    channel = SimpleNamespace(
        id=10,
        name="general",
        guild=SimpleNamespace(name="Hermes Test"),
    )
    return SimpleNamespace(
        user=SimpleNamespace(
            id=user_id,
            name=f"user-{user_id}",
            display_name=f"User {user_id}",
            roles=[],
        ),
        channel=channel,
        channel_id=channel.id,
        guild_id=99,
        data={"values": list(values)},
        response=SimpleNamespace(
            defer=AsyncMock(),
            send_message=AsyncMock(),
            edit_message=AsyncMock(),
        ),
        edit_original_response=AsyncMock(),
    )


@pytest.fixture
def adapter():
    result = DiscordAdapter(PlatformConfig(enabled=True, token="fake"))
    result._allowed_user_ids = {"7"}
    result._allowed_role_ids = set()
    result._check_slash_authorization = AsyncMock(return_value=True)
    result._session_store = SimpleNamespace(
        get_or_create_session=lambda _source: SimpleNamespace(
            input_tokens=1_250,
            output_tokens=350,
            total_tokens=1_600,
        )
    )
    return result


def _install_pools(monkeypatch):
    entries = {
        "openai-codex": [
            _entry("oa-primary", "sk-openai-primary-SECRET", priority=0),
            _entry(
                "oa-backup",
                "sk-openai-backup-SECRET",
                priority=2,
                status="exhausted",
                label="owner@example.com",
            ),
        ],
        "anthropic": [
            _entry(
                "claude-max",
                "sk-ant-oat01-claude-SECRET",
                priority=1,
                label="claude@example.com",
            )
        ],
    }
    monkeypatch.setattr(
        "agent.credential_pool.load_pool",
        lambda provider: SimpleNamespace(entries=lambda: list(entries[provider])),
    )
    return entries


def _install_usage_snapshots(monkeypatch):
    reset = datetime.now(timezone.utc) + timedelta(hours=2)
    snapshots = {
        "sk-openai-primary-SECRET": AccountUsageSnapshot(
            provider="openai-codex",
            source="usage_api",
            fetched_at=datetime.now(timezone.utc),
            plan="Plus",
            windows=(AccountUsageWindow("Session", used_percent=20, reset_at=reset),),
        ),
        "sk-openai-backup-SECRET": AccountUsageSnapshot(
            provider="openai-codex",
            source="usage_api",
            fetched_at=datetime.now(timezone.utc),
            plan="Team",
            windows=(AccountUsageWindow("Weekly", used_percent=60, reset_at=reset),),
            details=("Credits balance: $4.50",),
        ),
        "sk-ant-oat01-claude-SECRET": AccountUsageSnapshot(
            provider="anthropic",
            source="oauth_usage_api",
            fetched_at=datetime.now(timezone.utc),
            plan="Max",
            windows=(
                AccountUsageWindow("Current session", used_percent=25, reset_at=reset),
            ),
            details=("Extra usage: 2.00 / 10.00 USD",),
        ),
    }
    calls = []

    def fetch(provider, *, base_url=None, api_key=None):
        calls.append((provider, base_url, api_key))
        return snapshots[api_key]

    monkeypatch.setattr("agent.account_usage.fetch_account_usage", fetch)
    return calls


@pytest.mark.asyncio
async def test_usage_panel_is_ephemeral_lists_accounts_and_maps_real_snapshots(
    adapter, monkeypatch
):
    entries = _install_pools(monkeypatch)
    calls = _install_usage_snapshots(monkeypatch)
    interaction = _interaction()

    await adapter._send_usage_panel_interaction(interaction)

    interaction.response.defer.assert_awaited_once_with(ephemeral=True)
    rendered = interaction.edit_original_response.await_args.kwargs
    view = rendered["view"]
    overview = rendered["embed"].description

    assert "**Session tokens**" in overview
    assert "Input: 1,250" in overview
    assert "Output: 350" in overview
    assert "Total: 1,600" in overview
    assert "provider quota windows, not token counts" in overview
    assert "Account 1 [`oa-primary`]" in overview
    assert "Account 2 [`oa-backup`]" in overview
    assert "Account 1 [`claude-max`]" in overview
    assert "pool `exhausted`" in overview
    assert "priority `2`" in overview
    assert {call[0] for call in calls} == {"openai-codex", "anthropic"}
    assert {call[2] for call in calls} == {
        entry.runtime_api_key
        for provider_entries in entries.values()
        for entry in provider_entries
    }

    provider = next(
        item for item in view.children if item.custom_id == "usage_provider_select"
    )
    assert {option.value for option in provider.options} == {
        "openai-codex",
        "anthropic",
    }
    provider_interaction = _interaction(values=["anthropic"])
    await provider.callback(provider_interaction)
    account = next(
        item
        for item in view.children
        if item.custom_id == "usage_account_select:anthropic"
    )
    account_interaction = _interaction(values=["claude-max"])
    await account.callback(account_interaction)
    detail = account_interaction.response.edit_message.await_args.kwargs[
        "embed"
    ].description

    assert "Account 1 [`claude-max`]" in detail
    assert "Provider: anthropic (Max)" in detail
    assert "75% remaining (25% used)" in detail
    assert "resets" in detail
    assert "Extra usage: 2.00 / 10.00 USD" in detail
    assert "token count" not in detail.lower()

    provider = next(
        item for item in view.children if item.custom_id == "usage_provider_select"
    )
    await provider.callback(_interaction(values=["openai-codex"]))
    account = next(
        item
        for item in view.children
        if item.custom_id == "usage_account_select:openai-codex"
    )
    openai_interaction = _interaction(values=["oa-backup"])
    await account.callback(openai_interaction)
    openai_detail = openai_interaction.response.edit_message.await_args.kwargs[
        "embed"
    ].description

    assert "Account 2 [`oa-backup`]" in openai_detail
    assert "Provider: openai-codex (Team)" in openai_detail
    assert "40% remaining (60% used)" in openai_detail
    assert "Credits balance: $4.50" in openai_detail
    assert {item.custom_id for item in view.children} == {
        "usage_provider_select",
        "usage_account_select:openai-codex",
        "usage_switch:openai-codex",
        "usage_refresh",
        "usage_back",
        "usage_close",
    }

    all_rendered = overview + detail + openai_detail + repr(view.children)
    for entry in (item for group in entries.values() for item in group):
        assert entry.runtime_api_key not in all_rendered
        assert entry.label not in all_rendered


@pytest.mark.asyncio
async def test_usage_panel_switch_uses_canonical_credential_preference(
    adapter, monkeypatch
):
    _install_pools(monkeypatch)
    _install_usage_snapshots(monkeypatch)
    prefer = Mock(return_value="saved")
    monkeypatch.setattr("hermes_cli.auth.prefer_eligible_credential", prefer)
    interaction = _interaction()

    await adapter._send_usage_panel_interaction(interaction)
    view = interaction.edit_original_response.await_args.kwargs["view"]
    provider = next(
        item for item in view.children if item.custom_id == "usage_provider_select"
    )
    await provider.callback(_interaction(values=["openai-codex"]))
    account = next(
        item
        for item in view.children
        if item.custom_id == "usage_account_select:openai-codex"
    )
    await account.callback(_interaction(values=["oa-primary"]))
    switch = next(
        item for item in view.children if item.custom_id == "usage_switch:openai-codex"
    )
    switch_interaction = _interaction()

    await switch.callback(switch_interaction)

    prefer.assert_called_once_with("openai-codex", "oa-primary")
    message = switch_interaction.response.edit_message.await_args.kwargs[
        "embed"
    ].description
    assert "preference saved" in message.lower()


@pytest.mark.asyncio
async def test_usage_panel_denies_unauthorized_component_before_mutation(
    adapter, monkeypatch
):
    _install_pools(monkeypatch)
    _install_usage_snapshots(monkeypatch)
    interaction = _interaction()
    await adapter._send_usage_panel_interaction(interaction)
    view = interaction.edit_original_response.await_args.kwargs["view"]
    provider = next(
        item for item in view.children if item.custom_id == "usage_provider_select"
    )
    await provider.callback(_interaction(values=["openai-codex"]))
    account = next(
        item
        for item in view.children
        if item.custom_id == "usage_account_select:openai-codex"
    )
    await account.callback(_interaction(values=["oa-primary"]))

    async def deny(component_interaction, command):
        assert command == "/usage"
        await component_interaction.response.send_message(
            "You're not authorized to use this command.", ephemeral=True
        )
        return False

    adapter._check_slash_authorization = deny
    for item in list(view.children):
        unauthorized = _interaction(values=["anthropic"], user_id=99)
        await item.callback(unauthorized)
        unauthorized.response.send_message.assert_awaited_once_with(
            "You're not authorized to use this command.", ephemeral=True
        )
        unauthorized.response.edit_message.assert_not_awaited()
        unauthorized.edit_original_response.assert_not_awaited()


@pytest.mark.asyncio
async def test_usage_panel_renders_unavailable_reason_without_secrets(
    adapter, monkeypatch
):
    entries = _install_pools(monkeypatch)

    def unavailable(provider, *, base_url=None, api_key=None):
        if provider == "anthropic":
            return AccountUsageSnapshot(
                provider="anthropic",
                source="oauth_usage_api",
                fetched_at=datetime.now(timezone.utc),
                unavailable_reason="OAuth account limits are unavailable.",
            )
        return None

    monkeypatch.setattr("agent.account_usage.fetch_account_usage", unavailable)
    interaction = _interaction()
    await adapter._send_usage_panel_interaction(interaction)
    view = interaction.edit_original_response.await_args.kwargs["view"]
    provider = next(
        item for item in view.children if item.custom_id == "usage_provider_select"
    )
    await provider.callback(_interaction(values=["anthropic"]))
    account = next(
        item
        for item in view.children
        if item.custom_id == "usage_account_select:anthropic"
    )
    account_interaction = _interaction(values=["claude-max"])

    await account.callback(account_interaction)

    detail = account_interaction.response.edit_message.await_args.kwargs[
        "embed"
    ].description
    assert "pool `ok`" in detail
    assert "Unavailable: OAuth account limits are unavailable." in detail

    provider = next(
        item for item in view.children if item.custom_id == "usage_provider_select"
    )
    await provider.callback(_interaction(values=["openai-codex"]))
    account = next(
        item
        for item in view.children
        if item.custom_id == "usage_account_select:openai-codex"
    )
    no_data_interaction = _interaction(values=["oa-primary"])
    await account.callback(no_data_interaction)
    no_data_detail = no_data_interaction.response.edit_message.await_args.kwargs[
        "embed"
    ].description
    assert "Unavailable: Provider returned no account-limit data." in no_data_detail

    for entry in (item for group in entries.values() for item in group):
        assert entry.runtime_api_key not in detail + no_data_detail
        assert entry.label not in detail + no_data_detail


@pytest.mark.asyncio
async def test_usage_panel_fetches_account_snapshots_concurrently(adapter, monkeypatch):
    _install_pools(monkeypatch)
    barrier = threading.Barrier(3)
    completed = []

    def fetch(provider, *, base_url=None, api_key=None):
        barrier.wait(timeout=5)
        completed.append((provider, api_key))
        return AccountUsageSnapshot(
            provider=provider,
            source="mock",
            fetched_at=datetime.now(timezone.utc),
            windows=(AccountUsageWindow("Quota", used_percent=10),),
        )

    monkeypatch.setattr("agent.account_usage.fetch_account_usage", fetch)

    await adapter._send_usage_panel_interaction(_interaction())

    assert len(completed) == 3
