## Audit outcome

Read-only audit completed against local commit `8794e5a21c980a0f26532cb4883284b786cb3f25` on `agk/upgrade-architecture`, including root `AGENTS.md`, implementation, documentation, tests, CI, installers, packaging, Docker, remote backends, desktop SSH/cloud routing, and gateway security.

**Important Git state:** the checkout is shallow and upstream moved during the audit:

- Local HEAD: `8794e5a21c`
- Nous `origin/main`: `76952ba54f`
- AGK `fork/main`: `c1e25cadff`
- No merge base can be computed from the shallow history.

Conclusions therefore describe the audited local snapshot, not newer upstream commits.

---

## 1. Actually supported deployment topologies

| Topology | Implementation and evidence | Support assessment |
|---|---|---|
| Native source install | `scripts/install.sh::{install_uv, install_node, install_node_deps}`; `scripts/install.ps1::{Install-Repository, Install-Venv, Install-Dependencies, Invoke-AllStages}` | Primary install model. Source checkout plus editable Python environment, not a normal packaged application. |
| Host-managed gateway | `hermes_cli/service_manager.py`; `hermes_cli/gateway.py`; `hermes_cli/gateway_windows.py` | systemd user/system, launchd, Windows Task Scheduler/service-style paths, and manual fallback are implemented. |
| Nix | `flake.nix`, `nix/python.nix`, `nix/hermes-agent.nix`, `nix/nixosModules.nix`, `nix/homeManagerModules.nix` | Concrete support for x86_64/aarch64 Linux and aarch64 Darwin. Tier 2 in docs but has a real `nix flake check` workflow. |
| Official Docker, single container | `Dockerfile`; `docker/stage2-hook.sh`; `docker/main-wrapper.sh`; `docker/s6-rc.d/**`; `hermes_cli/container_boot.py` | Real multi-arch deployment. s6 supervises gateway, dashboard, and per-profile gateway slots; `$HERMES_HOME` persists at `/opt/data`. |
| Split gateway/dashboard Compose | `docker-compose.yml` | Intended Linux host-network topology, but shipped configuration does not satisfy its own cross-container liveness assumptions; see defects below. |
| Windows Docker Compose | `docker-compose.windows.yml` | Gateway container is plausible; dashboard service is currently contradictory/broken because it requests public insecure mode, which code intentionally rejects. |
| Local Electron desktop | `apps/desktop/electron/main.ts`, `apps/desktop/electron/backend-manager.ts` | Desktop launches/controls a local Hermes backend. Packaging targets exist, but repository CI does not demonstrate signed production installers across all claimed platforms. |
| Desktop → remote URL | `apps/desktop/electron/desktop-remote-route.ts`, `connection-config.ts`, `desktop-remote-auth.ts` | Token, custom-header, and OAuth-authenticated remote dashboard/gateway connectivity is implemented. |
| Desktop → remote host over SSH | `apps/desktop/electron/ssh-connection.ts::SshConnection`; `remote-lifecycle.ts`; `windows-remote-lifecycle.ts::connectWindowsRemote` | Distinct from terminal SSH. Desktop bootstraps `hermes serve` remotely and tunnels it to local loopback. Linux, macOS, and Windows probes exist. |
| Hermes Cloud desktop connection | `apps/desktop/electron/main.ts::{discoverCloudAgents, cloudAgentSilentSignIn, renewPortalAccessSilently}` | Client-side discovery and OAuth cascade are implemented. Provisioning, tenancy, and the `/api/agents` service live outside this repository. |
| Fly Machines scale-to-zero | `gateway/scale_to_zero.py`; integration in `gateway/run.py`; Fly API socket handling in `docker/stage2-hook.sh` | Concrete but provider-specific hosted lifecycle. Requires external relay/wake infrastructure and Fly runtime integration. |
| Generic Lambda/Cloud Run/Workers/Kubernetes serverless | No provider deployment implementation or first-class manifests found | **Not turnkey supported.** Hermes is long-lived and stateful: SQLite, WebSockets/polling, gateway locks, background jobs, subprocesses, and persistent `$HERMES_HOME`. |

### Gateway surfaces

`gateway/config.py::Platform` plus platform-plugin registrations expose **33 distinct external surfaces** in this snapshot:

`a2a`, `api_server`, `bluebubbles`, `buzz`, `dingtalk`, `discord`, `email`, `feishu`, `google_chat`, `homeassistant`, `irc`, `line`, `matrix`, `mattermost`, `msgraph_webhook`, `ntfy`, `photon`, `qqbot`, `raft`, `relay`, `signal`, `simplex`, `slack`, `sms`, `teams`, `telegram`, `webhook`, `wecom`, `wecom_callback`, `weixin`, `whatsapp`, `whatsapp_cloud`, `yuanbao`.

This is code presence, not equal maturity: dependencies, authentication, delivery semantics, and test depth differ significantly by adapter.

---

## 2. Remote terminal/execution backends

Selection and lifecycle are centralized in `tools/terminal_tool.py::{_get_env_config, create_environment, check_terminal_requirements}` and `tools/environments/base.py::Environment`.

| Backend | Exact implementation | Boundary and caveats |
|---|---|---|
| Local | `tools/environments/local.py::LocalEnvironment` | Executes with the Hermes OS user's full authority. It is not a sandbox. |
| Docker/Podman | `tools/environments/docker.py::DockerEnvironment` | Persistent or per-session container; cgroup limits where available; caps dropped and `no-new-privileges`; network remains enabled by default. Host mounts, host networking, Docker socket, or `docker_extra_args` can destroy the isolation boundary. |
| Singularity/Apptainer | `tools/environments/singularity.py::SingularityEnvironment` | Local HPC/container isolation with overlays and read-only support-file binds. Unit/preflight tested, not live CI tested. |
| SSH | `tools/environments/ssh.py::SSHEnvironment` | Remote POSIX `bash` execution using ControlMaster. Support files are copied, but the local project is not transparently cloned or mounted. |
| Modal direct | `tools/environments/modal.py::ModalEnvironment` | User-owned Modal account/app, snapshots, mounted/uploaded support files. External cloud trust boundary. |
| Modal managed | `tools/environments/managed_modal.py::ManagedModalEnvironment` | Nous Tool Gateway-managed execution. Explicitly refuses credential-file passthrough. Internally selected as a Modal mode rather than a public eighth backend. |
| Daytona | `tools/environments/daytona.py::DaytonaEnvironment` | Named persistent cloud sandbox via Daytona SDK; stopped/resumed and synced. |
| Vercel Sandbox | `tools/environments/vercel_sandbox.py::VercelSandboxEnvironment` | MicroVM with snapshot reuse; only `node24`, `node22`, and `python3.13` are accepted by `terminal_tool.py::_check_vercel_sandbox_requirements`. |

Evidence exists in `tests/tools/test_{ssh,daytona,managed_modal,vercel_sandbox}_environment.py`, `test_singularity_preflight.py`, and opt-in `tests/integration/test_{modal,daytona}_terminal.py`. Standard CI does **not** exercise live SSH, Modal, Daytona, or Vercel accounts.

---

## 3. Install, update, package, and workspace findings

### Packaging

- Python metadata and entry points live in `pyproject.toml`.
- `setup.py::_GuardedSdist` and `_GuardedBdistWheel` deliberately reject wheel/sdist builds unless `HERMES_NIX_BUILD=1`.
- Runtime assets—skills, locales, dashboard/TUI builds, plugin manifests—assume a source/Nix/container layout. PyPI/pip installation is intentionally unsupported.
- JavaScript/Rust surfaces include:
  - Root npm workspaces and `package-lock.json`
  - `apps/desktop`
  - `apps/bootstrap-installer`
  - `apps/shared`
  - `web`
  - `ui-tui` and `ui-tui/packages/hermes-ink`
  - `website`
  - `tests-js`
  - WhatsApp bridge and Photon sidecar
  - Independent Tauri/Rust crate.

### Update behavior

- Install-mode detection: `hermes_cli/config.py::detect_install_method`.
- Main updater: `hermes_cli/update_cmd.py::_cmd_update_impl`.
- Git/source installs are updated in place using `origin` and a branch, defaulting to `main`.
- Docker, Nix, and Termux APT are redirected to their external package/image update mechanisms.
- Windows includes ZIP/re-clone repair paths.
- Update performs autostash, backup, dependency repair, config migration, and rollback logic, but does **not** verify signed Git tags/commits.

### Fork hazard

`hermes_cli/update_cmd.py` treats remote name **`origin`** as authoritative, and missing remotes are repaired toward the Nous repository. In this checkout:

- `origin` = Nous
- `fork` = Agentik OS

Allowing stock `hermes update` in an AGK build can therefore move an AGK installation back toward upstream code or overwrite the intended downstream patch set.

### Supply-chain gaps

- `scripts/install.sh::install_uv` executes a freshly downloaded Astral installer without an AGK-pinned digest.
- `install_node` downloads a dynamically resolved Node tarball without checking Node's published checksum/signature.
- Windows runs remote uv and cua-driver PowerShell installers with `Invoke-Expression`.
- Unix installation uses `npm install`, not immutable `npm ci`.
- Locked Python installs are preferred, but fallback tiers can re-resolve ranged dependencies.
- `apps/bootstrap-installer/src-tauri/Cargo.lock` is intentionally absent; `.github/workflows/rust-tests.yml` explicitly acknowledges that the signed-installer dependency graph re-resolves on every build.
- `scripts/release.py::update_version_files` updates bootstrap-installer package/Tauri/Cargo versions but stages `apps/desktop/package.json` instead of the bootstrap package manifest—a concrete release-staging defect with no focused release test.

---

## 4. Security boundaries

### Dashboard

Exact boundary:

- `hermes_cli/web_server.py::start_server`
- `hermes_cli/dashboard_auth/middleware.py::gated_auth_middleware`
- `registry.py`
- `token_auth.py::TokenAuthProvider`
- `ws_tickets.py::WebSocketTicketStore`
- `public_paths.py`

Behavior:

- Loopback mode uses an internal session token.
- Non-loopback binding fails closed unless an auth provider exists.
- `HERMES_DASHBOARD_INSECURE=1` and `--insecure` are deprecated no-ops.
- WebSockets use short-lived tickets and origin/auth checks.
- TLS termination is external.

**Tenancy warning:** one authenticated dashboard principal can administer the profiles visible to that dashboard process. Profiles are not separate dashboard-RBAC tenants.

### OpenAI-compatible API server

`gateway/platforms/api_server.py::{has_usable_secret, require_api_key, run_api_server}` provides:

- API-key validation
- 16-character minimum secret
- Non-loopback bind guard
- rate and request-size controls
- public `/health`; authenticated detailed/admin routes.

`tests/gateway/test_api_server_bind_guard.py` and `test_api_server_key_minimum_length.py` cover the guards.

### Messaging authorization and pairing

- `gateway/authz_mixin.py::AuthorizationMixin._is_user_authorized`
- `gateway/pairing.py::PairingStore`

Direct-user behavior is generally default-deny unless an allowlist, allow-all policy, or pairing authorizes the sender. Adapter-specific and group policies remain separate; the existence of the mixin should not be treated as uniform authorization parity across all 33 surfaces.

### Profiles are logical isolation, not tenancy isolation

`agent/secret_scope.py::{set_secret_scope, get_secret}` implements context-local, fail-closed credential resolution during multiplexing. There is substantial regression coverage.

However:

- Profiles share one OS process, address space, plugin runtime, and often one dashboard.
- `tests/test_profile_isolation_runtime.py::test_raw_thread_loses_override` explicitly demonstrates that a raw thread does not inherit profile context.
- `AGENTS.md` acknowledges `_get_scoped_secret` logic is duplicated across roughly 15 adapters.
- This is defense against accidental cross-profile leakage, not a hard hostile-tenant boundary.

### Command and filesystem protection

- Shell command policy: `tools/approval.py::check_all_command_guards`.
- File write safety is enforced separately in file tools; file writes do not receive the same interactive command-approval prompt.
- Container guard relaxation applies only when isolation remains meaningful. `DockerEnvironment.has_host_access()` re-enables host-level protections for risky mounts/privileges.
- `--yolo`/approval-off bypasses most recoverable approval controls.

### Remote credential and sync boundary

`tools/environments/file_sync.py::FileSyncManager._sync_back_impl` implements:

- Credentials: upload-only.
- Skills/support directories: bidirectional reconciliation, with remote winning conflicts and newly created remote files synced back.

That means a compromised cloud/SSH sandbox can persist modified skills or prompt-bearing files onto the host. Tests such as `tests/tools/test_file_sync.py` and `test_file_sync_back.py` demonstrate this is intentional behavior.

Direct cloud backends receive readable credentials/support files and normally have network egress. Managed Modal is the exception: it rejects credential-file passthrough.

### SSH distinctions

- Terminal SSH (`tools/environments/ssh.py`) uses `StrictHostKeyChecking=accept-new`, performs no strong target validation, and builds its ControlMaster directory without the ownership/symlink hardening found in the desktop implementation.
- Desktop SSH (`apps/desktop/electron/ssh-connection.ts::{validateSshTarget, validateKeyPath, SshConnection.open}`) validates targets and control-directory ownership/mode and uses `--` when constructing SSH arguments.

Terminal SSH should reuse the desktop hardening model.

### Plugins and MCP

- Enabled user plugins execute arbitrary Python inside the Hermes process; static install scanning is a heuristic, not sandboxing.
- MCP stdio explicitly permits arbitrary local commands. `hermes_cli/mcp_security.py::validate_mcp_server_entry` blocks only narrow IOC, shell-egress, and persistence signatures.
- `tools/mcp_tool.py::_build_safe_env` filters ambient secrets but intentionally passes **every external-secret-source-tagged variable** to every configured stdio MCP subprocess. That is a wider capability than a per-server grant.

---

## 5. Test architecture and what it proves

- Canonical Python runner: `scripts/run_tests.sh` → `scripts/run_tests_parallel.py::run_test_file`.
- Per-file subprocess isolation, sanitized environment, temporary `HERMES_HOME`, and one automatic file retry.
- Static inventory at this snapshot: approximately 3,179 Python test files, 31,645 test functions, 934 JS/TS test files, and 47 Rust `#[test]` attributes.
- `pytest.ini` excludes `integration` by default.
- Core CI tests Python 3.11–3.13, JS/TS, shell, OS-marked macOS/Windows tests, and Rust library tests.
- Docker multi-arch image tests and Nix checks are separate workflows, not the central required CI lane.
- Installer E2E runs on schedule/tags, not every PR.
- Desktop Playwright E2E is disabled/not run in normal JS CI.
- No repository CI runner establishes WSL2, Windows ARM64, general Linux ARM64 outside Docker, or live cloud-provider compatibility.
- Test-file retries can allow flaky first failures to remain green.
- Existence of these tests was inspected; **the suite was not executed during this audit**.

---

## 6. Concrete documentation/configuration drift

1. **API key strength:** `website/docs/user-guide/docker.md` says 8 characters; `api_server.py::has_usable_secret` requires 16.
2. **Windows Compose:** `docker-compose.windows.yml` sets public bind plus `--insecure`, while `tests/docker/test_dashboard.py::test_dashboard_insecure_env_var_no_longer_bypasses_gate` proves that exact configuration must fail closed.
3. **Split dashboard liveness:** docs say the separate container shares PID/network namespaces; `docker-compose.yml` only sets `network_mode: host`, not a shared PID namespace, and does not set the deprecated `GATEWAY_HEALTH_URL` used by `web_server.py::_probe_gateway_health`.
4. **Node versions:** installation docs describe Node 22.17+, root npm allows `>=22.22`, while installers and Docker provision/enforce Node 26.
5. **Remote sync:** Docker docs describe rsync/Modal behavior generically; SSH uses tar/SCP, other providers use their SDKs, and managed Modal forbids credential files.
6. **Credential passthrough:** docs imply backend-uniform environment passthrough, but direct Modal/Daytona/Vercel do not mirror Docker/local passthrough semantics.
7. **Container package installs:** docs suggest the agent can run `apt-get`, although official supervised processes run as non-root and the image runtime is intended to be immutable.
8. **Platform matrix:** Tier-1 WSL2/ARM claims exceed what repository CI actually validates.
9. **Docker approval table:** isolated-container guard bypass is described too absolutely; host-access detection deliberately restores host guards.

---

## 7. Highest-risk upstream hotspots

Avoid long-lived AGK edits in:

- `gateway/run.py` — ~31k lines
- `hermes_cli/web_server.py` — ~19k lines
- `apps/desktop/electron/main.ts` — ~15k lines
- `hermes_cli/main.py`
- `hermes_cli/update_cmd.py`
- `cli.py`
- `hermes_state.py`
- `tools/terminal_tool.py`
- `tools/approval.py`
- `tools/environments/base.py`
- `tools/environments/docker.py`
- `scripts/install.sh`
- `scripts/install.ps1`
- `scripts/release.py`
- `Dockerfile`, `docker-compose*.yml`, and `docker/stage2-hook.sh`
- `gateway/config.py`, `gateway/authz_mixin.py`, platform adapters
- Root/subproject manifests and lockfiles.

Additional debt:

- Backend-name/config mappings are duplicated across prompt, file, skill, credential, image, and terminal modules.
- YAML→environment translation spans multiple loaders.
- Profile-secret helpers are copied among adapters.
- Several legacy installer, entrypoint, service, and update compatibility paths remain live.
- `.github/workflows/ci.yml` and `ci.yaml` are both active-looking and easy to confuse.
- Release, Docker, Nix, installer E2E, and core test lanes are separate workflow runs, complicating required-check policy.

---

## 8. AGK fork recommendations

### P0 — deployment and security

1. **Do not ship stock `hermes update`.** Standardize remotes as `origin=agentik-os`, `upstream=Nous`, or disable in-app updates and use an AGK-signed release channel.
2. **Use immutable, digest-pinned containers** for production. Build from a pinned upstream commit plus a reviewed AGK patch series; preserve `/init` and leave final container user/root bootstrap semantics intact so stage2 can chown then drop privileges.
3. **One tenant per container/OS user and volume.** Do not use profiles, multiplex mode, or one dashboard as a hostile multi-tenant boundary.
4. **No Docker socket, host root mounts, privileged mode, or arbitrary `docker_extra_args`.** Enforce egress proxying/network policy.
5. **Public dashboard only behind TLS plus OAuth/OIDC/basic auth.** Use random 32+ byte API keys, explicit allowed-user policies, and narrow pairing windows.
6. **Disable or quarantine remote skill sync-back.** Make hosted sandboxes upload-only by default; require review/scanning before host persistence.
7. **Make MCP secrets per-server.** Remove global external-secret-source passthrough from `_build_safe_env`.
8. **Harden terminal SSH** with strict pinned `known_hosts`, validated host/user/port, safe control-directory ownership, and the desktop SSH argument-building pattern.

### P1 — supply chain and compatibility

1. Commit the Tauri `Cargo.lock`; require `cargo --locked`.
2. Verify installer/Node/uv/cua artifacts by pinned checksum or signature; mirror them for AGK production.
3. Forbid unlocked Python fallback and use `npm ci` in production builds.
4. Produce SBOMs and sign/attest Docker and desktop artifacts.
5. Keep upstream version unchanged and add an AGK build revision; do not overload upstream release/version fields.
6. Add a behavioral test for `scripts/release.py::update_version_files` staging every file it mutates.
7. Namespace new AGK configuration and state; prefer plugins, skills, MCP servers, dashboard plugins, and isolated new modules over monolith edits.
8. Maintain a small, ordered patch stack rebased frequently onto an **unshallowed** upstream clone.

### Required AGK CI gates

- Apply/rebase patch stack onto latest Nous `main`.
- Full Python runner with file retries disabled.
- JS/desktop unit tests, Rust locked tests, Nix checks.
- Multi-arch Docker build plus authenticated gateway/dashboard Compose smoke.
- N−1 → current config/state migration and rollback test.
- Native Windows/macOS/Linux and actual WSL/ARM lanes for any claimed support.
- Live canaries for only the SSH/cloud providers AGK promises to support.
- Security contracts for cross-profile secrets, public bind refusal, remote sync-back, and update-remote selection.

---

## Files and issues

- **Files created or modified by this audit:** none.
- `git diff` was empty at final verification.
- The repository did contain untracked `agk-upgrade/` at final check; it was **not created or modified by this audit**.
- Limitations: shallow Git history prevented merge-base/diff analysis, upstream advanced during inspection, no credentialed cloud/SSH tests were run, and no full test suite was executed.