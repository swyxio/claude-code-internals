# Extension and security dynamic evidence

These reports were generated from the signed Claude Code `2.1.177` artifact in
the repository provenance ledger. Every probe uses a newly created temporary
home and Git project, a loopback-only fake provider, a dummy credential, and
disabled nonessential traffic and telemetry.

Reports retain only structural summaries, source labels, lifecycle ordering,
short synthetic fixture names, counts, booleans, and hashes. They exclude raw
prompts, hook payload values, MCP arguments/results, extension bodies, command
text, credentials, absolute temporary paths, and Claude output.

Generate and validate this evidence from the repository root:

```sh
node tools/probes/extensions/run-all.mjs
node tools/probes/extensions/probe-reports.test.mjs
```

The probe suite writes:

- `settings-precedence.json` — model-selection precedence across setting sources;
- `hooks-ordering.json` — lifecycle payload schemas and sibling-hook scheduling;
- `mcp-protocol.json` — one stdio handshake, discovery, and tool call;
- `discovery.json` — inline-agent, user-skill, and explicit-plugin catalogs;
- `permission-sandbox.json` — `dontAsk`, explicit allow, and a bounded sandbox write test.

These are narrow behavioral experiments, not universal guarantees. Each report
states its limits and pins the exact artifact hash.
