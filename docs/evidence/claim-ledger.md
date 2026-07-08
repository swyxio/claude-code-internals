# Claim Ledger

The canonical machine-readable claim ledger is [`evidence/claims.ndjson`](https://github.com/swyxio/claude-code-internals/blob/main/evidence/claims.ndjson). It currently contains 69 version-bound records: 16 observed facts, 52 derived interpretations, and one explicit hypothesis. [`evidence/anchors.json`](https://github.com/swyxio/claude-code-internals/blob/main/evidence/anchors.json) is the supporting index of 51 short semantic anchors in entry-module hash `45cb1eaa2b7e274ce87b1df0a1729f017ac06fffe782fac8acb42ab186243573`.

<span class="evidence-label observed">Observed</span> Claim `container.bun-runtime-version` records the literal embedded version string `1.3.14+2a41ca974`, including its nine-character revision prefix, in [`provenance.json`](https://github.com/swyxio/claude-code-internals/blob/main/evidence/provenance.json).

<span class="evidence-label derived">Derived</span> Claim `container.bun-runtime-source-resolution` resolves that prefix to upstream commit `2a41ca974b7302952252a20eddbb3b5c3f2dee9b` for the pinned source reference. The complete 40-character hash is not literally embedded. Both records are non-anchor claims and therefore do not add to the 51-anchor index below.

The tables below index anchor-scoped interpretations. The presence, count, and coordinates of each needle are **observed**. Unless a row is explicitly marked otherwise, its behavioral summary is **derived** and does not prove runtime activation. `entrypoint.routing` also participates in the ledger’s single architecture hypothesis. Offsets, occurrence counts, exact basis, and evidence references live in the machine-readable files.

## Build, startup, and boundary hardening

| Anchor ID | Anchor-scoped interpretation |
|---|---|
| `build.git-sha` | **Observed:** bundle carries source revision `6fae7a…b25` |
| `entrypoint.routing` | One binary routes CLI, IDE, remote, SDK, MCP, and other identities |
| `deeplink.argument-injection` | Deep-link invocation rejects trailing argument injection |
| `workspace-trust.proxy-helper` | Project/local proxy helper is skipped before workspace trust |
| `socket.directory-mode` | Local IPC requires a `0700` socket directory |

## Permissions and sandbox

| Anchor ID | Derived interpretation |
|---|---|
| `permissions.managed-only` | Managed policy can make non-managed permission rules ineffective |
| `permissions.disable-bypass` | Policy can disable bypass-permissions mode |
| `permissions.subprocess-scrub` | Subprocess hardening resets permission posture unless explicitly allowed |
| `sandbox.fail-closed` | Managed deployment can fail when required sandbox is unavailable |
| `sandbox.no-escape` | Policy can disable per-command sandbox escape |
| `sandbox.auto-allow` | Explicit setting can auto-allow sandboxed Bash |
| `sandbox.weaker-network` | macOS compatibility option weakens network isolation |
| `sandbox.weaker-nested` | Nested execution has a separate weaker-sandbox compatibility option |

## Agent loop, hooks, and tools

| Anchor ID | Anchor-scoped interpretation |
|---|---|
| `hooks.lifecycle` | Hook bus includes tool, permission, session, subagent, compaction, worktree, and file/config events |
| `agent-loop.core-generator` | Central turn engine is an asynchronous generator |
| `tools.registry` | Built-in registry assembles implementations before mode/feature filtering |
| `tools.execution-pipeline` | Tool calls pass through a shared asynchronous execution pipeline |
| `tools.bash-readonly-source` | **Observed:** bundle preserves a source filename for Bash read-only validation logic |

## Plugins, MCP, and skills

| Anchor ID | Derived interpretation |
|---|---|
| `plugins.cli-loader` | Plugin directory can load while suppressing MCP contribution |
| `plugins.monitor-trust` | Plugin monitors execute unsandboxed at hook trust level |
| `plugins.component-inventory` | Inventory includes skills, agents, hooks, MCP, LSP, output styles, and channels |
| `mcp.settings` | MCP servers load from a typed settings record |
| `mcp.strict-mode` | Strict mode excludes non-explicit MCP sources |
| `mcp.transports` | MCP recognizes stdio, SSE, IDE-SSE, HTTP, WebSocket, and SDK transports |
| `mcp.project-approval` | Project MCP approvals persist separately from discovery |
| `skills.dynamic-refresh` | Skill discovery can replace the slash-command list mid-session |

## Delegation, remote control, memory, and context

| Anchor ID | Derived interpretation |
|---|---|
| `tools.aliases` | Tool aliases are configurable and single-hop |
| `agents.append-prompt` | Prompt fragment propagates to Task and nested subagents |
| `agents.lifecycle-hook` | Subagent startup is hook-observable |
| `agents.pending-turn-state` | Turn completion records pending agents/workflows |
| `agent-loop.idle-boundary` | Idle follows held-result flush and background-loop exit |
| `remote.startup` | Remote Control can start with every session |
| `remote.peer-isolation` | Cross-machine messages can require explicit approval |
| `memory.enable` | Automatic memory read and write are independently configurable |
| `memory.project-path-hardening` | Checked-in project settings cannot redirect auto-memory directory |
| `compaction.lifecycle` | Compaction has progress and completed boundaries |

## Authentication and providers

| Anchor ID | Derived interpretation |
|---|---|
| `auth.api-key` | Direct Anthropic API-key auth exists |
| `auth.api-key-helper` | A shell helper can supply the API key |
| `auth.macos-keychain` | macOS credential path invokes the system Keychain command |
| `auth.oauth-url` | Claude.ai OAuth uses an explicit authorization endpoint |
| `providers.bedrock` | Amazon Bedrock provider route exists |
| `providers.vertex` | Google Vertex AI provider route exists |
| `providers.foundry` | Microsoft Foundry provider route exists |

## Telemetry, updates, persistence, and network

| Anchor ID | Derived interpretation |
|---|---|
| `telemetry.batch-endpoint` | First-party events batch to a versioned API path |
| `telemetry.disable` | Direct telemetry-disable switch exists |
| `telemetry.nonessential-off` | Nonessential outbound traffic can be disabled |
| `updates.release-origin` | Native releases come from Anthropic’s Claude Code release origin |
| `sessions.external-store` | External `SessionStore` adapter has a bounded load path |
| `sessions.local-transcript` | Local persistence distinguishes transcript content |
| `network.first-party-boundary` | HTTP layer distinguishes Anthropic-operated from external destinations |
| `auto-mode.anti-bypass` | Auto classifier treats tunneling around denial as bypass behavior |

## Using anchors correctly

An anchor supports only its written claim. For example, `auth.macos-keychain` proves a macOS Keychain command path exists; it does not prove what item attributes are used or that every credential is stored there. Derived architecture must cite multiple relevant anchors or CLI observations where needed.

If an anchor disappears in a new artifact, mark it unresolved before concluding the feature was removed. Minification, message changes, or a refactor can invalidate the needle while preserving behavior.
