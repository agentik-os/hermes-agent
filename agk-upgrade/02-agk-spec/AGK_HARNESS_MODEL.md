# AGK Harness Model

## Definition

A Harness is the logical execution configuration used by a Run. Runtime is the physical execution environment.

## Harness Definition

A versioned Harness declares:

- agent runtime adapter and required version
- model policy and reasoning requirements
- Tool and Skill exposure
- Context compilation policy
- working directory and repository rules
- environment and sandbox requirements
- network and secret policies
- time, iteration, concurrency and Budget limits
- checkpoint, interruption and recovery behavior
- event and artifact contracts

## Binding

A Session or Deployment binds a Harness Definition to a Runtime that declares compatible capabilities. The resulting effective configuration is immutable for one Run.

## Hermes mapping

Hermes toolsets, config, profile, terminal backend, provider resolution and callbacks form much of a Harness implementation. `HermesRuntimeAdapter` compiles the AGK Harness into profile and session configuration without exposing Hermes config as the AGK contract.

## Security

A Harness may narrow Runtime capability and never broaden AGK authorization. Whole-process sandbox policy is explicit. Terminal-backend selection alone does not imply that plugins, MCP or code execution are contained.
