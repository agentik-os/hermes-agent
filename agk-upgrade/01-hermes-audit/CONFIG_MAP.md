# Hermes Configuration Map

## Sources

- `$HERMES_HOME/config.yaml`: non-secret behavior settings
- `$HERMES_HOME/.env`: credentials and secrets only
- `$HERMES_HOME/auth.json`: OAuth and credential pools
- profile directories: isolated state
- process environment: invocation and compatibility overrides
- command arguments: highest-priority invocation choices

## Loaders

`hermes_cli/config.py::load_config` serves setup and commands. `cli.py::load_cli_config` adds CLI behavior. Gateway paths read configuration through gateway loaders and profile-scoped secret context. These paths are not interchangeable.

## Profile behavior

`hermes_cli/main.py::_apply_profile_override` establishes HERMES_HOME before imports. All state paths must use `hermes_constants.get_hermes_home`. Multiplex profiles use scoped secret reads that fail closed rather than borrowing the default profile environment.

## Major sections

Model, Agent, terminal, compression, display, Memory, security, delegation, smart routing, checkpoints, auxiliary tasks, curator, Skills, gateway, logging, cron, profiles, plugins, loops, goals and Tool configuration.

## AGK mapping

Hermes config is an adapter implementation detail. AGK Harness, Agent, OS Installation and Runtime bindings compile into a profile configuration. Public AGK APIs never expose arbitrary Hermes config keys. Secrets remain references and are not rendered into generated config files.
