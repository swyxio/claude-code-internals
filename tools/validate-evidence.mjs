#!/usr/bin/env node

import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { extname, isAbsolute, join, resolve, sep } from "node:path";

const root = resolve(new URL("..", import.meta.url).pathname);
const provenance = JSON.parse(readFileSync(join(root, "evidence/provenance.json"), "utf8"));
const inventory = JSON.parse(readFileSync(join(root, "evidence/binary-inventory.json"), "utf8"));
const anchorSpec = JSON.parse(readFileSync(join(root, "evidence/anchor-spec.json"), "utf8"));
const anchors = JSON.parse(readFileSync(join(root, "evidence/anchors.json"), "utf8"));
const cliHelpIndex = JSON.parse(
  readFileSync(join(root, "evidence/cli-help-index.json"), "utf8"),
);
const claims = readFileSync(join(root, "evidence/claims.ndjson"), "utf8")
  .trim()
  .split("\n")
  .map((line, index) => {
    try {
      return JSON.parse(line);
    } catch (error) {
      throw new Error(`claims.ndjson line ${index + 1}: ${error.message}`);
    }
  });

assert.equal(inventory.binary.sha256, provenance.release.sha256);
assert.equal(inventory.binary.size, provenance.release.size);
assert.equal(inventory.binary.sha256, anchors.binarySha256);
assert.equal(inventory.graph.moduleCount, 11);
assert.equal(inventory.modules.filter((module) => module.loader === "napi").length, 5);
const entryModule = inventory.modules.find((module) => module.entry);
assert(entryModule, "binary inventory has no entry module");
assert.equal(entryModule.contentSha256, anchors.entryContentSha256);
assert.equal(entryModule.name, anchors.entryModule);

const missing = anchors.anchors.filter((anchor) => anchor.occurrenceCount === 0);
assert.deepEqual(missing, [], `unresolved anchors: ${missing.map((anchor) => anchor.id).join(", ")}`);

assert.equal(anchorSpec.schemaVersion, anchors.schemaVersion);
assert.equal(anchorSpec.anchors.length, anchors.anchors.length, "anchor spec/generated count mismatch");
const requestedIds = new Set();
for (const requested of anchorSpec.anchors) {
  assert(!requestedIds.has(requested.id), `duplicate requested anchor id: ${requested.id}`);
  requestedIds.add(requested.id);
}

const anchorById = new Map(anchors.anchors.map((anchor) => [anchor.id, anchor]));
assert.equal(anchorById.size, anchors.anchors.length, "duplicate generated anchor ids");
for (let index = 0; index < anchorSpec.anchors.length; index += 1) {
  const requested = anchorSpec.anchors[index];
  const generated = anchors.anchors[index];
  assert.equal(generated.id, requested.id, `anchor ${index}: id drift`);
  assert.equal(generated.subsystem, requested.subsystem, `${requested.id}: subsystem drift`);
  assert.equal(generated.claim, requested.claim, `${requested.id}: claim drift`);
  assert.equal(generated.needle, requested.needle, `${requested.id}: needle drift`);
  const needleSize = Buffer.byteLength(requested.needle);
  assert(needleSize >= 3 && needleSize <= 128, `${requested.id}: unsafe needle size`);
  assert.equal(
    generated.occurrenceCount,
    generated.occurrences.length,
    `${requested.id}: occurrence count mismatch`,
  );
  const seenOffsets = new Set();
  let previousOffset = -1;
  for (const occurrence of generated.occurrences) {
    assert(Number.isSafeInteger(occurrence.moduleOffset), `${requested.id}: invalid module offset`);
    assert(occurrence.moduleOffset > previousOffset, `${requested.id}: offsets are not ordered`);
    previousOffset = occurrence.moduleOffset;
    assert(!seenOffsets.has(occurrence.moduleOffset), `${requested.id}: duplicate module offset`);
    seenOffsets.add(occurrence.moduleOffset);
    assert(
      occurrence.moduleOffset + needleSize <= entryModule.contentSize,
      `${requested.id}: occurrence exceeds entry content`,
    );
    assert.equal(
      occurrence.binaryFileOffset,
      entryModule.contentFileOffset + occurrence.moduleOffset,
      `${requested.id}: binary/module offset mismatch`,
    );
    assert.equal(
      occurrence.moduleOffsetHex,
      `0x${occurrence.moduleOffset.toString(16)}`,
      `${requested.id}: module hex mismatch`,
    );
    assert.equal(
      occurrence.binaryFileOffsetHex,
      `0x${occurrence.binaryFileOffset.toString(16)}`,
      `${requested.id}: binary hex mismatch`,
    );
  }
}

const structuredEvidence = new Map();
function readStructuredEvidence(relativePath) {
  if (!structuredEvidence.has(relativePath)) {
    structuredEvidence.set(
      relativePath,
      JSON.parse(readFileSync(resolve(root, relativePath), "utf8")),
    );
  }
  return structuredEvidence.get(relativePath);
}

function resolveJsonPointer(document, pointer, label) {
  assert.equal(typeof pointer, "string", `${label}: JSON pointer must be a string`);
  assert(pointer === "" || pointer.startsWith("/"), `${label}: invalid JSON pointer ${pointer}`);
  let value = document;
  for (const encoded of pointer.split("/").slice(1)) {
    const key = encoded.replaceAll("~1", "/").replaceAll("~0", "~");
    assert(
      value !== null && typeof value === "object" && Object.hasOwn(value, key),
      `${label}: unresolved JSON pointer ${pointer}`,
    );
    value = value[key];
  }
  return value;
}

const claimIds = new Set();
for (const claim of claims) {
  assert.equal(typeof claim.id, "string", "claim id must be a string");
  assert(!claimIds.has(claim.id), `duplicate claim id: ${claim.id}`);
  claimIds.add(claim.id);
  assert(["observed", "derived", "hypothesis"].includes(claim.basis), `${claim.id}: invalid basis`);
  assert(claim.confidence >= 0 && claim.confidence <= 1, `${claim.id}: confidence outside 0..1`);
  assert.equal(claim.subject?.version, provenance.release.version, `${claim.id}: wrong version subject`);
  assert.equal(
    claim.subject?.artifactSha256,
    provenance.release.sha256,
    `${claim.id}: wrong artifact subject`,
  );
  assert(Array.isArray(claim.evidence) && claim.evidence.length > 0, `${claim.id}: missing evidence`);
  for (const reference of claim.evidence) {
    assert.equal(typeof reference.file, "string", `${claim.id}: evidence file is missing`);
    assert(!isAbsolute(reference.file), `${claim.id}: evidence file must be relative`);
    const evidencePath = resolve(root, reference.file);
    assert(
      evidencePath === root || evidencePath.startsWith(`${root}${sep}`),
      `${claim.id}: evidence path escapes repository`,
    );
    assert(existsSync(evidencePath), `${claim.id}: evidence file does not exist: ${reference.file}`);
    if (reference.pointer !== undefined) {
      resolveJsonPointer(
        readStructuredEvidence(reference.file),
        reference.pointer,
        `${claim.id} -> ${reference.file}`,
      );
    }
    if (reference.anchorId !== undefined) {
      const anchor = anchorById.get(reference.anchorId);
      assert(anchor, `${claim.id}: unknown anchor ${reference.anchorId}`);
      assert(anchor.occurrenceCount > 0, `${claim.id}: unresolved anchor ${reference.anchorId}`);
    }
  }
}

assert.equal(cliHelpIndex.binaryVersion, provenance.release.version, "CLI help version drift");
assert.equal(cliHelpIndex.binarySha256, provenance.release.sha256, "CLI help binary hash drift");
const cliFiles = new Set();
for (const capture of cliHelpIndex.captures) {
  assert(!cliFiles.has(capture.file), `duplicate CLI capture path: ${capture.file}`);
  cliFiles.add(capture.file);
  assert(capture.file.startsWith("cli-help/"), `unexpected CLI capture path: ${capture.file}`);
  const path = resolve(root, "evidence", capture.file);
  assert(path.startsWith(`${resolve(root, "evidence", "cli-help")}${sep}`), "CLI path escape");
  const bytes = readFileSync(path);
  assert.equal(bytes.length, capture.bytes, `${capture.file}: byte count drift`);
  assert.equal(
    createHash("sha256").update(bytes).digest("hex"),
    capture.sha256,
    `${capture.file}: hash drift`,
  );
}

const forbiddenExtensions = new Set([".node", ".dylib", ".so", ".exe"]);
const forbiddenContentHashes = new Set([
  provenance.release.sha256,
  ...inventory.modules.map((module) => module.contentSha256),
]);
const forbiddenMagic = new Set([
  "7f454c46",
  "feedface",
  "cefaedfe",
  "feedfacf",
  "cffaedfe",
  "cafebabe",
  "bebafeca",
  "cafebabf",
  "bfbafeca",
  "504b0304",
  "504b0506",
  "504b0708",
]);
const inspectedFiles = new Set();
const permittedLargeFiles = new Map([
  [
    resolve(root, "docs/assets/vendor/mermaid-11.16.0.min.js"),
    "74d7c46dabca328c2294733910a8aa1ed0c37451776e8d5295da38a2b758fb9b",
  ],
]);
function inspectFile(path) {
  const absolute = resolve(path);
  if (inspectedFiles.has(absolute) || !existsSync(absolute)) return;
  inspectedFiles.add(absolute);
  const stat = statSync(absolute);
  if (!stat.isFile()) return;
  assert(
    !forbiddenExtensions.has(extname(absolute)),
    `embedded executable must not be committed: ${absolute}`,
  );
  assert(
    stat.size < 2_000_000 || permittedLargeFiles.has(absolute),
    `unexpectedly large committed file: ${absolute} (${stat.size} bytes)`,
  );
  const bytes = readFileSync(absolute);
  const contentHash = createHash("sha256").update(bytes).digest("hex");
  if (permittedLargeFiles.has(absolute)) {
    assert.equal(contentHash, permittedLargeFiles.get(absolute), `vendored asset hash drift: ${absolute}`);
  }
  assert(
    !forbiddenContentHashes.has(contentHash),
    `known recovered artifact content must not be committed: ${absolute}`,
  );
  if (bytes.length >= 4) {
    const firstFour = bytes.subarray(0, 4).toString("hex");
    assert(!forbiddenMagic.has(firstFour), `executable/archive magic found: ${absolute}`);
  }
  assert(
    !bytes.subarray(0, 2).equals(Buffer.from("MZ")) &&
      !bytes.subarray(0, 3).equals(Buffer.from([0x1f, 0x8b, 0x08])),
    `executable/archive magic found: ${absolute}`,
  );
  assert(
    !bytes.subarray(0, 8).equals(Buffer.from("!<arch>\n")),
    `archive magic found: ${absolute}`,
  );
  assert(
    bytes.length < 262 || bytes.subarray(257, 262).toString("ascii") !== "ustar",
    `archive magic found: ${absolute}`,
  );
  const recoveredHeader = Buffer.from(["// @bun", "@bytecode", "@bun-cjs"].join(" "));
  const privateKeyHeaders = [
    ["-----BEGIN", "PRIVATE KEY-----"].join(" "),
    ["-----BEGIN RSA", "PRIVATE KEY-----"].join(" "),
    ["-----BEGIN EC", "PRIVATE KEY-----"].join(" "),
    ["-----BEGIN OPENSSH", "PRIVATE KEY-----"].join(" "),
    ["-----BEGIN PGP", "PRIVATE KEY BLOCK-----"].join(" "),
  ].map((header) => Buffer.from(header));
  assert(
    !bytes.includes(recoveredHeader),
    `recovered Bun source header must not be committed: ${absolute}`,
  );
  assert(
    !privateKeyHeaders.some((header) => bytes.includes(header)),
    `private key material must not be committed: ${absolute}`,
  );
  const text = bytes.toString("utf8");
  assert(!/sk-ant-[A-Za-z0-9_-]{20,}/u.test(text), `Anthropic API key pattern found: ${absolute}`);
  assert(!/gh[op]_[A-Za-z0-9]{30,}/u.test(text), `GitHub token pattern found: ${absolute}`);
}

function walk(directory) {
  for (const name of readdirSync(directory)) {
    if (
      name === ".git" ||
      name === ".work" ||
      name === ".venv" ||
      name === "node_modules" ||
      name === "site"
    )
      continue;
    const path = join(directory, name);
    const stat = statSync(path);
    if (stat.isDirectory()) walk(path);
    else inspectFile(path);
  }
}
walk(root);

// Ignored directories are skipped for speed during ordinary development, but
// a force-added file there is still part of the publication set and must pass.
const tracked = execFileSync("git", ["ls-files", "-z"], { cwd: root, encoding: "utf8" });
for (const relativePath of tracked.split("\0").filter(Boolean)) inspectFile(resolve(root, relativePath));

console.log(
  `evidence: ${anchors.anchors.length} anchors and ${claims.length} claims validated; repository hygiene checks passed`,
);
