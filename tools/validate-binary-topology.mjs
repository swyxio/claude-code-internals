#!/usr/bin/env node

import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { resolve } from "node:path";

const root = resolve(new URL("..", import.meta.url).pathname);
const temporary = mkdtempSync(resolve(tmpdir(), "claude-binary-topology-"));
const generatedPath = resolve(temporary, "binary-topology.json");
const committedPath = resolve(root, "evidence/binary-topology.json");

try {
  execFileSync(process.execPath, [resolve(root, "tools/build-binary-topology.mjs"), generatedPath], {
    cwd: root,
    stdio: "ignore",
  });
  const generated = readFileSync(generatedPath);
  const committed = readFileSync(committedPath);
  assert(generated.equals(committed), "committed binary topology differs from deterministic generator");

  const topology = JSON.parse(committed);
  assert.equal(topology.schemaVersion, 1);
  assert.equal(topology.graph.moduleCount, 11);
  assert.equal(topology.modules.length, 11);
  assert.equal(topology.nativePairs.length, 5);
  assert.equal(topology.aggregates.sourcemapBytes, 0);
  assert.equal(topology.aggregates.moduleInfoBytes, 0);
  assert.equal(topology.entrypointPair.originMatchesModuleName, true);
  assert.equal(topology.entrypointPair.observedPayloadModulo128, 120);
  assert.equal(topology.entrypointPair.observedFileModulo128, 0);
  console.log("binary topology: deterministic output and structural invariants validated");
} finally {
  rmSync(temporary, { recursive: true, force: true });
}
