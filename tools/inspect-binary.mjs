#!/usr/bin/env node

/**
 * Reproducible, read-only inspection of a Bun-compiled Claude Code executable.
 *
 * This implements the serialized module layout documented in Bun's MIT-licensed
 * StandaloneModuleGraph implementation. It intentionally extracts into an
 * ignored directory by default: the repository records hashes, offsets, short
 * anchors, and an independently authored reconstruction, not Anthropic's
 * complete bundled source.
 *
 * Version-matched format source (Bun 1.3.14):
 * https://github.com/oven-sh/bun/blob/2a41ca974b7302952252a20eddbb3b5c3f2dee9b/src/standalone_graph/StandaloneModuleGraph.zig
 * The current Rust port is a useful successor reference, but not this binary's
 * versioned implementation.
 */

import { createHash } from "node:crypto";
import {
  closeSync,
  constants,
  existsSync,
  lstatSync,
  mkdirSync,
  openSync,
  readFileSync,
  readdirSync,
  realpathSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { dirname, join, relative, resolve, sep } from "node:path";

const TRAILER = Buffer.from("\n---- Bun! ----\n");
const OFFSETS_SIZE = 32;
const MODULE_RECORD_SIZE = 52;

const LOADERS = [
  "jsx",
  "js",
  "ts",
  "tsx",
  "css",
  "file",
  "json",
  "jsonc",
  "toml",
  "wasm",
  "napi",
  "base64",
  "dataurl",
  "text",
  "bunsh",
  "sqlite",
  "sqlite_embedded",
  "html",
  "yaml",
  "json5",
  "md",
];

const ENCODINGS = ["binary", "latin1", "utf8"];
const MODULE_FORMATS = ["none", "esm", "cjs"];
const SIDES = ["server", "client"];

function fail(message) {
  throw new Error(message);
}

function checkedSlice(buffer, offset, size, label) {
  if (!Number.isSafeInteger(offset) || !Number.isSafeInteger(size)) {
    fail(`${label}: offset and size must be safe integers`);
  }
  if (offset < 0 || size < 0 || offset + size > buffer.length) {
    fail(`${label}: out of bounds (offset=${offset}, size=${size}, total=${buffer.length})`);
  }
  return buffer.subarray(offset, offset + size);
}

function readU64(buffer, offset, label) {
  const value = buffer.readBigUInt64LE(offset);
  if (value > BigInt(Number.MAX_SAFE_INTEGER)) fail(`${label}: too large`);
  return Number(value);
}

function readName(buffer, offset, length) {
  return buffer
    .subarray(offset, offset + length)
    .toString("ascii")
    .replace(/\0+$/u, "");
}

/** Locate __BUN,__bun in a thin, little-endian, 64-bit Mach-O executable. */
export function findBunSection(executable) {
  if (executable.length < 32 || executable.readUInt32LE(0) !== 0xfeedfacf) {
    fail("expected a thin little-endian 64-bit Mach-O executable");
  }

  const commandCount = executable.readUInt32LE(16);
  const commandsSize = executable.readUInt32LE(20);
  let commandOffset = 32;
  const commandsEnd = 32 + commandsSize;
  checkedSlice(executable, 32, commandsSize, "Mach-O load command table");
  const matches = [];

  for (let commandIndex = 0; commandIndex < commandCount; commandIndex += 1) {
    if (commandOffset + 8 > commandsEnd) {
      fail(`load command ${commandIndex}: header exceeds declared command table`);
    }
    checkedSlice(executable, commandOffset, 8, `load command ${commandIndex}`);
    const command = executable.readUInt32LE(commandOffset);
    const commandSize = executable.readUInt32LE(commandOffset + 4);
    if (commandSize < 8) fail(`load command ${commandIndex}: invalid size ${commandSize}`);
    if (commandOffset + commandSize > commandsEnd) {
      fail(`load command ${commandIndex}: exceeds declared command table`);
    }
    checkedSlice(executable, commandOffset, commandSize, `load command ${commandIndex}`);

    if (command === 0x19) {
      if (commandSize < 72) fail(`load command ${commandIndex}: LC_SEGMENT_64 is too small`);
      const sectionCount = executable.readUInt32LE(commandOffset + 64);
      if (72 + sectionCount * 80 > commandSize) {
        fail(`load command ${commandIndex}: sections exceed command size`);
      }
      if (readName(executable, commandOffset + 8, 16) !== "__BUN") {
        commandOffset += commandSize;
        continue;
      }
      for (let sectionIndex = 0; sectionIndex < sectionCount; sectionIndex += 1) {
        const sectionOffset = commandOffset + 72 + sectionIndex * 80;
        if (readName(executable, sectionOffset, 16) !== "__bun") continue;
        if (readName(executable, sectionOffset + 16, 16) !== "__BUN") {
          fail(`section ${sectionIndex}: __bun has mismatched segment name`);
        }
        matches.push({
          fileOffset: executable.readUInt32LE(sectionOffset + 48),
          size: readU64(executable, sectionOffset + 40, "__bun size"),
        });
      }
    }
    commandOffset += commandSize;
  }

  if (commandOffset !== commandsEnd) {
    fail(`load commands consumed ${commandOffset - 32} bytes, expected ${commandsSize}`);
  }

  if (matches.length !== 1) fail(`expected exactly one __BUN,__bun section; found ${matches.length}`);
  const match = matches[0];
  return {
    ...match,
    bytes: checkedSlice(executable, match.fileOffset, match.size, "__BUN,__bun"),
  };
}

export function parseModuleGraph(executable) {
  const section = findBunSection(executable);
  const payloadSize = readU64(section.bytes, 0, "payload size");
  const payload = checkedSlice(section.bytes, 8, payloadSize, "payload");
  if (payload.length < OFFSETS_SIZE + TRAILER.length) {
    fail("Bun payload is too small for offsets and trailer");
  }
  if (!payload.subarray(payload.length - TRAILER.length).equals(TRAILER)) {
    fail("Bun payload trailer mismatch");
  }

  const offsetsStart = payload.length - TRAILER.length - OFFSETS_SIZE;
  const graph = {
    byteCount: readU64(payload, offsetsStart, "graph byte count"),
    modulesOffset: payload.readUInt32LE(offsetsStart + 8),
    modulesSize: payload.readUInt32LE(offsetsStart + 12),
    entryPointId: payload.readUInt32LE(offsetsStart + 16),
    compileArgvOffset: payload.readUInt32LE(offsetsStart + 20),
    compileArgvSize: payload.readUInt32LE(offsetsStart + 24),
    flags: payload.readUInt32LE(offsetsStart + 28),
  };

  if (graph.byteCount !== offsetsStart) {
    fail(`graph byte count ${graph.byteCount} does not match offsets start ${offsetsStart}`);
  }
  const checkedGraphSlice = (offset, size, label) => {
    if (!Number.isSafeInteger(offset) || !Number.isSafeInteger(size)) {
      fail(`${label}: offset and size must be safe integers`);
    }
    if (offset < 0 || size < 0 || offset + size > graph.byteCount) {
      fail(
        `${label}: outside graph bytes (offset=${offset}, size=${size}, graph=${graph.byteCount})`,
      );
    }
    return payload.subarray(offset, offset + size);
  };
  const checkedGraphZSpan = (offset, size, label) => {
    const bytesWithTerminator = checkedGraphSlice(offset, size + 1, label);
    if (bytesWithTerminator.at(-1) !== 0) fail(`${label}: missing NUL terminator`);
    return bytesWithTerminator.subarray(0, -1);
  };

  if (graph.modulesSize % MODULE_RECORD_SIZE !== 0) {
    fail(`module table size ${graph.modulesSize} is not divisible by ${MODULE_RECORD_SIZE}`);
  }
  const moduleCount = graph.modulesSize / MODULE_RECORD_SIZE;
  if (graph.entryPointId >= moduleCount) fail("entry point is outside module table");
  const table = checkedGraphSlice(graph.modulesOffset, graph.modulesSize, "module table");
  checkedGraphZSpan(graph.compileArgvOffset, graph.compileArgvSize, "compile argv");
  const modules = [];

  for (let index = 0; index < moduleCount; index += 1) {
    const record = table.subarray(index * MODULE_RECORD_SIZE, (index + 1) * MODULE_RECORD_SIZE);
    const pointer = (pairIndex) => ({
      offset: record.readUInt32LE(pairIndex * 8),
      size: record.readUInt32LE(pairIndex * 8 + 4),
    });
    const namePointer = pointer(0);
    const contentPointer = pointer(1);
    const sourcemapPointer = pointer(2);
    const bytecodePointer = pointer(3);
    const moduleInfoPointer = pointer(4);
    const originPointer = pointer(5);
    const cString = (value, label) => {
      if (value.size === 0) fail(`${label}: empty C string`);
      return checkedGraphZSpan(value.offset, value.size, label).toString("utf8");
    };

    const contentBytes = checkedGraphZSpan(
      contentPointer.offset,
      contentPointer.size,
      `module ${index} content`,
    );
    checkedGraphSlice(
      sourcemapPointer.offset,
      sourcemapPointer.size,
      `module ${index} sourcemap`,
    );
    checkedGraphSlice(
      bytecodePointer.offset,
      bytecodePointer.size,
      `module ${index} bytecode`,
    );
    checkedGraphSlice(
      moduleInfoPointer.offset,
      moduleInfoPointer.size,
      `module ${index} module info`,
    );
    if (originPointer.size > 0) {
      checkedGraphSlice(originPointer.offset, originPointer.size, `module ${index} bytecode origin`);
    }
    const module = {
      index,
      entry: index === graph.entryPointId,
      name: cString(namePointer, `module ${index} name`),
      contentPayloadOffset: contentPointer.offset,
      contentFileOffset: section.fileOffset + 8 + contentPointer.offset,
      contentSize: contentPointer.size,
      contentSha256: createHash("sha256")
        .update(contentBytes)
        .digest("hex"),
      sourcemapPayloadOffset: sourcemapPointer.size ? sourcemapPointer.offset : null,
      sourcemapSize: sourcemapPointer.size,
      bytecodePayloadOffset: bytecodePointer.size ? bytecodePointer.offset : null,
      bytecodeFileOffset: bytecodePointer.size ? section.fileOffset + 8 + bytecodePointer.offset : null,
      bytecodeSize: bytecodePointer.size,
      moduleInfoPayloadOffset: moduleInfoPointer.size ? moduleInfoPointer.offset : null,
      moduleInfoSize: moduleInfoPointer.size,
      bytecodeOriginPath: originPointer.size ? cString(originPointer, `module ${index} origin`) : "",
      encoding: ENCODINGS[record.readUInt8(48)] ?? `unknown(${record.readUInt8(48)})`,
      loader: LOADERS[record.readUInt8(49)] ?? `unknown(${record.readUInt8(49)})`,
      moduleFormat: MODULE_FORMATS[record.readUInt8(50)] ?? `unknown(${record.readUInt8(50)})`,
      side: SIDES[record.readUInt8(51)] ?? `unknown(${record.readUInt8(51)})`,
    };
    modules.push(module);
  }

  return {
    section,
    payload,
    payloadSize,
    graph: { ...graph, moduleCount },
    modules,
  };
}

function sha256(buffer) {
  return createHash("sha256").update(buffer).digest("hex");
}

function portablePath(path) {
  const absolute = resolve(path);
  if (!process.env.HOME) return absolute;
  const home = resolve(process.env.HOME);
  if (absolute === home) return "$HOME";
  if (absolute.startsWith(`${home}${sep}`)) {
    return `$HOME/${relative(home, absolute).split(sep).join("/")}`;
  }
  return absolute;
}

function inventory(binaryPath) {
  const resolvedPath = realpathSync(binaryPath);
  const executable = readFileSync(resolvedPath);
  const parsed = parseModuleGraph(executable);
  return {
    schemaVersion: 1,
    binary: {
      requestedPath: portablePath(binaryPath),
      resolvedPath: portablePath(resolvedPath),
      size: statSync(resolvedPath).size,
      sha256: sha256(executable),
    },
    bunSection: {
      segment: "__BUN",
      section: "__bun",
      fileOffset: parsed.section.fileOffset,
      size: parsed.section.size,
      payloadSize: parsed.payloadSize,
      payloadSha256: sha256(parsed.payload),
    },
    graph: parsed.graph,
    modules: parsed.modules,
  };
}

export function safeOutputPath(outputRoot, virtualPath) {
  const parts = virtualPath.replaceAll("\\", "/").split("/");
  while (parts[0] === "") parts.shift();
  if (parts[0] === "$bunfs") {
    parts.shift();
    if (parts[0] === "root") parts.shift();
  }
  if (
    parts.length === 0 ||
    parts.some(
      (part) =>
        part === "" ||
        part === "." ||
        part === ".." ||
        part.includes("\0") ||
        part.includes(":"),
    )
  ) {
    fail(`unsafe embedded path: ${virtualPath}`);
  }
  const candidate = resolve(outputRoot, ...parts);
  const root = resolve(outputRoot);
  if (candidate === root || !candidate.startsWith(`${root}${sep}`)) {
    fail(`refusing to extract outside output root: ${virtualPath}`);
  }
  return candidate;
}

function extract(binaryPath, outputRoot, includeNative) {
  const executable = readFileSync(realpathSync(binaryPath));
  const parsed = parseModuleGraph(executable);
  const requestedOutput = resolve(outputRoot);
  if (existsSync(requestedOutput)) {
    const outputStat = lstatSync(requestedOutput);
    if (outputStat.isSymbolicLink() || !outputStat.isDirectory()) {
      fail(`output root must be a real directory: ${requestedOutput}`);
    }
    if (readdirSync(requestedOutput).length > 0) {
      fail(`output root must be empty: ${requestedOutput}`);
    }
  } else {
    mkdirSync(requestedOutput, { recursive: true, mode: 0o700 });
  }
  const realOutput = realpathSync(requestedOutput);
  const extracted = [];
  const destinations = new Set();
  for (const module of parsed.modules) {
    if (module.loader === "napi" && !includeNative) continue;
    const destination = safeOutputPath(realOutput, module.name);
    const destinationKey = relative(realOutput, destination).normalize("NFC").toLowerCase();
    if (destinationKey === "manifest.json") {
      fail(`embedded path is reserved for the extraction manifest: ${module.name}`);
    }
    if (destinations.has(destinationKey)) {
      fail(`embedded paths collide at extraction destination: ${module.name}`);
    }
    destinations.add(destinationKey);
    const destinationDirectory = dirname(destination);
    mkdirSync(destinationDirectory, { recursive: true, mode: 0o700 });
    const realDestinationDirectory = realpathSync(destinationDirectory);
    if (
      realDestinationDirectory !== realOutput &&
      !realDestinationDirectory.startsWith(`${realOutput}${sep}`)
    ) {
      fail(`destination directory escaped output root: ${module.name}`);
    }
    const bytes = parsed.payload.subarray(
      module.contentPayloadOffset,
      module.contentPayloadOffset + module.contentSize,
    );
    const descriptor = openSync(
      destination,
      constants.O_WRONLY |
        constants.O_CREAT |
        constants.O_EXCL |
        (constants.O_NOFOLLOW ?? 0),
      0o600,
    );
    try {
      writeFileSync(descriptor, bytes);
    } finally {
      closeSync(descriptor);
    }
    extracted.push({
      name: module.name,
      path: relative(process.cwd(), destination),
      size: bytes.length,
      sha256: sha256(bytes),
    });
  }
  writeFileSync(join(realOutput, "manifest.json"), `${JSON.stringify(extracted, null, 2)}\n`, {
    encoding: "utf8",
    flag: "wx",
    mode: 0o600,
  });
  return extracted;
}

function collectAnchors(binaryPath, specPath) {
  const executable = readFileSync(realpathSync(binaryPath));
  const parsed = parseModuleGraph(executable);
  const entry = parsed.modules.find((module) => module.entry);
  if (!entry) fail("entry module not found");
  const source = parsed.payload.subarray(
    entry.contentPayloadOffset,
    entry.contentPayloadOffset + entry.contentSize,
  );
  const spec = JSON.parse(readFileSync(specPath, "utf8"));

  const anchors = spec.anchors.map((requested) => {
    const needle = Buffer.from(requested.needle, "utf8");
    if (needle.length < 3 || needle.length > 128) {
      fail(`anchor ${requested.id}: needle must be between 3 and 128 UTF-8 bytes`);
    }
    const occurrences = [];
    let from = 0;
    while (from <= source.length - needle.length) {
      const index = source.indexOf(needle, from);
      if (index === -1) break;
      occurrences.push({
        moduleOffset: index,
        moduleOffsetHex: `0x${index.toString(16)}`,
        binaryFileOffset: entry.contentFileOffset + index,
        binaryFileOffsetHex: `0x${(entry.contentFileOffset + index).toString(16)}`,
      });
      from = index + Math.max(1, needle.length);
    }
    return {
      id: requested.id,
      subsystem: requested.subsystem,
      claim: requested.claim,
      needle: requested.needle,
      occurrenceCount: occurrences.length,
      occurrences,
    };
  });

  return {
    schemaVersion: 1,
    binarySha256: sha256(executable),
    entryModule: entry.name,
    entryContentSha256: entry.contentSha256,
    anchors,
  };
}

function valueAfter(args, flag, fallback) {
  const index = args.indexOf(flag);
  return index === -1 ? fallback : args[index + 1];
}

function usage() {
  console.error(`Usage:
  node tools/inspect-binary.mjs inventory [BINARY] [--out FILE]
  node tools/inspect-binary.mjs extract [BINARY] [--out DIR] [--include-native]
  node tools/inspect-binary.mjs anchors [BINARY] [--spec FILE] [--out FILE]

Defaults:
  BINARY  ~/.local/bin/claude
  extract output  .work/extracted
  anchor spec     evidence/anchor-spec.json`);
}

function defaultBinary() {
  return resolve(process.env.HOME ?? "~", ".local/bin/claude");
}

function writeJsonOrStdout(value, outputPath) {
  const json = `${JSON.stringify(value, null, 2)}\n`;
  if (outputPath) {
    mkdirSync(dirname(outputPath), { recursive: true });
    writeFileSync(outputPath, json);
  } else {
    process.stdout.write(json);
  }
}

function main(args) {
  const [command, possibleBinary] = args;
  if (!command || command === "-h" || command === "--help") {
    usage();
    return command ? 0 : 1;
  }
  const binaryPath = possibleBinary && !possibleBinary.startsWith("-") ? possibleBinary : defaultBinary();

  if (command === "inventory") {
    writeJsonOrStdout(inventory(binaryPath), valueAfter(args, "--out"));
    return 0;
  }
  if (command === "extract") {
    const outputRoot = valueAfter(args, "--out", resolve(".work/extracted"));
    const result = extract(binaryPath, outputRoot, args.includes("--include-native"));
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
    return 0;
  }
  if (command === "anchors") {
    const specPath = valueAfter(args, "--spec", resolve("evidence/anchor-spec.json"));
    writeJsonOrStdout(collectAnchors(binaryPath, specPath), valueAfter(args, "--out"));
    return 0;
  }
  usage();
  fail(`unknown command: ${command}`);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  try {
    process.exitCode = main(process.argv.slice(2));
  } catch (error) {
    console.error(`inspect-binary: ${error.message}`);
    process.exitCode = 1;
  }
}
