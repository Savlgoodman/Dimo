# Dimo Documentation Index (AI & Engineering Router)

Authoritative directory map and file routing table for Dimo (`v0.5.2+`). Read this file first to locate the exact documentation relevant to a task and to know where new documentation belongs.

---

## 1. Directory Taxonomy & Placement Rules

Every documentation file in the repository has one canonical home. Follow these rules when reading, creating, moving, or deleting docs.

| Directory / Scope | Canonical Purpose | Naming Standard | Rules & Exclusions |
| :--- | :--- | :--- | :--- |
| `/` (Repository Root) | Cross-cutting top-level charters (`AGENTS.md`, `CLAUDE.md`, `CONTEXT.md`, `DESIGN.md`, `PRODUCT.md`, `README*.md`, `THIRD_PARTY_NOTICES.md`) | `UPPER_SNAKE.md` (root charters only) | Do not add feature specs, plans, or subsystem guides to the repo root. |
| `docs/` | Index (`INDEX.md`), human hub (`README.md`), and system architecture (`architecture.md`) | `INDEX.md`, `README.md`, `kebab-case.md` | Keep root of `docs/` minimal; place subsystem docs in their typed subdirectories. |
| `docs/adr/` | Permanent Architectural Decision Records (currently 78 active ADRs, `0001`–`0092`) | `NNNN-kebab-case.md` (4-digit unique prefix + ASCII lowercase) | Every file begins with YAML frontmatter (`status: accepted`, `date`, `title`, `scope`). When a decision changes, edit in place or replace cleanly—never stack `Amendment` / `状态注记` logs. |
| `docs/specs/` | Active cross-cutting normative technical specifications | `kebab-case.md` | Current-state contracts only. Delete or merge specs once retired. |
| `docs/plugins/` | Plugin Platform v4 documentation (user guide, developer guide, package spec, SDK/CLI, architecture, official catalog, generated bindings) | `kebab-case.md` (`README.md` allowed as hub) | `contract-bindings.md` is **generated** by `node scripts/plugin-contract-report.mjs`—never hand-edit. |
| `docs/guides/` | Operational, deployment, companion client, and troubleshooting runbooks | `kebab-case.md` | Current operational procedures only; no historical debugging diaries or issue transcripts. |
| `docs/agents/` | Repository-local agent automation conventions (`issue-tracker.md`, `triage-labels.md`) | `kebab-case.md` | Referenced by `.agents/skills/`. Keep strictly scoped to issue/triage workflows. |
| `docs/protocol/v1/` | Versioned Remote Protocol v1 `README.md`, OpenAPI, JSON Schema, and client models | Generated (`README.md`, `openapi.json`, `schema.json`, `generated/**`) | **Generated directory** checked by `pnpm run remote-protocol-schema:check`—never hand-edit. |
| `docs/security/` | Supply-chain and dependency license audit policies | `kebab-case.md` | Normative security/license policy only. |
| `docs/third-party/` | Clean-room third-party adoption records and upstream license texts | `kebab-case.md`, `licenses/*` | `codeg-adoption.md` and `licenses/Apache-2.0.txt` are verified by `scripts/check-third-party-adoption.test.js`. |
| `docs/release/` | Versioned release notes (`X.Y.Z.md`) consumed by GitHub Release workflows | `X.Y.Z.md` | Historical release artifacts; CI reads `docs/release/${RELEASE_TAG#v}.md`. |
| `docs/readme/` | Static SVG architecture diagrams embedded in root READMEs | `kebab-case.svg` | Visual assets only. |
| Package / Subtree READMEs | Entry points co-located with standalone packages (`frontend/CLAUDE.md`, `npx-cli/README.md`, `packages/*/README.md`) | `README.md` or `CLAUDE.md` | Keep concise; link back to `docs/` instead of duplicating specs. |

> **What does NOT belong in `docs/`**: Completed implementation plans, scratch todos, per-wave QA audits, temporary migration checklists, screenshot dumps, or personal environment paths. Once a feature ships, fold its durable rules into `CONTEXT.md`, `docs/architecture.md`, an ADR, or a spec, and delete the ephemeral plan.

---

## 2. Task-Based Context Routing

Read only the smallest set of files matching your task:

| If your task touches... | Read these files first |
| :--- | :--- |
| **Any task (mandatory baseline)** | [`CONTEXT.md`](../CONTEXT.md), [`docs/architecture.md`](architecture.md) |
| **Desktop shell / Electron / `<webview>` / Sidecar** | [`ADR-0090`](adr/0090-electron-thin-shell-and-desktop-sidecar.md), [`ADR-0054`](adr/0054-host-family-distribution-and-client-surfaces.md), [`ADR-0078`](adr/0078-host-command-registry-single-seam.md), [`ADR-0080`](adr/0080-windows-desktop-memory-and-performance.md) |
| **Host Command Registry / Event Bus / Remote Protocol** | [`docs/protocol/v1/README.md`](protocol/v1/README.md), [`ADR-0033`](adr/0033-shared-application-core-and-versioned-remote-transport.md), [`ADR-0059`](adr/0059-host-identity-and-pairing-invitation.md), [`ADR-0078`](adr/0078-host-command-registry-single-seam.md) |
| **Conversations / SQLite Projection / Turns / Handoff** | [`ADR-0091`](adr/0091-sqlite-single-authority-conversation-projection.md), [`ADR-0001`](adr/0001-crash-recovery-semantics.md), [`ADR-0003`](adr/0003-conversations-crate.md), [`ADR-0044`](adr/0044-conversation-control-plane-and-durable-inputs.md), [`ADR-0071`](adr/0071-conversation-turn-integrity.md), [`ADR-0081`](adr/0081-connect-time-session-bind-codeg-parity.md), [`ADR-0089`](adr/0089-conversation-binding-generations-and-history-segments.md), [`docs/specs/cross-agent-continuation.md`](specs/cross-agent-continuation.md) |
| **Agent Engines / ACP / Registry / Install / Auth** | [`docs/specs/agent-driver-engine.md`](specs/agent-driver-engine.md), [`docs/specs/prepared-acp-session-controls.md`](specs/prepared-acp-session-controls.md), [`ADR-0087`](adr/0087-dedicated-agent-engine-first-acp-fallback.md), [`ADR-0010`](adr/0010-agent-runtime-topology.md), [`ADR-0034`](adr/0034-harden-acp-registry-and-adopt-auth-status.md), [`ADR-0060`](adr/0060-agent-installs-use-user-environment.md), [`ADR-0064`](adr/0064-unified-agent-authentication-modes.md) |
| **Model Providers & Presets** | [`ADR-0063`](adr/0063-model-provider-presets-not-cc-switch.md), [`ADR-0079`](adr/0079-provider-catalog-templates-are-not-import-sources.md), [`ADR-0085`](adr/0085-modelrouter-is-a-webview-side-provider-source.md), [`ADR-0088`](adr/0088-built-in-provider-presets.md) |
| **Pulse Event Automation & Workflows (DAG)** | [`docs/specs/pulse-automation-engine.md`](specs/pulse-automation-engine.md), [`ADR-0092`](adr/0092-pulse-event-driven-automation-and-dual-primitive-workflows.md), [`ADR-0045`](adr/0045-workflows-orchestrate-conversation-turns.md), [`ADR-0049`](adr/0049-workflow-source-artifacts-and-portable-automation-specs.md), [`ADR-0050`](adr/0050-interactive-workflow-debug-runs-and-step-conversations.md), [`ADR-0053`](adr/0053-agent-step-native-session-text-handoff-and-confirmation-projections.md) |
| **Plugins, Plugin SDK/CLI, MCP Runtimes** | [`docs/plugins/README.md`](plugins/README.md), [`docs/plugins/package-v4.md`](plugins/package-v4.md), [`docs/plugins/platform-architecture.md`](plugins/platform-architecture.md), [`docs/plugins/contract-bindings.md`](plugins/contract-bindings.md), [`ADR-0046`](adr/0046-full-stack-plugin-platform-and-isolated-sdk.md), [`ADR-0048`](adr/0048-full-trust-plugin-execution-model.md), [`ADR-0069`](adr/0069-everything-is-a-plugin-platform.md) |
| **Frontend UI / Styling / Dockview / Composer**         | [`DESIGN.md`](../DESIGN.md), [`frontend/CLAUDE.md`](../frontend/CLAUDE.md), [`docs/specs/context-menu-surfaces.md`](specs/context-menu-surfaces.md), [`docs/specs/workspace-sidebar-and-docking.md`](specs/workspace-sidebar-and-docking.md), [`ADR-0039`](adr/0039-adopt-astryx-for-chat-composer-and-message-rendering.md), [`ADR-0042`](adr/0042-conversations-are-first-class-dockview-panels.md), [`ADR-0065`](adr/0065-composer-at-reference-panel.md), [`ADR-0068`](adr/0068-workspace-default-surfaces-and-activity.md)                |
| **IM Channels, Companion Apps & Headless Deploy** | [`docs/guides/headless-server.md`](guides/headless-server.md), [`docs/guides/companion-apps.md`](guides/companion-apps.md), [`ADR-0004`](adr/0004-im-secrets-plaintext-env.md), [`ADR-0041`](adr/0041-native-kotlin-compose-android-companion.md), [`ADR-0056`](adr/0056-chat-channel-and-remote-access-codeg-parity.md), [`ADR-0062`](adr/0062-chat-channel-host-closed-loop.md), [`ADR-0070`](adr/0070-ssh-provisioned-remote-server.md), [`ADR-0084`](adr/0084-native-swiftui-ios-companion.md) |
| **Debugging Agent / Collaboration Failures** | [`docs/guides/agent-troubleshooting.md`](guides/agent-troubleshooting.md), [`ADR-0058`](adr/0058-session-auxiliary-capability-honesty.md), [`ADR-0074`](adr/0074-turn-failure-taxonomy-and-recovery-visibility.md) |
| **Security, Licensing & Third-Party Attribution** | [`docs/security/dependency-license-audit.md`](security/dependency-license-audit.md), [`docs/third-party/codeg-adoption.md`](third-party/codeg-adoption.md), [`THIRD_PARTY_NOTICES.md`](../THIRD_PARTY_NOTICES.md) |

---

## 3. Complete File Catalog

### Root & Core Charter Documents

| File | Purpose |
| :--- | :--- |
| [`AGENTS.md`](../AGENTS.md) | Mandatory contributor & coding-agent bootstrap, workspace map, build/test commands, style & doc hygiene rules. |
| [`CLAUDE.md`](../CLAUDE.md) | Claude Code quick-entry pointer delegating to `AGENTS.md` plus local `.scratch/` issue tracking reminders. |
| [`CONTEXT.md`](../CONTEXT.md) | Ubiquitous Language glossary across all product and technical domains. |
| [`PRODUCT.md`](../PRODUCT.md) | Product charter, positioning, target users, anti-references, and product principles. |
| [`DESIGN.md`](../DESIGN.md) | Frontend visual design single source of truth (macOS Tahoe opaque chrome/content tokens, palettes, radii, typography). |
| [`README.md`](../README.md) / [`README.zh-CN.md`](../README.zh-CN.md) | Public repository overview (EN / ZH-CN), architecture highlights, and quick start. |
| [`THIRD_PARTY_NOTICES.md`](../THIRD_PARTY_NOTICES.md) | Third-party open-source license attributions and vendored notices. |
| [`frontend/CLAUDE.md`](../frontend/CLAUDE.md) | Frontend workbench conventions (React 19, Dockview, Spatial Canvas, styling tokens, state stores, tests). |
| [`docs/INDEX.md`](INDEX.md) | This AI & engineering documentation router. |
| [`docs/README.md`](README.md) | Human-readable documentation hub. |
| [`docs/architecture.md`](architecture.md) | End-to-end system architecture, Single-Seam Host, Dual-Stage Workbench, SQLite projection, Pulse, and 26-crate map. |

### Active Technical Specifications (`docs/specs/`)

| File | Purpose |
| :--- | :--- |
| [`docs/specs/agent-driver-engine.md`](specs/agent-driver-engine.md) | Normative Agent Driver Engine v2.0 spec (dedicated engine adapters, ACP fallback, session lifecycle, error taxonomy). |
| [`docs/specs/agent-orchestration-and-delegation.md`](specs/agent-orchestration-and-delegation.md) | Multi-agent orchestration, `&Agent` delegation, cross-project `thread_launch`, two-phase worktree launch, push completion wakeup, and unified HTTP `/mcp` contract. |
| [`docs/specs/context-menu-surfaces.md`](specs/context-menu-surfaces.md) | Unified right-click context menu contract across Workbench surfaces. |
| [`docs/specs/cross-agent-continuation.md`](specs/cross-agent-continuation.md) | Deterministic cross-agent handoff, binding generations, history segments, and replay semantics. |
| [`docs/specs/instant-session-controls-and-lazy-bind.md`](specs/instant-session-controls-and-lazy-bind.md) | Zero-latency provider capability catalog (bundled baselines, SWR, EventBus push), lazy turn-start session bind, and native engine probe de-blocking. |
| [`docs/specs/prepared-acp-session-controls.md`](specs/prepared-acp-session-controls.md) | Connect-time prepared ACP session controls (mode, model, config options) before first turn. |
| [`docs/specs/pulse-automation-engine.md`](specs/pulse-automation-engine.md) | Pulse event bus, event catalog, timers, rules, outbox, and dual-primitive (Session + Bot) workflow engine spec. |

### Plugin Platform v4 (`docs/plugins/`)

| File | Purpose |
| :--- | :--- |
| [`docs/plugins/README.md`](plugins/README.md) | Plugin Platform v4 documentation entry point. |
| [`docs/plugins/user-guide.md`](plugins/user-guide.md) | Installing, enabling, configuring, updating, and removing plugins via UI and `dimo plugin` CLI. |
| [`docs/plugins/developer-guide.md`](plugins/developer-guide.md) | End-to-end plugin authoring guide (`@dimoai/plugin-sdk`, Python/Rust Workers, live `--dev` linking). |
| [`docs/plugins/package-v4.md`](plugins/package-v4.md) | Normative `.dimo-plugin/plugin.json` v4 manifest, `README.md` frontmatter, `contents/`, and root `config.json` spec. |
| [`docs/plugins/sdk-and-cli.md`](plugins/sdk-and-cli.md) | `@dimoai/plugin-sdk` v2.0.0 subpath exports and `dimo-plugin` CLI command reference. |
| [`docs/plugins/platform-architecture.md`](plugins/platform-architecture.md) | Plugin Kernel internals: Activation Generations, Runtime locks, full-trust workers/apps, remote execution seam. |
| [`docs/plugins/official-plugins.md`](plugins/official-plugins.md) | Catalog of the 15 official full-trust v4 plugins in `plugins/*`. |
| [`docs/plugins/contract-bindings.md`](plugins/contract-bindings.md) | **Generated** contract matrix of all 23 contribution kinds (`L0`–`L3`) and Host API bindings. |

### Operational & Troubleshooting Guides (`docs/guides/`)

| File | Purpose |
| :--- | :--- |
| [`docs/guides/headless-server.md`](guides/headless-server.md) | Deploying and operating `dimo-server`, `dimoai` CLI (`serve`, `list`, `install`), Docker, TLS, and upgrades. |
| [`docs/guides/companion-apps.md`](guides/companion-apps.md) | Paired remote clients, pairing invitations, durable WS attach/fold, and native iOS (`mobile/ios`) & Android (`mobile/android`) apps. |
| [`docs/guides/agent-troubleshooting.md`](guides/agent-troubleshooting.md) | Diagnostic playbooks for agent installation, authentication, authorization, tools, and collaboration failures. |

### Repository Automation, Protocol, Security, Third-Party & Releases

| File / Directory | Purpose |
| :--- | :--- |
| [`docs/agents/issue-tracker.md`](agents/issue-tracker.md) | Local `.scratch/` markdown issue tracker convention for agent workflows. |
| [`docs/agents/triage-labels.md`](agents/triage-labels.md) | Standard issue triage labels and severity definitions. |
| [`docs/protocol/v1/README.md`](protocol/v1/README.md) | Remote Protocol v1 overview (`/api/v1/capabilities`, `/api/v1/commands/{command}`, `/api/v1/ws`) + generated `openapi.json`, `schema.json`, and TS/Swift/Kotlin models. |
| [`docs/security/dependency-license-audit.md`](security/dependency-license-audit.md) | Dependency license allowlist gate (`pnpm run dependency:licenses`) and supply-chain audit rules. |
| [`docs/third-party/codeg-adoption.md`](third-party/codeg-adoption.md) | Clean-room Codeg adoption provenance record (verified by `scripts/check-third-party-adoption.test.js`). |
| [`docs/release/`](release/) | Versioned release notes (`0.1.2.md` – `0.5.5.md`) used by release CI pipelines. |
| [`npx-cli/README.md`](../npx-cli/README.md) | `dimoai` npm CLI package usage and distribution guide. |
| [`packages/plugin-cli/README.md`](../packages/plugin-cli/README.md) | `@dimoai/plugin-cli` (`dimo-plugin`) author CLI README. |
| [`packages/pulse-sdk/README.md`](../packages/pulse-sdk/README.md) | TypeScript SDK README for emitting/subscribing to Pulse automation events. |

---

## 4. Architectural Decision Records (`docs/adr/` — 78 Active ADRs)

All active ADRs carry `status: accepted`. Gaps in numbering correspond to retired/deleted ADRs whose decisions are superseded by current architecture.

### Host, Desktop Shell & Transport Seam

- [`0033`](adr/0033-shared-application-core-and-versioned-remote-transport.md) — Shared `ApplicationCore` and versioned remote transport
- [`0054`](adr/0054-host-family-distribution-and-client-surfaces.md) — Host family distribution (`dimo-server`, Electron Desktop, CLI) and client surfaces
- [`0059`](adr/0059-host-identity-and-pairing-invitation.md) — Host identity and Reachability-based pairing invitations
- [`0061`](adr/0061-host-local-safety-and-performance-baseline.md) — Host local safety and performance baseline
- [`0070`](adr/0070-ssh-provisioned-remote-server.md) — SSH-provisioned and managed remote `dimo-server`
- [`0073`](adr/0073-one-line-install-and-release-asset-naming.md) — Single-source release asset naming for `install.sh`, `install.ps1`, and `npx`
- [`0078`](adr/0078-host-command-registry-single-seam.md) — Single Host seam: `HostCommandRegistry` and `HostEventBus`
- [`0080`](adr/0080-windows-desktop-memory-and-performance.md) — Windows Desktop memory attribution and performance budget
- [`0090`](adr/0090-electron-thin-shell-and-desktop-sidecar.md) — Electron thin desktop shell and `dimo-server --desktop` sidecar architecture

### Conversations, Persistence & Turn Integrity

- [`0001`](adr/0001-crash-recovery-semantics.md) — Crash recovery: restore context only, never replay in-flight turns
- [`0003`](adr/0003-conversations-crate.md) — Dedicated `crates/conversations` domain crate
- [`0005`](adr/0005-session-fork-copies-events.md) — Session fork copies events up to fork point and forks agent context by capability
- [`0006`](adr/0006-workspace-less-conversation.md) — Workspace-less conversations with nullable `workspace_id` and scratch dir
- [`0044`](adr/0044-conversation-control-plane-and-durable-inputs.md) — Conversation control plane: durable inputs, in-flight steering, parent-child links
- [`0058`](adr/0058-session-auxiliary-capability-honesty.md) — Session auxiliary capability honesty (protocol facts only, never guess or zero-fill)
- [`0071`](adr/0071-conversation-turn-integrity.md) — Conversation turn integrity: cancel, recovery replay, connection isolation, terminal reachability
- [`0074`](adr/0074-turn-failure-taxonomy-and-recovery-visibility.md) — Structured turn failure taxonomy and user-visible recovery state
- [`0075`](adr/0075-usage-accounting-from-conversation-events.md) — Usage accounting anchored on `conversation_events` with vendor logs as supplementary breakdown
- [`0081`](adr/0081-connect-time-session-bind-codeg-parity.md) — Connect-time session bind; prompts never lazily create underlying agent sessions
- [`0089`](adr/0089-conversation-binding-generations-and-history-segments.md) — Conversation binding generations, history segments, and deterministic cross-agent continuation
- [`0091`](adr/0091-sqlite-single-authority-conversation-projection.md) — SQLite single-authority conversation projection and dual-pool concurrency

### Agent Runtime, Lifecycle & ACP Compatibility

- [`0002`](adr/0002-single-agent-identity-enum.md) — Single `AgentKind` identity enum in `crates/api-types`
- [`0010`](adr/0010-agent-runtime-topology.md) — Local Agent Runtime topology: dedicated native engines first, native/adapter ACP fallback
- [`0012`](adr/0012-agent-installation-and-authentication-are-separate.md) — Agent installation and authentication are independent lifecycles
- [`0013`](adr/0013-agent-membership-is-independent-from-installation.md) — Agent membership is independent of installation status and Registry availability
- [`0014`](adr/0014-built-in-agents-are-permanent-members.md) — Built-in agents are permanent members; user-added agents are removable
- [`0015`](adr/0015-uninstall-and-remove-are-distinct.md) — Uninstall and remove are distinct operations
- [`0016`](adr/0016-agent-installations-are-version-locked.md) — Agent installations are version-locked with user-confirmed upgrades
- [`0017`](adr/0017-binary-integrity-has-two-trust-levels.md) — Binary integrity uses two trust levels (expected hash vs. trust-on-first-use)
- [`0019`](adr/0019-registry-cache-is-read-only-while-offline.md) — Offline Registry cache is read-only for browsing
- [`0020`](adr/0020-built-in-agents-share-the-universal-pipeline.md) — Built-in and external agents share one universal product pipeline
- [`0022`](adr/0022-agent-native-configuration-is-authoritative.md) — Agent native configuration files are authoritative for local persistent settings
- [`0023`](adr/0023-acp-session-options-are-validated-defaults.md) — ACP session options act only as validated new-session default preferences
- [`0025`](adr/0025-agent-identity-is-distinct-from-registry-entry.md) — Agent identity is distinct from Registry catalog entry
- [`0026`](adr/0026-agent-installations-use-bounded-resource-aware-concurrency.md) — Bounded, resource-aware concurrency and locks for agent installs
- [`0027`](adr/0027-agent-distribution-selection-is-deterministic-and-locked.md) — Deterministic agent distribution selection persisted in install lock
- [`0028`](adr/0028-agent-version-evidence-may-be-incomplete-but-not-conflicting.md) — Agent version evidence may be incomplete but never conflicting
- [`0029`](adr/0029-agent-updates-do-not-permanently-pin-conversations.md) — Agent updates do not permanently pin conversations to old versions
- [`0034`](adr/0034-harden-acp-registry-and-adopt-auth-status.md) — Evidence-driven Agent management, hardened ACP Registry, and `auth/status`
- [`0035`](adr/0035-acp-v2-dual-protocol-session-items.md) — ACP v2 dual-protocol adapter and Session Item semantic core
- [`0036`](adr/0036-user-declared-acp-agents-use-locked-distributions.md) — User-declared ACP agents reuse the version-locked installation pipeline
- [`0037`](adr/0037-built-in-agent-account-actions-and-codeg-parity.md) — Built-in agent whitelisted account actions, native configs, and ecosystem management
- [`0060`](adr/0060-agent-installs-use-user-environment.md) — Agent installs target and bind strictly to the user environment
- [`0072`](adr/0072-qoder-first-class-agent.md) — Qoder first-class agent integration and unified ACP launch-argument resolution
- [`0083`](adr/0083-native-acp-cli-agents.md) — Kiro, Auggie, TRAE, Command Code, and ZCode via ACP compatibility pipeline
- [`0086`](adr/0086-omp-native-acp-agent.md) — OMP integrated as a native ACP built-in agent
- [`0087`](adr/0087-dedicated-agent-engine-first-acp-fallback.md) — Dedicated native Agent engine adapters first; ACP as compatibility fallback

### Model Providers & Authentication

- [`0063`](adr/0063-model-provider-presets-not-cc-switch.md) — Structured per-agent Model Provider presets (CC Switch as import source only)
- [`0064`](adr/0064-unified-agent-authentication-modes.md) — Unified agent auth modes: official subscription, official API, third-party provider
- [`0079`](adr/0079-provider-catalog-templates-are-not-import-sources.md) — Provider catalog templates are secret-free form presets, not import sources
- [`0085`](adr/0085-modelrouter-is-a-webview-side-provider-source.md) — ModelRouter is a webview-layer provider source; Host stays account-agnostic
- [`0088`](adr/0088-built-in-provider-presets.md) — Built-in provider presets live in Host; plugins may only append

### Collaboration, Delegation, Pulse Automation & Workflows

- [`0031`](adr/0031-llm-mediated-delegation-and-ampersand-agent-mentions.md) — Async multi-agent delegation and `&Agent` mentions
- [`0032`](adr/0032-automations-replay-versioned-turn-launch-specs.md) — Automations replay versioned turn launch specs into real conversations and runs
- [`0045`](adr/0045-workflows-orchestrate-conversation-turns.md) — Durable DAG workflows orchestrate real conversations and turns
- [`0049`](adr/0049-workflow-source-artifacts-and-portable-automation-specs.md) — Workflow source artifacts (`*.dimo-workflow.json`) and portable automation specs
- [`0050`](adr/0050-interactive-workflow-debug-runs-and-step-conversations.md) — Interactive workflow debug runs and inspectable step conversations
- [`0052`](adr/0052-shared-workflow-studio-and-workflow-creator-plugin.md) — Shared Workflow Studio and Workflow Creator plugin
- [`0053`](adr/0053-agent-step-native-session-text-handoff-and-confirmation-projections.md) — Agent Step native session config reuse, text handoff, and confirmation projections
- [`0092`](adr/0092-pulse-event-driven-automation-and-dual-primitive-workflows.md) — Pulse event-driven automation engine and dual-primitive (Session + Bot) workflows

### Plugin Platform & MCP Runtimes

- [`0046`](adr/0046-full-stack-plugin-platform-and-isolated-sdk.md) — Full-stack Plugin Package, atomic Activation Generations, and versioned SDK
- [`0047`](adr/0047-product-centric-plugin-package-and-content-model.md) — Product-centric Plugin Package, contents, and root config model
- [`0048`](adr/0048-full-trust-plugin-execution-model.md) — Full-trust plugin execution model
- [`0051`](adr/0051-host-managed-plugin-scoped-mcp-runtimes.md) — Host-managed plugin-scoped MCP runtimes
- [`0055`](adr/0055-official-product-mcp-activation.md) — Official product MCP distribution with Host and layered activation
- [`0066`](adr/0066-plugin-marketplace-authoring-and-session-honesty.md) — Plugin marketplace, single-path authoring toolchain, and session-activation honesty
- [`0069`](adr/0069-everything-is-a-plugin-platform.md) — Everything is a Plugin: shell contribution points, Host provider seam, zero-privilege official plugins
- [`0077`](adr/0077-office-plugin-skill-provenance-and-preview-lifecycle.md) — Office plugin: `officecli` skill provenance and view-driven preview lifecycle

### Frontend Workbench, Editor & Visual Surfaces

- [`0039`](adr/0039-adopt-astryx-for-chat-composer-and-message-rendering.md) — Astryx component primitives for chat composer, messages, and tool activity
- [`0042`](adr/0042-conversations-are-first-class-dockview-panels.md) — Conversations are first-class Dockview panels
- [`0065`](adr/0065-composer-at-reference-panel.md) — Composer `@` reference panel and new-session `&` delegation availability
- [`0068`](adr/0068-workspace-default-surfaces-and-activity.md) — Workspace default surfaces, activity view, and desktop notifications
- [`0076`](adr/0076-three-pane-merge-conflict-editor.md) — Three-pane merge conflict editor: conflicts are workspace facts, resolutions write workspace only

### Chat Channels & Native Mobile Companions

- [`0004`](adr/0004-im-secrets-plaintext-env.md) — IM channel secrets stored in `0600` `~/.dimo/.env`
- [`0041`](adr/0041-native-kotlin-compose-android-companion.md) — Native Kotlin + Jetpack Compose Android Companion (`mobile/android`)
- [`0056`](adr/0056-chat-channel-and-remote-access-codeg-parity.md) — Chat channels and remote access product closed loop
- [`0062`](adr/0062-chat-channel-host-closed-loop.md) — Chat channels execute the full coding loop on Host
- [`0084`](adr/0084-native-swiftui-ios-companion.md) — Native Swift + SwiftUI iOS Companion (`mobile/ios`)

---

## 5. Evergreen Maintenance Rules

1. **Edit in place as current truth**: When behavior or architecture changes, update the existing document directly. Never append "originally X, updated to Y" blocks, `Amendment` sections, or `> 状态注记` revision banners.
2. **Delete retired docs cleanly**: Remove obsolete specs, completed plans, and fully superseded ADRs instead of leaving tombstones that confuse readers.
3. **Keep history concise**: Preserve design rationale and trade-offs, not sprint diaries, PR checklists, or step-by-step debugging logs.
4. **Update this index**: Whenever adding, renaming, moving, or deleting a document, update `docs/INDEX.md` in the same change.
5. **Respect generated files**: Regenerate `shared/types.ts` (`pnpm run generate-types`), `docs/protocol/v1/` (`pnpm run remote-protocol-schema:check`), and `docs/plugins/contract-bindings.md` (`node scripts/plugin-contract-report.mjs`) via scripts rather than hand-editing.
