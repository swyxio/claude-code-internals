# Hook and Plugin Catalog

This page consolidates the `2.1.177` lifecycle vocabulary and plugin management surface. It is a versioned reference, not a promise that every internal event is a supported public extension contract.

The event-name strings and recorded coordinates below are **observed**. The “boundary represented” descriptions are **derived** human-readable glosses of those names.

## Hook events

| Event | Boundary represented | Public/configurable status |
|---|---|---|
| `PreToolUse` | Before eligible tool execution | Common hook surface |
| `PostToolUse` | After successful tool execution | Common hook surface |
| `PostToolUseFailure` | Tool execution failure | Observed global event |
| `PostToolBatch` | Batch-level tool completion | Observed global event |
| `PermissionRequest` | Permission prompt/decision request | Observed global event |
| `PermissionDenied` | Denial outcome | Observed global event |
| `UserPromptSubmit` | User input submission | Common hook surface |
| `UserPromptExpansion` | Prompt expansion boundary | Observed global event |
| `SessionStart` / `SessionEnd` | Session lifetime | Common hook surface |
| `Stop` / `StopFailure` | Stop boundary and failure | `Stop` common; failure observed globally |
| `SubagentStart` / `SubagentStop` | Delegated-agent lifetime | Observed; start has dedicated anchor |
| `PreCompact` / `PostCompact` | Context compaction | Observed global events |
| `TeammateIdle` | Agent-team coordination | Observed global event |
| `TaskCreated` / `TaskCompleted` | Task lifetime | Observed global events |
| `Elicitation` / `ElicitationResult` | Protocol/user elicitation | Observed global events |
| `ConfigChange` | Effective configuration changes | Observed global event |
| `WorktreeCreate` / `WorktreeRemove` | Worktree lifetime | Observed global events |
| `InstructionsLoaded` | Instruction discovery/assembly | Observed global event |
| `CwdChanged` / `FileChanged` | Workspace changes | Observed global events |
| `Notification` / `MessageDisplay` | User-visible notification boundary | Observed global events |
| `Setup` | Setup lifecycle | Observed global event |

<span class="evidence-label observed">Observed</span> Source: [`hooks.lifecycle`](https://github.com/swyxio/claude-code-internals/blob/main/evidence/anchors.json), first recorded at main-module offset `1,194,539` / binary file offset `202,682,355`.

!!! note "Global vocabulary is broader than plugin settings"
    The main bundle has a global event table and a narrower set accepted in at least one plugin-settings path. Consumers must validate against the supported contract for their extension source, not copy this entire list into configuration.

## Matcher shape

Version-matched validation guidance describes event entries containing a string matcher and an array of hooks. Examples match one tool name or a pipe-separated set. The public evidence does not yet define escaping, wildcard, regex, or precedence semantics, so this atlas does not invent them.

## Plugin commands

| Command | Operation |
|---|---|
| `plugin details <name>` | Component inventory and projected token cost |
| `plugin init|new <name>` | Scaffold a plugin |
| `plugin validate <path>` | Validate plugin/marketplace manifest; strict mode can treat warnings as errors |
| `plugin install <plugin>` | Install from available marketplace; supports scope and declared user config |
| `plugin enable` / `disable` | Change activation state |
| `plugin update` | Retrieve a newer plugin version; restart required to apply |
| `plugin uninstall` | Remove installed plugin |
| `plugin list` | List installed plugins |
| `plugin prune` | Remove no-longer-needed auto-installed dependencies |
| `plugin tag` | Create and validate a version tag |
| `plugin marketplace ...` | Add, list, remove, or update marketplaces |

## Component classes

<span class="evidence-label observed">Observed</span> The [`plugin init --help` capture](https://github.com/swyxio/claude-code-internals/blob/main/evidence/cli-help/plugin-init.txt) identifies skills, agents, hooks, MCP, LSP, output style, and channel components.

<span class="evidence-label derived">Derived</span> The first five can affect model context or execute local/remote capabilities; output/channel components primarily affect presentation or communication but can still process sensitive content.

<span class="evidence-label derived">Derived</span> [`plugins.cli-loader`](https://github.com/swyxio/claude-code-internals/blob/main/evidence/anchors.json) supports session plugin loading with MCP contribution suppressed. [`plugins.monitor-trust`](https://github.com/swyxio/claude-code-internals/blob/main/evidence/anchors.json) supports unsandboxed monitor scripts at hook trust level.

## Installation scopes

<span class="evidence-label observed">Observed</span> [`plugin install --help`](https://github.com/swyxio/claude-code-internals/blob/main/evidence/cli-help/plugin-install.txt) accepts `user`, `project`, and `local` scopes.

<span class="evidence-label derived">Derived</span> Scope determines discovery and sharing behavior, not safety. Record source, digest, scope, enabled component set, and resolved configuration for a reproducible plugin inventory.
