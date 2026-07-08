#!/usr/bin/env node

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(new URL("..", import.meta.url).pathname);
const provenance = JSON.parse(readFileSync(resolve(root, "evidence/provenance.json"), "utf8"));
const reportPath = resolve(root, "evidence/dynamic/core/protocol-smoke.json");
const raw = readFileSync(reportPath, "utf8");
const report = JSON.parse(raw);

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

assert(!raw.includes("/Users/"), "dynamic report contains an absolute user path");
assert(!raw.includes("probe-dummy-key"), "dynamic report contains its dummy credential");
assert(!raw.includes("Return exactly PROBE_OK."), "dynamic report contains its raw prompt");
assert(!/sk-ant-[A-Za-z0-9_-]{12,}/u.test(raw), "dynamic report contains an API-key-shaped value");
assert(!/-----BEGIN [A-Z ]*PRIVATE KEY-----/u.test(raw), "dynamic report contains private key material");

const resultEvent = report.result.stream.find((event) => event.type === "result");
assert(resultEvent, "stream-json output has no result event");
console.log(
  `dynamic evidence: ${report.transport.requestCount} sanitized request(s), ${report.result.stream.length} output event(s) validated`,
);
