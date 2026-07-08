# Runtime Probe Method

The runtime probes execute the exact signed Claude Code `2.1.177` binary while
preventing any provider request from leaving the machine. They complement the
static bundle atlas with narrow behavioral observations; they are not a general
security audit or a claim about every invocation mode.

[Probe source](https://github.com/swyxio/claude-code-internals/tree/main/tools/probes/runtime)
· [sanitized report](https://github.com/swyxio/claude-code-internals/blob/main/evidence/dynamic/runtime/runtime-dynamics.json)

## Isolation envelope

Each case creates a new temporary home, Claude configuration directory, XDG
directories, temporary directory, and project. The child environment is built
from an allowlist rather than inherited from the researcher’s shell. The only
credential is a fixed dummy API key, and `ANTHROPIC_BASE_URL` points to an HTTP
server bound to `127.0.0.1`.

The signed binary and any child tools run through macOS `sandbox-exec` with this
network rule:

```scheme
(version 1)
(allow default)
(deny network-outbound)
(allow network-outbound (remote ip "localhost:*"))
```

This is a **network** boundary, not a filesystem sandbox. The deterministic
fake provider emits only a fixed `Read` request for a synthetic fixture and a
fixed `Bash` command that writes one sentinel inside the temporary project. No
untrusted or remotely supplied command is executed.

Telemetry and nonessential traffic are disabled. HTTP proxy variables point to
an unused loopback port, with localhost exempted so the fake provider remains
reachable. The OS network policy is the final enforcement layer: non-loopback
outbound sockets are denied even if an application path ignores proxy or
telemetry settings.

## Publication boundary

Raw request bodies, stdout, stderr, transcript lines, prompts, credentials, tool
descriptions, tool inputs, and tool results exist only in the temporary process
memory. The committed report retains:

- SHA-256 and byte counts;
- HTTP methods, paths, header names, and JSON field names;
- message roles, content-block types, tool names, and event order;
- normalized relative file paths, modes, sizes, and hashes;
- transcript record types and top-level field names.

Temporary project keys, UUIDs, and epoch timestamps become `$PROJECT_KEY`,
`$UUID`, and `$EPOCH_MS`. The generator fails if the serialized report contains
the dummy key, synthetic prompt text, response markers, fixture text, or an
absolute probe path.

## Reproduction

The capture script refuses to run unless the executable SHA-256 equals the
artifact in `evidence/provenance.json`.

```sh
node --test tools/probes/runtime/runtime.test.mjs
node tools/probes/runtime/capture-runtime.mjs
```

The tests verify request/output sanitization, path normalization, the fake SSE
protocol, environment allowlisting, and the loopback-only policy. The capture
then runs a no-tools text turn and a persistence-enabled `Read` → `Bash` tool
turn. Temporary directories are removed in `finally` paths.

## Limits

- `--bare --safe-mode --print` intentionally excludes normal-mode extensions.
- A loopback provider establishes client behavior, not production service
  behavior or retention.
- The fake response exercises success paths, not retries, overload, malformed
  streams, compaction, cancellation, or permission prompts.
- `sandbox-exec` applies on the inspected macOS host; another platform needs an
  equivalent deny-by-default outbound policy before running the probe.
