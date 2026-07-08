#!/usr/bin/env node

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const evidenceDirectory = resolve("evidence/dynamic/extensions");
const expectedArtifact = {
  version: "2.1.177",
  sha256: "eb0730351be2f02b482b1855870f5877489085aac86b0c4c1db4e458d9e40ed9",
};

function readReport(name) {
  const text = readFileSync(resolve(evidenceDirectory, name), "utf8");
  assert(!text.includes("/Users/"), `${name}: absolute user path`);
  assert(!text.includes("/var/folders/"), `${name}: temporary path`);
  assert(!text.includes("/private/var/folders/"), `${name}: real temporary path`);
  assert(!text.includes("probe-dummy-key-never-valid"), `${name}: dummy credential retained`);
  assert(!text.includes("SYNTHETIC_EXTENSION_PROBE_SYSTEM"), `${name}: system prompt retained`);
  assert(!text.includes("SYNTHETIC_EXTENSION_PROBE_INPUT"), `${name}: user prompt retained`);
  const report = JSON.parse(text);
  assert.equal(report.schemaVersion, 1, `${name}: schema version`);
  assert.equal(report.artifact.version, expectedArtifact.version, `${name}: artifact version`);
  assert.equal(report.artifact.sha256, expectedArtifact.sha256, `${name}: artifact hash`);
  return report;
}

const settings = readReport("settings-precedence.json");
assert.deepEqual(settings.observedOrder, {
  persistedWinner: "local",
  explicitWinner: "explicit",
  flagWinner: "flag",
});

const hooks = readReport("hooks-ordering.json");
assert.equal(hooks.preToolConcurrentDispatch, true);
assert.deepEqual(hooks.preToolStreamPhases, [
  "hook_started",
  "hook_started",
  "hook_response",
  "hook_response",
]);
for (const event of ["UserPromptSubmit", "PreToolUse", "PostToolUse", "Stop"]) {
  assert(hooks.payloads.some((payload) => payload.safeNames.hookEventName === event));
}

const mcp = readReport("mcp-protocol.json");
assert.deepEqual(mcp.protocolMethodOrder, [
  "initialize",
  "notifications/initialized",
  "tools/list",
  "tools/call",
]);
assert.equal(mcp.advertisedTool.localName, "mcp__probe__probe_echo");
assert.equal(mcp.dispatch.toolsCallCount, 1);

const discovery = readReport("discovery.json");
const agent = discovery.cases.find((entry) => entry.name === "inline-agent-selected");
const userSkill = discovery.cases.find((entry) => entry.name === "user-skill-discovered");
const plugin = discovery.cases.find(
  (entry) => entry.name === "explicit-plugin-skill-discovered",
);
assert(agent?.syntheticCatalogEntries.includes("probe-agent"));
assert(userSkill?.syntheticCatalogEntries.includes("probe-user-skill"));
assert(plugin?.syntheticCatalogEntries.includes("probe-extension-plugin:probe-plugin-skill"));
assert.equal(plugin?.catalogCounts.plugins, 1);

const security = readReport("permission-sandbox.json");
const denied = security.permissionCases.find(
  (entry) => entry.name === "dont-ask-without-allow-rule",
);
const allowed = security.permissionCases.find(
  (entry) => entry.name === "dont-ask-with-cli-allow-rule",
);
assert.equal(denied?.toolResult.isError, true);
assert.equal(denied?.markerCreated, false);
assert.equal(allowed?.toolResult.isError, false);
assert.equal(allowed?.markerCreated, true);
assert.equal(security.sandboxCase.cwdWriteCreated, true);
assert.equal(security.sandboxCase.parentWriteCreated, false);

console.log("extension dynamic reports: sanitized invariants and observations passed");
