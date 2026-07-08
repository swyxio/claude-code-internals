#!/usr/bin/env node

import assert from "node:assert/strict";
import { readFileSync, realpathSync } from "node:fs";
import { resolve } from "node:path";
import { findBunSection, parseModuleGraph, safeOutputPath } from "./inspect-binary.mjs";

const binary = realpathSync(process.env.CLAUDE_BINARY ?? `${process.env.HOME}/.local/bin/claude`);
const bytes = readFileSync(binary);
const provenance = JSON.parse(
  readFileSync(resolve(new URL("..", import.meta.url).pathname, "evidence/provenance.json"), "utf8"),
);
const section = findBunSection(bytes);
const parsed = parseModuleGraph(bytes);

assert.equal(section.fileOffset, 72_368_128);
assert.equal(parsed.graph.moduleCount, 11);
assert.equal(parsed.graph.entryPointId, 0);
assert.equal(parsed.modules[0].name, "/$bunfs/root/src/entrypoints/cli.js");
assert.equal(parsed.modules[0].contentSize, 17_038_096);
assert.equal(parsed.modules[0].bytecodeSize, 129_119_488);
assert.equal(parsed.modules.filter((module) => module.loader === "napi").length, 5);
assert(
  bytes.includes(Buffer.from(provenance.runtime.embeddedVersionString)),
  "embedded Bun runtime version string is missing",
);

const offsetsFileOffset =
  section.fileOffset + 8 + parsed.payloadSize - 16 - 32;

const badByteCount = Buffer.from(bytes);
badByteCount.writeBigUInt64LE(
  BigInt(parsed.graph.byteCount + 1),
  offsetsFileOffset,
);
assert.throws(
  () => parseModuleGraph(badByteCount),
  /graph byte count .* does not match offsets start/u,
);

const badCompileArgv = Buffer.from(bytes);
badCompileArgv.writeUInt32LE(parsed.graph.byteCount - 1, offsetsFileOffset + 20);
badCompileArgv.writeUInt32LE(4, offsetsFileOffset + 24);
assert.throws(() => parseModuleGraph(badCompileArgv), /compile argv: outside graph bytes/u);

const badCompileTerminator = Buffer.from(bytes);
badCompileTerminator[
  section.fileOffset + 8 + parsed.graph.compileArgvOffset + parsed.graph.compileArgvSize
] = 0x58;
assert.throws(
  () => parseModuleGraph(badCompileTerminator),
  /compile argv: missing NUL terminator/u,
);

const badSourcemap = Buffer.from(bytes);
const moduleTableFileOffset = section.fileOffset + 8 + parsed.graph.modulesOffset;
badSourcemap.writeUInt32LE(parsed.graph.byteCount - 1, moduleTableFileOffset + 16);
badSourcemap.writeUInt32LE(4, moduleTableFileOffset + 20);
assert.throws(() => parseModuleGraph(badSourcemap), /module 0 sourcemap: outside graph bytes/u);

const badContentTerminator = Buffer.from(bytes);
const entryContentOffset = badContentTerminator.readUInt32LE(moduleTableFileOffset + 8);
const entryContentSize = badContentTerminator.readUInt32LE(moduleTableFileOffset + 12);
badContentTerminator[
  section.fileOffset + 8 + entryContentOffset + entryContentSize
] = 0x58;
assert.throws(
  () => parseModuleGraph(badContentTerminator),
  /module 0 content: missing NUL terminator/u,
);

const badNameTerminator = Buffer.from(bytes);
const entryNameOffset = badNameTerminator.readUInt32LE(moduleTableFileOffset);
const entryNameSize = badNameTerminator.readUInt32LE(moduleTableFileOffset + 4);
badNameTerminator[section.fileOffset + 8 + entryNameOffset + entryNameSize] = 0x58;
assert.throws(() => parseModuleGraph(badNameTerminator), /module 0 name: missing NUL terminator/u);

const badSegmentSections = Buffer.from(bytes);
let loadCommandOffset = 32;
let bunSegmentOffset = -1;
for (let index = 0; index < badSegmentSections.readUInt32LE(16); index += 1) {
  const command = badSegmentSections.readUInt32LE(loadCommandOffset);
  const commandSize = badSegmentSections.readUInt32LE(loadCommandOffset + 4);
  if (
    command === 0x19 &&
    badSegmentSections
      .subarray(loadCommandOffset + 8, loadCommandOffset + 24)
      .toString("ascii")
      .replace(/\0+$/u, "") === "__BUN"
  ) {
    bunSegmentOffset = loadCommandOffset;
    break;
  }
  loadCommandOffset += commandSize;
}
assert(bunSegmentOffset >= 0, "fixture has no __BUN segment command");
badSegmentSections.writeUInt32LE(0xffff, bunSegmentOffset + 64);
assert.throws(() => findBunSection(badSegmentSections), /sections exceed command size/u);

const badSectionSegmentName = Buffer.from(bytes);
badSectionSegmentName[bunSegmentOffset + 72 + 16] = 0x58;
assert.throws(
  () => findBunSection(badSectionSegmentName),
  /__bun has mismatched segment name/u,
);

assert.throws(
  () => safeOutputPath("/tmp/claude-extract", "/$bunfs/root/../escape"),
  /unsafe embedded path/u,
);
assert.throws(
  () => safeOutputPath("/tmp/claude-extract", "/$bunfs/root/nested//escape"),
  /unsafe embedded path/u,
);

const evidenceRoot = resolve(new URL("..", import.meta.url).pathname, "evidence");
const anchorSpec = JSON.parse(readFileSync(resolve(evidenceRoot, "anchor-spec.json"), "utf8"));
const anchorIndex = JSON.parse(readFileSync(resolve(evidenceRoot, "anchors.json"), "utf8"));
const entry = parsed.modules.find((module) => module.entry);
assert(entry, "fixture entry module missing");
const entryBytes = parsed.payload.subarray(
  entry.contentPayloadOffset,
  entry.contentPayloadOffset + entry.contentSize,
);
assert.equal(anchorSpec.anchors.length, anchorIndex.anchors.length);
for (let index = 0; index < anchorSpec.anchors.length; index += 1) {
  const requested = anchorSpec.anchors[index];
  const generated = anchorIndex.anchors[index];
  const needle = Buffer.from(requested.needle, "utf8");
  assert(needle.length >= 3 && needle.length <= 128, `${requested.id}: unsafe needle size`);
  assert.equal(generated.id, requested.id);
  for (const occurrence of generated.occurrences) {
    assert(
      entryBytes.subarray(occurrence.moduleOffset, occurrence.moduleOffset + needle.length).equals(needle),
      `${requested.id}: fixture bytes do not match recorded occurrence`,
    );
  }
  let actualCount = 0;
  let from = 0;
  while (from <= entryBytes.length - needle.length) {
    const found = entryBytes.indexOf(needle, from);
    if (found === -1) break;
    actualCount += 1;
    from = found + needle.length;
  }
  assert.equal(actualCount, generated.occurrenceCount, `${requested.id}: occurrence count drift`);
}

console.log("inspect-binary: fixture and malformed-metadata assertions passed for Claude Code 2.1.177");
