"""Agentik OS business command layer.

Hermes remains the runtime. This plugin owns the persistent business objects
and their command grammar without adding model-tool schema to the core.
"""

from __future__ import annotations

from .commands import AgentikCommandService
from .runtime_tool import RUNTIME_TOOL_SCHEMA, handle_runtime, runtime_available


def register(ctx) -> None:
    service = AgentikCommandService.from_runtime()
    for name in service.command_names:
        ctx.register_command(
            name,
            handler=service.handler(name),
            description=service.description(name),
            args_hint="<action> [target] [options]",
        )
    ctx.register_tool(
        name="agentik_runtime",
        toolset="agentik_runtime",
        schema=RUNTIME_TOOL_SCHEMA,
        handler=handle_runtime,
        check_fn=runtime_available,
        description="Persistent per-user Hermes, Claude and Codex orchestration through AGK/RMUX.",
        emoji="🧭",
    )
