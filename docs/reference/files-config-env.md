# Files, Configuration, and Environment

This reference separates paths and variables confirmed for the `2.1.177` artifact from paths merely plausible in similar tools. A string present in the bundle is evidence of a code path, not proof that the path exists on every machine.

## Installation paths

| Path | Status | Purpose |
|---|---|---|
| `$HOME/.local/bin/claude` | Observed on capture host | Active launcher symlink |
| `$HOME/.local/share/claude/versions/2.1.177` | Observed | Active signed executable |
| `$HOME/.local/share/claude/versions/<version>` | Observed pattern | Retained version-named executable |

These paths come from [`provenance.json`](https://github.com/swyxio/claude-code-internals/blob/main/evidence/provenance.json). The installer may choose different platform-specific locations elsewhere.

## Configuration sources

| Source | Activation | Trust notes |
|---|---|---|
| Managed/policy | Organization or administrator | Can constrain lower-trust permission choices |
| User | Ordinary user settings | Broad scope across projects |
| Project | Repository-scoped settings | Potentially checked in; requires workspace scrutiny |
| Local | Machine-local project settings | Not necessarily shared, still executable configuration |
| Explicit settings | `--settings <file-or-json>` | Caller-selected; validate before launch |
| CLI flags | Current process | High precedence for many operational choices, still policy-constrained |
| Environment | Current process and provider SDKs | Can contain secrets and feature controls |
| Remote/account | Service or account state | Can vary without changing the binary |

`--setting-sources` explicitly names `user`, `project`, and `local`. The existence of managed restrictions is anchored by `permissions.managed-only` and `permissions.disable-bypass`.

## Claude-related paths observed in the bundle

The private string inventory includes these path families:

| Family | Example | Interpretation |
|---|---|---|
| User settings | `~/.claude/settings.json` | User-scoped configuration |
| Project settings | `.claude/settings.json`, `.claude/settings.local.json` | Project and machine-local project configuration |
| Instructions/rules | `~/.claude/CLAUDE.md`, `.claude/rules/` | Context customization |
| Agents/skills/commands | `.claude/agents/`, `.claude/skills/`, `.claude/commands/` | Extension discovery |
| Plugins | `~/.claude/plugins/` | Installed plugin state/data |
| Sessions/projects | `~/.claude/projects/` | Project-associated state |
| Plans/tasks/teams | `~/.claude/plans/`, `~/.claude/tasks/`, `~/.claude/teams/` | Agent coordination state |
| Debug | `~/.claude/debug/` | Diagnostic output |
| Worktrees | `.claude/worktrees/` | Worktree orchestration |

<span class="evidence-label observed">Observed</span> The names are artifact strings. Exact creation conditions, schemas, permissions, and retention are not all established by the current public anchors. Do not create or mutate these paths solely from this table.

## Anchor-backed environment controls

| Variable / key | Evidence |
|---|---|
| `CLAUDE_CODE_ENTRYPOINT` | Routes one executable among entrypoint identities (`entrypoint.routing`) |
| `CLAUDE_CODE_SUBPROCESS_ENV_SCRUB` | Hardens subprocess permission inheritance (`permissions.subprocess-scrub`) |
| `CLAUDE_CODE_USE_BEDROCK` | Selects Bedrock route (`providers.bedrock`) |
| `CLAUDE_CODE_USE_VERTEX` | Selects Vertex route (`providers.vertex`) |
| `CLAUDE_CODE_USE_FOUNDRY` | Selects Foundry route (`providers.foundry`) |
| `ANTHROPIC_API_KEY` | Direct API-key auth (`auth.api-key`) |
| `CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC` | Suppresses a class of outbound traffic (`telemetry.nonessential-off`) |
| `CLAUDE_CODE_SAFE_MODE` | Set by `--safe-mode` per CLI help |
| `CLAUDE_CODE_SIMPLE` | Set by `--bare` per CLI help |

See the [anchor ledger](https://github.com/swyxio/claude-code-internals/blob/main/evidence/anchors.json) for counts and offsets.

## Why there is no raw environment-variable dump

The embedded bundle contains vendor libraries, tests, feature experiments, internal-only switches, and compatibility shims. Extracting every uppercase identifier would mix supported controls with unreachable or third-party code. This reference includes only CLI-advertised or semantically anchored variables.

## Safe inspection

Do not publish a user’s actual settings or environment. To inspect shape without values, use a synthetic home directory and fixture configuration. To compare effective behavior, vary one source at a time and record the artifact hash, cwd, selected sources, safe/bare mode, and managed-policy context.
