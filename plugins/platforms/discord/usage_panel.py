"""Interactive Discord account-usage panel.

The adapter owns command routing and authorization policy; this module owns the
Discord UI state and redacted per-credential quota rendering.
"""

from __future__ import annotations

import asyncio
import datetime as dt
import re
from typing import Any

import discord


_DISCORD_USAGE_FETCH_TIMEOUT_SECONDS = 16.0
_DISCORD_USAGE_FETCH_CONCURRENCY = 4


async def send_usage_panel_interaction(
    adapter: Any,
    interaction: "discord.Interaction",
) -> None:
    """Open an ephemeral panel for session tokens and provider limits.

    Only redacted pool metadata reaches Discord. Credentials are read
    immediately before the shared account-usage fetch, kept in memory,
    and never interpolated into UI text or exception messages.
    """
    if not await adapter._check_slash_authorization(interaction, "/usage"):
        return

    # Provider calls can outlive Discord's three-second acknowledgement
    # window. Deferring ephemerally fixes the visibility of every later
    # edit to this interaction response.
    await interaction.response.defer(ephemeral=True)

    providers = (
        ("openai-codex", "OpenAI / ChatGPT"),
        ("anthropic", "Anthropic / Claude"),
    )
    provider_labels = dict(providers)

    def entry_token(entry) -> str:
        try:
            token = getattr(entry, "runtime_api_key", "")
        except Exception:
            token = ""
        if not token:
            token = getattr(entry, "access_token", "")
        return str(token or "").strip()

    def entry_status(entry) -> str:
        raw = str(getattr(entry, "last_status", None) or "ok").lower()
        return raw if raw in {"ok", "exhausted", "dead"} else "unknown"

    def entry_priority(entry, fallback: int) -> int:
        try:
            return int(getattr(entry, "priority", fallback))
        except (TypeError, ValueError):
            return fallback

    def load_entries() -> dict[str, list]:
        from agent.credential_pool import load_pool

        entries_by_provider: dict[str, list] = {}
        for provider, _label in providers:
            try:
                candidates = list(load_pool(provider).entries())
            except Exception:
                candidates = []
            safe_entries = []
            for entry in candidates:
                credential_id = str(getattr(entry, "id", "") or "")
                if not re.fullmatch(r"[A-Za-z0-9_-]{1,64}", credential_id):
                    continue
                # Metadata-only borrowed references are not usable account
                # credentials and must not appear as selectable accounts.
                if not entry_token(entry):
                    continue
                safe_entries.append(entry)
            entries_by_provider[provider] = sorted(
                safe_entries,
                key=lambda item: (
                    entry_priority(item, len(safe_entries)),
                    str(getattr(item, "id", "") or ""),
                ),
            )
        return entries_by_provider

    async def fetch_snapshots(
        entries_by_provider: dict[str, list],
    ) -> dict[tuple[str, str], Any]:
        from agent.account_usage import AccountUsageSnapshot, fetch_account_usage

        semaphore = asyncio.Semaphore(_DISCORD_USAGE_FETCH_CONCURRENCY)

        async def fetch_one(provider: str, entry):
            credential_id = str(entry.id)
            token = entry_token(entry)
            try:
                base_url = getattr(entry, "runtime_base_url", None)
            except Exception:
                base_url = getattr(entry, "base_url", None)

            async with semaphore:
                try:
                    snapshot = await asyncio.wait_for(
                        asyncio.to_thread(
                            fetch_account_usage,
                            provider,
                            base_url=base_url,
                            api_key=token,
                        ),
                        timeout=_DISCORD_USAGE_FETCH_TIMEOUT_SECONDS,
                    )
                except asyncio.TimeoutError:
                    reason = "Provider account-limit request timed out."
                except Exception:
                    # HTTP/client exceptions can echo auth headers or
                    # credential-bearing URLs. Keep the reason generic.
                    reason = "Provider account-limit request failed."
                else:
                    if snapshot is not None:
                        return (provider, credential_id), snapshot
                    reason = "Provider returned no account-limit data."

            return (
                (provider, credential_id),
                AccountUsageSnapshot(
                    provider=provider,
                    source="usage_panel",
                    fetched_at=dt.datetime.now(dt.timezone.utc),
                    unavailable_reason=reason,
                ),
            )

        jobs = [
            fetch_one(provider, entry)
            for provider, _label in providers
            for entry in entries_by_provider.get(provider, [])
        ]
        if not jobs:
            return {}
        return dict(await asyncio.gather(*jobs))

    async def session_summary() -> tuple[int, int, int] | None:
        store = getattr(adapter, "_session_store", None)
        if store is None:
            return None
        try:
            event = adapter._build_slash_event(interaction, "/usage")
            entry = await asyncio.to_thread(
                store.get_or_create_session,
                event.source,
            )
            input_tokens = max(0, int(getattr(entry, "input_tokens", 0) or 0))
            output_tokens = max(0, int(getattr(entry, "output_tokens", 0) or 0))
            total_tokens = max(
                0,
                int(getattr(entry, "total_tokens", 0) or 0),
                input_tokens + output_tokens,
            )
            if not (input_tokens or output_tokens or total_tokens):
                return None
            return input_tokens, output_tokens, total_tokens
        except Exception:
            return None

    entries, session_tokens = await asyncio.gather(
        asyncio.to_thread(load_entries),
        session_summary(),
    )
    snapshots = await fetch_snapshots(entries)

    def session_lines() -> list[str]:
        lines = ["**Session tokens**"]
        if session_tokens is None:
            lines.append("No recorded session token totals are available yet.")
        else:
            input_tokens, output_tokens, total_tokens = session_tokens
            lines.append(
                f"Input: {input_tokens:,} · Output: {output_tokens:,} · "
                f"Total: {total_tokens:,}"
            )
        return lines

    def account_line(provider: str, entry, index: int) -> str:
        del provider
        return (
            f"• Account {index + 1} [`{entry.id}`] · "
            f"pool `{entry_status(entry)}` · "
            f"priority `{entry_priority(entry, index)}`"
        )

    def overview_embed():
        lines = session_lines()
        lines.extend([
            "",
            "**Account limits**",
            "Percentages below are provider quota windows, not token counts.",
        ])
        for provider, label in providers:
            lines.extend(["", f"**{label}**"])
            provider_entries = entries.get(provider) or []
            if not provider_entries:
                lines.append("• No eligible account credentials found.")
                continue
            lines.extend(
                account_line(provider, entry, index)
                for index, entry in enumerate(provider_entries)
            )
        return discord.Embed(
            title="📊 Hermes Usage",
            description="\n".join(lines),
            color=discord.Color.blue(),
        )

    def provider_embed(provider: str):
        lines = session_lines()
        lines.extend([
            "",
            "**Account limits**",
            "Select an account to inspect its provider quota windows.",
            "",
        ])
        provider_entries = entries.get(provider) or []
        if provider_entries:
            lines.extend(
                account_line(provider, entry, index)
                for index, entry in enumerate(provider_entries)
            )
        else:
            lines.append("No eligible account credentials found.")
        return discord.Embed(
            title=f"📊 {provider_labels[provider]}",
            description="\n".join(lines),
            color=discord.Color.blue(),
        )

    def account_embed(provider: str, credential_id: str, notice: str = ""):
        provider_entries = entries.get(provider) or []
        selected = next(
            (
                (index, entry)
                for index, entry in enumerate(provider_entries)
                if str(entry.id) == credential_id
            ),
            None,
        )
        if selected is None:
            return provider_embed(provider)
        index, entry = selected
        lines = [account_line(provider, entry, index)]
        if notice:
            lines.extend(["", notice])
        lines.extend(["", *session_lines(), "", "**Account limits**"])
        snapshot = snapshots.get((provider, credential_id))
        from agent.account_usage import render_account_usage_lines

        rendered = render_account_usage_lines(snapshot, markdown=True)
        if rendered and rendered[0].lstrip().startswith("📈"):
            rendered = rendered[1:]
        lines.extend(rendered or ["Unavailable: No account-limit data."])
        return discord.Embed(
            title=f"📊 {provider_labels[provider]}",
            description="\n".join(lines),
            color=discord.Color.blue(),
        )

    class UsagePanelView(discord.ui.View):
        def __init__(self):
            super().__init__(timeout=180)
            self.selected_provider: str | None = None
            self.selected_id: str | None = None
            self._refreshing = False
            self._build_controls()

        async def _authorized(self, current) -> bool:
            return await adapter._check_slash_authorization(current, "/usage")

        def _build_controls(self):
            self.clear_items()
            provider_select = discord.ui.Select(
                placeholder="Choose OpenAI or Claude...",
                options=[
                    discord.SelectOption(
                        label=label,
                        value=provider,
                        description=(
                            f"{len(entries.get(provider) or [])} eligible account(s)"
                        ),
                    )
                    for provider, label in providers
                ],
                custom_id="usage_provider_select",
            )
            provider_select.callback = self._on_provider
            self.add_item(provider_select)

            if self.selected_provider:
                provider_entries = entries.get(self.selected_provider) or []
                if provider_entries:
                    account_select = discord.ui.Select(
                        placeholder="Choose an account...",
                        options=[
                            discord.SelectOption(
                                label=(
                                    f"Account {index + 1} · "
                                    f"{entry_status(entry)} · "
                                    f"priority {entry_priority(entry, index)}"
                                )[:100],
                                value=str(entry.id),
                                description=str(entry.id)[:100],
                            )
                            for index, entry in enumerate(provider_entries[:25])
                        ],
                        custom_id=(f"usage_account_select:{self.selected_provider}"),
                    )
                    account_select.callback = self._on_account
                    self.add_item(account_select)

                switch = discord.ui.Button(
                    label="Switch",
                    style=discord.ButtonStyle.green,
                    custom_id=f"usage_switch:{self.selected_provider}",
                    disabled=not bool(self.selected_id),
                )
                switch.callback = self._on_switch
                self.add_item(switch)

            refresh = discord.ui.Button(
                label="Refresh",
                emoji="🔄",
                style=discord.ButtonStyle.grey,
                custom_id="usage_refresh",
            )
            refresh.callback = self._on_refresh
            self.add_item(refresh)

            back = discord.ui.Button(
                label="Back",
                style=discord.ButtonStyle.grey,
                custom_id="usage_back",
                disabled=not bool(self.selected_provider),
            )
            back.callback = self._on_back
            self.add_item(back)

            close = discord.ui.Button(
                label="Close",
                style=discord.ButtonStyle.red,
                custom_id="usage_close",
            )
            close.callback = self._on_close
            self.add_item(close)

        async def _on_provider(self, current):
            if not await self._authorized(current):
                return
            provider = str((current.data.get("values") or [""])[0])
            if provider not in provider_labels:
                return
            self.selected_provider = provider
            self.selected_id = None
            self._build_controls()
            await current.response.edit_message(
                embed=provider_embed(provider),
                view=self,
            )

        async def _on_account(self, current):
            if not await self._authorized(current):
                return
            if not self.selected_provider:
                return
            credential_id = str((current.data.get("values") or [""])[0])
            valid_ids = {
                str(entry.id) for entry in entries.get(self.selected_provider) or []
            }
            if credential_id not in valid_ids:
                return
            self.selected_id = credential_id
            self._build_controls()
            await current.response.edit_message(
                embed=account_embed(self.selected_provider, credential_id),
                view=self,
            )

        async def _on_switch(self, current):
            if not await self._authorized(current):
                return
            if not self.selected_provider or not self.selected_id:
                return
            result = await adapter._prefer_account_credential(
                self.selected_provider,
                self.selected_id,
            )
            if result == "saved":
                notice = "Account preference saved for future eligible selections."
            else:
                notice = "That account is unavailable or missing."
            await current.response.edit_message(
                embed=account_embed(
                    self.selected_provider,
                    self.selected_id,
                    notice,
                ),
                view=self,
            )

        async def _on_refresh(self, current):
            nonlocal entries, snapshots, session_tokens
            if not await self._authorized(current):
                return
            if self._refreshing:
                await current.response.defer()
                return
            self._refreshing = True
            await current.response.defer()
            try:
                entries, session_tokens = await asyncio.gather(
                    asyncio.to_thread(load_entries),
                    session_summary(),
                )
                snapshots = await fetch_snapshots(entries)
                if self.selected_provider not in provider_labels:
                    self.selected_provider = None
                    self.selected_id = None
                elif self.selected_id not in {
                    str(entry.id) for entry in entries.get(self.selected_provider) or []
                }:
                    self.selected_id = None
                self._build_controls()
                if self.selected_provider and self.selected_id:
                    embed = account_embed(
                        self.selected_provider,
                        self.selected_id,
                    )
                elif self.selected_provider:
                    embed = provider_embed(self.selected_provider)
                else:
                    embed = overview_embed()
                await current.edit_original_response(embed=embed, view=self)
            finally:
                self._refreshing = False

        async def _on_back(self, current):
            if not await self._authorized(current):
                return
            if self.selected_id:
                self.selected_id = None
                embed = provider_embed(self.selected_provider)
            else:
                self.selected_provider = None
                embed = overview_embed()
            self._build_controls()
            await current.response.edit_message(embed=embed, view=self)

        async def _on_close(self, current):
            if not await self._authorized(current):
                return
            self.clear_items()
            await current.response.edit_message(
                embed=discord.Embed(
                    title="📊 Hermes Usage",
                    description="Usage panel closed.",
                    color=discord.Color.greyple(),
                ),
                view=self,
            )
            stop = getattr(self, "stop", None)
            if callable(stop):
                stop()

    view = UsagePanelView()
    await interaction.edit_original_response(
        embed=overview_embed(),
        view=view,
    )
