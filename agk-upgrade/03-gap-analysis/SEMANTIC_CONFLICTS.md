# Semantic Conflicts

## Material conflicts

### Project

Hermes defines Project as a named multi-folder runtime record in `hermes_cli/projects_db.py`. AGK defines Project as an outcome-oriented operational organization. The names cannot share a public contract.

**Resolution:** keep Hermes storage behind private `HermesProjectRecord` adapter data, map imported folders to canonical `RepositoryBinding` and build canonical AGK Project separately.

### Workspace

Hermes and its desktop use workspace for filesystem and session cwd. AGK reserves Workspace for UI layout only.

**Resolution:** compatibility code uses runtime working directory or repository binding for filesystem concepts. Public AGK `Workspace` remains presentation state.

### Task and board

Hermes kanban Task is a durable queue row. AGK Task has one owning Plan and Mission and participates in the canonical execution graph.

**Resolution:** no direct identity mapping. A runtime work item may correlate to an AGK Task.

### Goal and Loop

Hermes Goal and Loop are session controllers. AGK Goal is a first-class object and AGK Loop is a reusable Definition plus Deployment that creates finite Missions.

**Resolution:** reuse mechanics under a controller adapter only.

### Security

Hermes is a single-tenant personal agent and treats OS isolation as the only boundary. AGK requires multi-Organization authorization.

**Resolution:** whole-process isolation plus AGK control-plane policy. Profiles and plugin hooks are insufficient by themselves.

### Event

Hermes uses callbacks, plugin hooks, gateway hooks, RPC events, logs and trajectories. AGK requires one registered semantic event envelope.

**Resolution:** adapter normalization with field-level provenance and explicit loss reporting.

### Four-plugin sufficiency

The earlier F22 narrative says four plugins and zero forks are sufficient. Current source shows that `pre_llm_call` injects context rather than routing or vetoing, `pre_api_request` observes, ContextEngine selection fails open, auxiliary calls do not all traverse the main hooks, and provider-native app-server Tool loops can bypass normal `pre_tool_call` mediation.

**Resolution:** retain the no-invasive-fork goal, but require an outer AGK-controlled model gateway, inner Tool authorization, signed Context Manifest check and capability-tested runtime modes. Any missing generic seam is proven before a patch.

### Product identity

Hermes Desktop is product-named and chat-first. AGK must present one organization operating system with four bounded surfaces.

**Resolution:** reuse the gateway and extract proven neutral behavior. Implement the product shell in canonical AGK Web and Tauri rather than replacing the locked clients with Hermes Electron.

### Live Provider Account rotation

The pinned AGK corpus contains incompatible readings: one path preserves Session and PTY while rotating the credential reference, while another keeps a live Session sticky and applies rotation on the next bind. Hermes can swap credentials inside a live runtime.

**Resolution:** keep this as an explicit open contract decision. The adapter cannot expose live account rotation until the canonical AGK Session rule is ratified and tested.

## Vocabulary conflicts in the operator prompt

Canonical derived documents use Learn, Build, Deals and Self. `Collectif` is retained as an unratified Learn presentation candidate. The retired personal label is not introduced into code or contracts. Flow is the authored-process type. Graph remains engine structure.
