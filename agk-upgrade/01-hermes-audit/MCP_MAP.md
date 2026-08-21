# Hermes MCP Map

## Implementation

Primary implementation lives in `tools/mcp_tool.py`, `tools/mcp_oauth_manager.py`, `hermes_cli/mcp_config.py` and the catalog. `tui_gateway/methods_tools.py` exposes per-profile MCP management RPCs.

## Capabilities

- stdio servers
- remote Streamable HTTP servers
- OAuth flows
- API-key and header configuration
- server test and Tool discovery
- catalog install, enable, disable and removal
- per-profile configuration
- dynamic Tool registration and toolsets
- portable Agent Plugin MCP subset

## Security behavior

Remote URLs are validated. Plain HTTP is limited to loopback in portable packages. Cross-origin redirect headers are not forwarded. MCP processes receive filtered environment according to Hermes secret scoping. External MCP code and content remain untrusted.

## AGK mapping

ADAPT the MCP transport and OAuth machinery behind the effect and secret broker. MCP is not an AGK Tool type. An MCP server is represented through Connector and Adapter bindings, and its exposed functions map to AGK Tool Definitions and scoped Tool Bindings. Installation displays requested capabilities and trust before activation.

## Limitations

Dynamic discovery can change model schema and must respect Session prompt-cache boundaries. MCP process isolation depends on the whole-process Runtime posture rather than MCP configuration alone. The pinned source passes secret-source-tagged environment variables too broadly for per-server AGK grants, so governed stdio MCP remains disabled until task 036 remediates or capability-disables it.
