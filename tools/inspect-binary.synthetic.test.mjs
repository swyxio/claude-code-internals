#!/usr/bin/env node

import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { findBunSection, parseModuleGraph, safeOutputPath } from "./inspect-binary.mjs";

const TRAILER = Buffer.from("\n---- Bun! ----\n");

function appendZ(chunks, value) {
  const bytes = Buffer.from(value);
  const offset = chunks.reduce((total, chunk) => total + chunk.length, 0);
  chunks.push(bytes, Buffer.from([0]));
  return { offset, size: bytes.length };
}

function buildFixture() {
  const chunks = [];
  const name = appendZ(chunks, "/$bunfs/root/synthetic.js");
  const contents = appendZ(chunks, "module.exports = 42;\n");
  const compileArgv = appendZ(chunks, "");
  const modulesOffset = chunks.reduce((total, chunk) => total + chunk.length, 0);
  const moduleRecord = Buffer.alloc(52);
  moduleRecord.writeUInt32LE(name.offset, 0);
  moduleRecord.writeUInt32LE(name.size, 4);
  moduleRecord.writeUInt32LE(contents.offset, 8);
  moduleRecord.writeUInt32LE(contents.size, 12);
  moduleRecord[48] = 1; // latin1
  moduleRecord[49] = 1; // js
  moduleRecord[50] = 2; // cjs
  moduleRecord[51] = 0; // server
  chunks.push(moduleRecord);

  const graphBytes = Buffer.concat(chunks);
  const offsets = Buffer.alloc(32);
  offsets.writeBigUInt64LE(BigInt(graphBytes.length), 0);
  offsets.writeUInt32LE(modulesOffset, 8);
  offsets.writeUInt32LE(moduleRecord.length, 12);
  offsets.writeUInt32LE(0, 16);
  offsets.writeUInt32LE(compileArgv.offset, 20);
  offsets.writeUInt32LE(compileArgv.size, 24);
  offsets.writeUInt32LE(0, 28);

  const payload = Buffer.concat([graphBytes, offsets, TRAILER]);
  const section = Buffer.alloc(8 + payload.length);
  section.writeBigUInt64LE(BigInt(payload.length), 0);
  payload.copy(section, 8);

  const headerSize = 32;
  const commandSize = 72 + 80;
  const sectionFileOffset = headerSize + commandSize;
  const executable = Buffer.alloc(sectionFileOffset + section.length);
  executable.writeUInt32LE(0xfeedfacf, 0);
  executable.writeUInt32LE(0x0100000c, 4); // arm64
  executable.writeUInt32LE(2, 12); // MH_EXECUTE
  executable.writeUInt32LE(1, 16);
  executable.writeUInt32LE(commandSize, 20);

  const commandOffset = headerSize;
  executable.writeUInt32LE(0x19, commandOffset);
  executable.writeUInt32LE(commandSize, commandOffset + 4);
  executable.write("__BUN", commandOffset + 8, "ascii");
  executable.writeBigUInt64LE(BigInt(section.length), commandOffset + 32);
  executable.writeBigUInt64LE(BigInt(sectionFileOffset), commandOffset + 40);
  executable.writeBigUInt64LE(BigInt(section.length), commandOffset + 48);
  executable.writeUInt32LE(1, commandOffset + 64);

  const sectionHeaderOffset = commandOffset + 72;
  executable.write("__bun", sectionHeaderOffset, "ascii");
  executable.write("__BUN", sectionHeaderOffset + 16, "ascii");
  executable.writeBigUInt64LE(BigInt(section.length), sectionHeaderOffset + 40);
  executable.writeUInt32LE(sectionFileOffset, sectionHeaderOffset + 48);
  section.copy(executable, sectionFileOffset);

  return {
    executable,
    sectionFileOffset,
    commandOffset,
    sectionHeaderOffset,
    payloadSize: payload.length,
    graphByteCount: graphBytes.length,
    contents,
  };
}

const fixture = buildFixture();
const section = findBunSection(fixture.executable);
const parsed = parseModuleGraph(fixture.executable);
assert.equal(section.fileOffset, fixture.sectionFileOffset);
assert.equal(parsed.graph.moduleCount, 1);
assert.equal(parsed.modules[0].name, "/$bunfs/root/synthetic.js");
assert.equal(parsed.modules[0].contentSize, fixture.contents.size);
assert.equal(
  parsed.modules[0].contentSha256,
  createHash("sha256").update("module.exports = 42;\n").digest("hex"),
);

const offsetsFileOffset = fixture.sectionFileOffset + 8 + fixture.payloadSize - 48;
const badByteCount = Buffer.from(fixture.executable);
badByteCount.writeBigUInt64LE(BigInt(fixture.graphByteCount + 1), offsetsFileOffset);
assert.throws(() => parseModuleGraph(badByteCount), /does not match offsets start/u);

const badSectionSegment = Buffer.from(fixture.executable);
badSectionSegment[fixture.sectionHeaderOffset + 16] = 0x58;
assert.throws(() => findBunSection(badSectionSegment), /mismatched segment name/u);

const badCommandSize = Buffer.from(fixture.executable);
badCommandSize.writeUInt32LE(72, fixture.commandOffset + 4);
assert.throws(() => findBunSection(badCommandSize), /sections exceed command size/u);

assert.throws(
  () => safeOutputPath("/tmp/claude-extract", "/$bunfs/root/../escape"),
  /unsafe embedded path/u,
);
assert.throws(
  () => safeOutputPath("/tmp/claude-extract", "/$bunfs/root/manifest:evil"),
  /unsafe embedded path/u,
);

console.log("inspect-binary: synthetic Mach-O/Bun graph tests passed");
