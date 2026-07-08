#!/usr/bin/env node

import { execFileSync } from "node:child_process";
import { mkdirSync } from "node:fs";
import { resolve } from "node:path";

const outputDirectory = resolve(
  process.argv[2] ?? "evidence/dynamic/extensions",
);
mkdirSync(outputDirectory, { recursive: true, mode: 0o700 });

const probes = [
  ["settings-precedence.mjs", "settings-precedence.json"],
  ["hooks-ordering.mjs", "hooks-ordering.json"],
  ["mcp-protocol.mjs", "mcp-protocol.json"],
  ["discovery.mjs", "discovery.json"],
  ["permission-sandbox.mjs", "permission-sandbox.json"],
];

for (const [script, report] of probes) {
  execFileSync(
    process.execPath,
    [resolve("tools/probes/extensions", script), resolve(outputDirectory, report)],
    { stdio: "inherit" },
  );
}
