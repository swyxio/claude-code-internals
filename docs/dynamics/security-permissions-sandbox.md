# Permission and Sandbox Dynamics

The isolated security probe uses a fake model response that requests one
synthetic Bash command. The command only writes markers inside a disposable
probe tree. It never reads user files or credentials and never accesses the
network.

## `dontAsk` and explicit allow

The [`permission and sandbox report`](https://github.com/swyxio/claude-code-internals/blob/main/evidence/dynamic/extensions/permission-sandbox.json)
compares two otherwise identical turns:

| Mode and rule | Tool result | Marker written |
|---|---:|---:|
| `dontAsk`, no allow rule | error | no |
| `dontAsk`, CLI `--allowedTools Bash` | success | yes |

In this path, `dontAsk` did not silently approve a tool. It denied a tool that
needed authorization and returned an error `tool_result` to the model. An
explicit CLI allow rule changed that outcome. This does not establish how
managed policy, path-aware Bash patterns, MCP maximum permissions, hooks, or
interactive prompts compose.

## Fail-closed sandbox write boundary

The macOS probe enabled:

```json
{
  "enabled": true,
  "failIfUnavailable": true,
  "autoAllowBashIfSandboxed": true,
  "allowUnsandboxedCommands": false
}
```

With an explicit Bash allow rule, the command wrote a marker in its temporary
working directory but could not write a second marker in the temporary parent
directory. The tool result was an error because the denied write made the
compound command fail. This is evidence of a write boundary for those two
locations, not proof of complete containment.

The child command did not receive a non-empty `CLAUDE_CODE_SANDBOXED` variable
in this run. Do not use that variable as the sole runtime indicator that a tool
is sandboxed; rely on configuration, fail-closed behavior, and controlled
capability tests.

## What this does not test

- reads outside the working directory;
- network, Unix-socket, or local-bind isolation;
- weaker nested/network compatibility modes;
- excluded or explicitly unsandboxed commands;
- subprocess trees, signals, resource limits, or sandbox escapes;
- Linux bubblewrap or Windows SRT/WFP implementations.

Those require separate minimal fixtures and private review before publishing
security-relevant anomalies.
