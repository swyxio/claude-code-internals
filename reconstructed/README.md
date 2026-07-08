# Reconstructed architecture

> **SCHEMATIC — NOT BEHAVIORALLY EQUIVALENT.** These files describe evidence-backed boundaries and hypotheses; they are not a drop-in implementation of Claude Code.

This directory is an independently authored, non-verbatim, browsable reconstruction of the non-UI architecture in the installed Claude Code 2.1.177 binary. It is intentionally descriptive TypeScript: the files are contracts and pseudocode grounded in the recovered bundle, not Anthropic's original source and not expected to compile.

The evidence source is the exact 17,038,096-byte CLI module recovered from the signed Mach-O executable. Each TypeScript file begins with stable provenance IDs from [`../evidence/anchor-spec.json`](../evidence/anchor-spec.json). Use the anchor catalog and generated evidence index to locate the underlying literal in the recovered payload.

## Confidence vocabulary

- **Observed**: directly present in command help, schemas, literals, control flow, native metadata, or protocol types.
- **Derived**: a readable boundary or name introduced to explain multiple observed facts without changing their semantics.
- **Hypothesis**: a plausible implementation detail that the minified artifact does not uniquely determine.

No file claims that minified identifiers, helper boundaries, or reconstructed filenames match the private source tree.

## Source map

| Reconstructed file             | Responsibility                                                | Primary evidence anchors                                                                      |
| ------------------------------ | ------------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| `startup/cli-bootstrap.ts`     | Entry selection, safe/bare modes, trust boundary, deep links  | `entrypoint.routing`, `deeplink.argument-injection`, `workspace-trust.proxy-helper`           |
| `settings/schema.ts`           | Settings, permissions, sandbox, MCP, memory contracts         | `sandbox.no-escape`, `mcp.transports`, `memory.enable`                                        |
| `settings/resolution.ts`       | Layer precedence, provenance, project MCP approval            | `permissions.managed-only`, `mcp.project-approval`, `mcp.strict-mode`                         |
| `engine/turn-engine.ts`        | Async-generator turn state machine and exits                  | `agent-loop.core-generator`, `agent-loop.idle-boundary`, `compaction.lifecycle`               |
| `engine/model-stream.ts`       | Streaming model boundary, fallback, incremental tool JSON     | `agent-loop.core-generator`, `compaction.lifecycle`                                           |
| `tools/catalog.ts`             | Built-in inventory, filtering, MCP names                      | `tools.registry`, `tools.aliases`, `tools.bash-readonly-source`                               |
| `tools/execution-pipeline.ts`  | Coercion, validation, authorization, hooks, execution         | `tools.execution-pipeline`, `hooks.lifecycle`                                                 |
| `permissions/engine.ts`        | Rule/mode/classifier evidence for an injected decision policy | `permissions.managed-only`, `permissions.disable-bypass`, `auto-mode.anti-bypass`             |
| `sandbox/runtime.ts`           | Seatbelt, bubblewrap, Windows SRT/WFP planning                | `sandbox.fail-closed`, `sandbox.no-escape`, `sandbox.weaker-network`, `sandbox.weaker-nested` |
| `hooks/dispatcher.ts`          | Hook event vocabulary and opaque dispatcher contracts         | `hooks.lifecycle`, `plugins.component-inventory`                                              |
| `mcp/client-manager.ts`        | MCP discovery, approval, transports, resources, tools         | `mcp.settings`, `mcp.transports`, `mcp.project-approval`                                      |
| `plugins/loader.ts`            | Plugin manifests, components, trust and path containment      | `plugins.cli-loader`, `plugins.monitor-trust`, `plugins.component-inventory`                  |
| `skills/discovery.ts`          | SKILL.md roots, precedence, live refresh                      | `skills.dynamic-refresh`, `workspace-trust.proxy-helper`                                      |
| `agents/subagents.ts`          | Agent definitions, spawning, worktrees, lifecycle             | `agents.append-prompt`, `agents.lifecycle-hook`, `agents.pending-turn-state`                  |
| `remote/direct-connect.ts`     | Remote Control transport contracts and peer gate              | `remote.startup`, `remote.peer-isolation`, `socket.directory-mode`                            |
| `auth/credentials.ts`          | API key, helper, OAuth descriptor, and Keychain boundaries    | `auth.api-key`, `auth.api-key-helper`, `auth.macos-keychain`, `auth.oauth-url`                |
| `auth/providers-http.ts`       | Bedrock/Vertex/Foundry selection and HTTP partitioning        | `providers.bedrock`, `providers.vertex`, `providers.foundry`, `network.first-party-boundary`  |
| `persistence/sessions.ts`      | Transcript adapters and bounded external SessionStore load    | `sessions.local-transcript`, `sessions.external-store`                                        |
| `memory/auto-memory.ts`        | Auto/agent memory locations and manifests                     | `memory.enable`, `memory.project-path-hardening`                                              |
| `telemetry/telemetry.ts`       | Batch path, disable switches, injected payload/redaction      | `telemetry.batch-endpoint`, `telemetry.disable`, `telemetry.nonessential-off`                 |
| `update/updater.ts`            | Explicit/automatic release and package update planning        | `updates.release-origin`, `telemetry.nonessential-off`                                        |
| `native/runtime-boundaries.ts` | Mach-O/Bun section/payload facts and socket-mode check        | `build.git-sha`, `socket.directory-mode`, `entrypoint.routing`                                |

## Reading order

For the main execution path, read `startup/cli-bootstrap.ts` → `settings/resolution.ts` → `tools/catalog.ts` → `engine/turn-engine.ts` → `tools/execution-pipeline.ts` → `permissions/engine.ts`. The remaining folders are adapters and extension surfaces attached to that path.
