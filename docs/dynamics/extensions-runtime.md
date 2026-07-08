# Extension Runtime Dynamics

Static anchors establish that settings, hooks, MCP, agents, skills, and plugins
exist. The isolated probes on this page show how selected paths behaved in the
signed `2.1.177` artifact. They do not generalize to other versions or extension
types.

## Safety boundary

Every run used a fresh temporary home and Git project, a loopback-only fake
Anthropic endpoint, a non-secret dummy API key, disabled telemetry and
nonessential traffic, and no session persistence. Hook and MCP child processes
were repository-owned fixtures. No real account, provider, MCP server, plugin
registry, or external destination was intentionally contacted. All configured
provider traffic terminated at loopback. Every probe except the nested
product-sandbox case also inherited an outer OS policy denying non-loopback
outbound sockets; that exception avoids confounding the sandbox being measured
with a second Seatbelt profile.

Committed reports contain shapes, hashes, counts, known lifecycle names, and
short synthetic fixture identifiers. Raw prompts, default system instructions,
hook values, JSON-RPC bodies, tool arguments/results, extension bodies, and
absolute temporary paths are discarded.

## Settings precedence

The [`settings-precedence` report](https://github.com/swyxio/claude-code-internals/blob/main/evidence/dynamic/extensions/settings-precedence.json)
varied only the model selector so the winning source was visible in the
loopback request without publishing configuration values.

| Inputs present | Observed winner |
|---|---|
| user only | user |
| project only | project |
| local only | local |
| user + project + local | local |
| persisted sources + `--settings` | explicit settings file |
| all above + `--model` | CLI model flag |

This establishes `local < explicit settings < CLI flag` for this scalar key,
with local winning the persisted-source comparison. It does not prove a single
global merge order: arrays, maps, permissions, managed policy, and project MCP
approval can have key-specific rules.

## Hook scheduling and payloads

The [`hooks-ordering` report](https://github.com/swyxio/claude-code-internals/blob/main/evidence/dynamic/extensions/hooks-ordering.json)
captured sanitized payload schemas for `UserPromptSubmit`, `PreToolUse`,
`PostToolUse`, and `Stop`. Across those events, common fields included
`session_id`, `transcript_path`, `cwd`, `permission_mode`, and
`hook_event_name`. Tool events also carried `tool_name`, `tool_input`, and
`tool_use_id`; `PostToolUse` added `duration_ms` and `tool_response`; `Stop`
added background/session work arrays and `stop_hook_active`.

Two sibling command hooks were declared in the order `[slow, fast]`. Stream
JSON showed:

```text
hook_started → hook_started → hook_response → hook_response
```

The child-process start order varied across repeated runs, and the fast hook
could complete first. Sibling hooks are therefore concurrently dispatched in
this tested path. A hook must not depend on declaration-order side effects from
another sibling hook. Ordering across different lifecycle events remained
prompt → pre-tool → post-tool → stop in this single-turn fixture.

## MCP stdio handshake and dispatch

The [`MCP report`](https://github.com/swyxio/claude-code-internals/blob/main/evidence/dynamic/extensions/mcp-protocol.json) records
this method order:

```text
initialize → notifications/initialized → tools/list → tools/call
```

The client proposed protocol version `2025-11-25`. Its initialize capabilities
contained `elicitation` and `roots`. The server's remote `probe_echo` tool was
advertised to the model as `mcp__probe__probe_echo`. `tools/call` carried
`name`, `arguments`, and `_meta`; the observed `_meta` keys were
`claudecode/toolUseId` and `progressToken`.

This is one strict-config stdio session. HTTP, SSE, WebSocket, OAuth, retries,
list-change notifications, cancellation, resources, prompts, and elicitation
responses remain untested.

## Agent, skill, and plugin discovery

The [`discovery` report](https://github.com/swyxio/claude-code-internals/blob/main/evidence/dynamic/extensions/discovery.json)
compares clean baselines with three explicit fixtures:

- selecting an inline agent increased the init agent catalog by one, exposed
  its synthetic name, injected the selected prompt at the request system
  boundary, and narrowed the advertised tools to the agent's `Read` allowlist;
- a user-home skill increased both skill and slash-command counts by one and
  exposed its synthetic catalog name and description marker;
- an explicitly supplied local plugin appeared as one inline plugin and added
  one namespaced skill and slash command,
  `probe-extension-plugin:probe-plugin-skill`.

Marker presence proves discovery or prompt assembly, not that the model obeys
the text. Marketplace installation, persisted enablement, project trust,
dynamic refresh, plugin hooks/MCP, nested agent inheritance, and skill script
execution need separate probes.

## Reproduce

```sh
node tools/probes/extensions/run-all.mjs
node tools/probes/extensions/probe-reports.test.mjs
```
