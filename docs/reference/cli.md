# CLI Reference

This is a subsystem-oriented reference for the `2.1.177` command surface. The source captures were produced with read-only `--help` invocations and are preserved under [`evidence/cli-help/`](https://github.com/swyxio/claude-code-internals/tree/main/evidence/cli-help).

## Top-level commands

| Command | Purpose | Security-relevant behavior |
|---|---|---|
| `agents` | View and dispatch background sessions | Can pass directories, tools, permissions, MCP, and plugins |
| `auth` | Login, logout, status | Changes or reads authentication state when subcommands run |
| `auto-mode` | Print/default/critique classifier rules | Critique can involve an AI request; config/defaults are inspection surfaces |
| `doctor` | Check updater health | Skips trust dialog and may spawn `.mcp.json` stdio servers |
| `install` | Install stable/latest/specific native build | Writes version store and launcher |
| `mcp` | Configure and serve MCP | Can write config, spawn child servers, or start a server |
| `plugin` | Manage plugins and marketplaces | Installs executable extension components |
| `project` | Manage project state | `purge` deletes transcripts, tasks, history, and config entry |
| `setup-token` | Create a long-lived subscription token | Produces credential material |
| `ultrareview` | Start cloud-hosted multi-agent review | Upload/network implications require separate review |
| `update` / `upgrade` | Check and install updates | Replaces active version selection |

This reference table is derived from help captures; a command appearing here
was not executed merely to populate the table. Separate, named
[runtime observations](../dynamics/index.md) did execute narrow print-mode,
provider, tool, MCP, settings, hook, permission, and sandbox scenarios under
temporary isolation and synthetic fixtures.

## Session and identity options

| Option | Meaning |
|---|---|
| `--session-id <uuid>` | Use an explicit session identity |
| `--continue` | Continue the latest conversation in the current directory |
| `--resume [value]` | Resume by ID or open a searchable picker |
| `--fork-session` | Create a new identity while resuming prior context |
| `--from-pr [value]` | Resume a session linked to a pull request |
| `--name <name>` | Set session display name |
| `--no-session-persistence` | Disable print-mode session persistence |

## Prompt and context options

- `--system-prompt` and system-prompt file variants replace the default prompt.
- `--append-system-prompt` and file variants extend it.
- `--agent` selects a configured agent; `--agents <json>` defines agents inline.
- `--add-dir` expands approved directory roots.
- `--file file_id:relative_path` downloads startup resources.
- `--exclude-dynamic-system-prompt-sections` moves machine-specific sections into the first user message when using the default prompt.

## Tool and permission options

| Option | Role |
|---|---|
| `--tools` | Select registered built-in tools |
| `--allowedTools` / `--allowed-tools` | Add allow rules |
| `--disallowedTools` / `--disallowed-tools` | Add deny rules |
| `--permission-mode` | Select `default`, `acceptEdits`, `plan`, `dontAsk`, `bypassPermissions`, or `auto` |
| `--dangerously-skip-permissions` | Select bypass mode directly |
| `--allow-dangerously-skip-permissions` | Make bypass selectable without choosing it by default |

The help warning recommends bypass only in a sandbox without internet access. Managed policy can disable the mode entirely; see anchors `permissions.disable-bypass` and `sandbox.fail-closed` in the [anchor ledger](https://github.com/swyxio/claude-code-internals/blob/main/evidence/anchors.json).

## Headless protocol options

| Option | Values / constraint |
|---|---|
| `--print` | Non-interactive mode |
| `--input-format` | `text` or `stream-json`; print mode only |
| `--output-format` | `text`, `json`, or `stream-json`; print mode only |
| `--include-partial-messages` | Partial chunks with print + stream-JSON |
| `--include-hook-events` | Hook lifecycle events in stream-JSON |
| `--replay-user-messages` | Acknowledge streamed input messages |
| `--json-schema` | Validate structured final output |
| `--prompt-suggestions` | Emit predicted next-prompt event |
| `--max-budget-usd` | Bound API spending in print mode |
| `--fallback-model` | Print-mode turn-scoped model fallback chain |

!!! warning "Headless trust behavior"
    Print mode skips the workspace-trust dialog, including when stdout is redirected. It also silently ignores invalid settings instead of showing an error dialog. Use a trusted cwd and prevalidate automation inputs.

## Extension and integration options

- `--mcp-config` and `--strict-mcp-config` load explicit MCP sources and optionally exclude all others.
- `--plugin-dir` loads a directory or zip for the session.
- `--plugin-url` fetches a plugin zip for the session.
- `--ide`, `--chrome`, and `--no-chrome` control local application bridges.
- `--remote-control` enables a remotely controlled interactive session.
- `--worktree` and `--tmux` provision Git/terminal workspaces.

## Diagnostic options

`--debug [filter]` accepts category inclusion/exclusion, and `--debug-file` writes logs. `--verbose` overrides configured verbosity. Diagnostic output may include sensitive paths or extension errors and must be redacted before sharing.

## Capture integrity

The [help index](https://github.com/swyxio/claude-code-internals/blob/main/evidence/cli-help-index.json) records each command, output byte count, and SHA-256. If a local `2.1.177` help output differs, verify the executable digest before treating it as the same snapshot.
