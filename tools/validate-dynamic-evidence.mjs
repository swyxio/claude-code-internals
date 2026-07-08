#!/usr/bin/env node

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(new URL("..", import.meta.url).pathname);
const provenance = JSON.parse(readFileSync(resolve(root, "evidence/provenance.json"), "utf8"));

function readReport(relativePath) {
  const raw = readFileSync(resolve(root, relativePath), "utf8");
  return { raw, report: JSON.parse(raw) };
}

function assertPublicationSafe(raw, label, forbidden = []) {
  assert(!raw.includes("/Users/"), `${label}: absolute user path`);
  assert(!raw.includes("/private/var/"), `${label}: absolute temporary path`);
  assert(!/sk-ant-[A-Za-z0-9_-]{12,}/u.test(raw), `${label}: API-key-shaped value`);
  assert(!/Bearer\s+[A-Za-z0-9._~-]{12,}/u.test(raw), `${label}: bearer credential`);
  assert(!/-----BEGIN [A-Z ]*PRIVATE KEY-----/u.test(raw), `${label}: private key material`);
  for (const value of forbidden) assert(!raw.includes(value), `${label}: forbidden raw fixture value`);
}

const core = readReport("evidence/dynamic/core/protocol-smoke.json");
const { report } = core;

assert.equal(report.schemaVersion, 1);
assert.equal(report.probe, "core/protocol-smoke");
assert.equal(report.subject.version, provenance.release.version);
assert.equal(report.subject.artifactSha256, provenance.release.sha256);
assert.equal(report.result.exitCode, 0);
assert.equal(report.result.signal, null);
assert.equal(report.result.truncated, false);
assert(report.transport.requestCount >= 1, "dynamic probe captured no request");
assert.equal(report.transport.requestCount, report.transport.requests.length);

for (const [name, enabled] of Object.entries(report.isolation)) {
  if (name.endsWith("Retained")) assert.equal(enabled, false, `${name} must remain false`);
  else assert.equal(enabled, true, `${name} must remain true`);
}

const reachabilityRequests = report.transport.requests.filter(
  (request) => request.method === "HEAD" && request.path === "/",
);
const messageRequests = report.transport.requests.filter(
  (request) => request.method === "POST" && request.path.startsWith("/v1/messages"),
);
assert.equal(reachabilityRequests.length, 1, "expected one provider reachability probe");
assert(messageRequests.length >= 1, "expected at least one Messages API request");

for (const request of messageRequests) {
  assert.equal(request.credentials.apiKeyPresent, true);
  assert.equal(request.credentials.authorizationPresent, false);
  assert(Array.isArray(request.body.topLevelKeys));
  assert(Array.isArray(request.body.system));
  assert(Array.isArray(request.body.messages));
  assert(Array.isArray(request.body.tools));
}

assertPublicationSafe(core.raw, "core protocol probe", [
  "probe-dummy-key",
  "Return exactly PROBE_OK.",
]);

const resultEvent = report.result.stream.find((event) => event.type === "result");
assert(resultEvent, "stream-json output has no result event");

const runtime = readReport("evidence/dynamic/runtime/runtime-dynamics.json");
assert.equal(runtime.report.schemaVersion, 1);
assert.equal(runtime.report.probe, "runtime/runtime-dynamics");
assert.equal(runtime.report.subject.version, provenance.release.version);
assert.equal(runtime.report.subject.artifactSha256, provenance.release.sha256);
assert.equal(runtime.report.isolation.inheritedEnvironment, false);
assert.equal(runtime.report.isolation.loopbackProvider, true);
assert.equal(runtime.report.isolation.rawRequestBodiesRetained, false);
assert.equal(runtime.report.isolation.rawProcessOutputRetained, false);
assert.equal(runtime.report.isolation.rawTranscriptsRetained, false);
assert.equal(runtime.report.isolation.temporaryDirectoriesRemoved, true);

const [textTurn, toolLoop] = runtime.report.runs;
assert.equal(runtime.report.runs.length, 2);
assert.equal(textTurn.label, "text-turn");
assert.equal(toolLoop.label, "tool-loop");
for (const run of runtime.report.runs) {
  assert.equal(run.process.exitCode, 0, `${run.label}: nonzero exit`);
  assert.equal(run.process.timedOut, false, `${run.label}: timed out`);
  assert.equal(run.transport.unexpectedRequests.length, 0, `${run.label}: unexpected request`);
  assert(run.process.stdout.eventOrder.includes("result:success"), `${run.label}: no success result`);
}
assert.deepEqual(textTurn.transport.requestOrder, ["POST /v1/messages"]);
assert.equal(textTurn.filesystem.transcriptCount, 0);
assert.equal(textTurn.filesystem.processSentinel.present, false);
assert.deepEqual(toolLoop.transport.requestOrder, [
  "POST /v1/messages",
  "POST /v1/messages",
  "POST /v1/messages",
]);
assert.equal(toolLoop.filesystem.transcriptCount, 1);
assert.equal(toolLoop.filesystem.processSentinel.present, true);
assert.equal(toolLoop.filesystem.processSentinel.mode, "644");
const transcript = toolLoop.filesystem.changes.created.find((entry) => entry.path.endsWith(".jsonl"));
assert(transcript, "runtime tool loop has no transcript summary");
assert.equal(transcript.mode, "600");
assert.deepEqual(transcript.jsonLines.eventOrder, [
  "queue-operation",
  "queue-operation",
  "user",
  "assistant",
  "user",
  "assistant",
  "user",
  "assistant",
  "last-prompt",
]);
assert.equal(runtime.report.observations.length, 6);
assertPublicationSafe(runtime.raw, "runtime probe", [
  "runtime-probe-dummy-key-not-a-secret",
  "runtime-probe-system",
  "Perform the synthetic runtime probe turn.",
  "synthetic-runtime-fixture",
  "runtime-process-ok",
]);

console.log(
  `dynamic evidence: core (${report.transport.requestCount} request(s)) and runtime (${runtime.report.runs.length} case(s)) validated`,
);
