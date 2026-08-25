"""Agentik OS business command layer.

Hermes remains the runtime. This plugin owns the persistent business objects
and their command grammar without adding model-tool schema to the core.
"""

from __future__ import annotations

from .commands import AgentikCommandService


def register(ctx) -> None:
    service = AgentikCommandService.from_runtime()
    for name in service.command_names:
        ctx.register_command(
            name,
            handler=service.handler(name),
            description=service.description(name),
            args_hint="<action> [target] [options]",
        )

