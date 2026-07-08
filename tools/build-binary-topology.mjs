#!/usr/bin/env node

import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const provenancePath = path.join(root, "evidence/provenance.json");
const inventoryPath = path.join(root, "evidence/binary-inventory.json");
const outputPath = path.resolve(
  root,
  process.argv[2] ?? "evidence/binary-topology.json",
);

const provenanceBytes = readFileSync(provenancePath);
const inventoryBytes = readFileSync(inventoryPath);
const provenance = JSON.parse(provenanceBytes);
const inventory = JSON.parse(inventoryBytes);

const OFFSETS_SIZE = 32;
const TRAILER_SIZE = Buffer.byteLength("\n---- Bun! ----\n");
const MODULE_RECORD_SIZE = 52;

function invariant(condition, message) {
  if (!condition)
    throw new Error(`binary topology invariant failed: ${message}`);
}

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function range(start, size) {
  invariant(Number.isSafeInteger(start) && start >= 0, "unsafe range start");
  invariant(Number.isSafeInteger(size) && size >= 0, "unsafe range size");
  invariant(Number.isSafeInteger(start + size), "unsafe range end");
  return { start, endExclusive: start + size, size };
}

function countBy(values, select) {
  const counts = new Map();
  for (const value of values) {
    const key = select(value);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return Object.fromEntries(
    [...counts].sort(([left], [right]) => left.localeCompare(right)),
  );
}

function basenameWithoutModuleExtension(name) {
  return name.replace(/\.(?:js|node)$/u, "");
}

invariant(
  provenance.release.sha256 === inventory.binary.sha256,
  "provenance and inventory artifact hashes differ",
);
invariant(
  provenance.release.size === inventory.binary.size,
  "provenance and inventory binary sizes differ",
);
invariant(
  inventory.bunSection.size === inventory.bunSection.payloadSize + 8,
  "section does not equal size header plus payload",
);
invariant(
  inventory.graph.byteCount + OFFSETS_SIZE + TRAILER_SIZE ===
    inventory.bunSection.payloadSize,
  "graph, offsets, and trailer do not fill payload",
);
invariant(
  inventory.graph.modulesSize % MODULE_RECORD_SIZE === 0,
  "module table is not divisible by its pinned record size",
);
invariant(
  inventory.graph.modulesSize / MODULE_RECORD_SIZE === inventory.modules.length,
  "module table count differs from inventory",
);
invariant(
  inventory.modules.filter((module) => module.entry).length === 1 &&
    inventory.modules[inventory.graph.entryPointId]?.entry,
  "entrypoint metadata is inconsistent",
);

const section = range(
  inventory.bunSection.fileOffset,
  inventory.bunSection.size,
);
const payloadFileOffset = section.start + 8;
const payload = range(payloadFileOffset, inventory.bunSection.payloadSize);
const graphBytes = range(payload.start, inventory.graph.byteCount);
const offsets = range(graphBytes.endExclusive, OFFSETS_SIZE);
const trailer = range(offsets.endExclusive, TRAILER_SIZE);
invariant(
  trailer.endExclusive === section.endExclusive,
  "trailer does not end at section boundary",
);

for (const module of inventory.modules) {
  for (const [label, start, size] of [
    ["content", module.contentPayloadOffset, module.contentSize + 1],
    ["sourcemap", module.sourcemapPayloadOffset ?? 0, module.sourcemapSize],
    ["bytecode", module.bytecodePayloadOffset ?? 0, module.bytecodeSize],
    ["module info", module.moduleInfoPayloadOffset ?? 0, module.moduleInfoSize],
  ]) {
    invariant(
      start + size <= inventory.graph.byteCount,
      `${module.name} ${label} exceeds graph`,
    );
  }
}

const wrappers = inventory.modules.filter(
  (module) => !module.entry && module.loader === "js",
);
const nativeModules = inventory.modules.filter(
  (module) => module.loader === "napi",
);
const nativeByBase = new Map(
  nativeModules.map((module) => [
    basenameWithoutModuleExtension(module.name),
    module,
  ]),
);
const nativePairs = wrappers.map((wrapper) => {
  const native = nativeByBase.get(basenameWithoutModuleExtension(wrapper.name));
  invariant(native, `missing N-API partner for ${wrapper.name}`);
  return {
    boundary: path.posix.basename(basenameWithoutModuleExtension(wrapper.name)),
    javascript: {
      index: wrapper.index,
      name: wrapper.name,
      contentSize: wrapper.contentSize,
    },
    native: {
      index: native.index,
      name: native.name,
      contentSize: native.contentSize,
    },
    relationship: "same virtual basename; call shape not asserted",
  };
});
invariant(nativePairs.length === nativeModules.length, "unpaired N-API module");

const entry = inventory.modules[inventory.graph.entryPointId];
invariant(entry.bytecodeSize > 0, "entrypoint has no bytecode cache");

const topology = {
  schemaVersion: 1,
  kind: "deterministic-derived-topology",
  generatedFrom: {
    provenance: {
      path: "evidence/provenance.json",
      sha256: sha256(provenanceBytes),
    },
    inventory: {
      path: "evidence/binary-inventory.json",
      sha256: sha256(inventoryBytes),
    },
    bunStandaloneGraphSource: provenance.runtime.standaloneGraphSource,
    bunRevision: provenance.runtime.resolvedUpstreamRevision,
  },
  subject: {
    version: provenance.release.version,
    platform: provenance.release.platform,
    artifactSha256: provenance.release.sha256,
    binarySize: provenance.release.size,
  },
  constants: {
    sectionLengthHeaderSize: 8,
    offsetsRecordSize: OFFSETS_SIZE,
    trailerSize: TRAILER_SIZE,
    moduleRecordSize: MODULE_RECORD_SIZE,
    bytecodeAlignment: 128,
    bytecodePayloadTargetModulo: 120,
  },
  fileLayout: {
    binary: range(0, inventory.binary.size),
    uninterpretedPrefix: range(0, section.start),
    bunSection: section,
    payloadLengthHeader: range(section.start, 8),
    bunPayload: payload,
    graphBytes,
    offsets,
    trailer,
    uninterpretedSuffix: range(
      section.endExclusive,
      inventory.binary.size - section.endExclusive,
    ),
  },
  graph: {
    ...inventory.graph,
    coordinateSystem: "bun-payload-relative",
    moduleTable: range(
      inventory.graph.modulesOffset,
      inventory.graph.modulesSize,
    ),
    compileArgvValue: range(
      inventory.graph.compileArgvOffset,
      inventory.graph.compileArgvSize,
    ),
    compileArgvStorage: range(
      inventory.graph.compileArgvOffset,
      inventory.graph.compileArgvSize + 1,
    ),
    flagsDecoded: {
      disableDefaultEnvFiles: Boolean(inventory.graph.flags & 1),
      disableAutoloadBunfig: Boolean(inventory.graph.flags & 2),
      disableAutoloadTsconfig: Boolean(inventory.graph.flags & 4),
      disableAutoloadPackageJson: Boolean(inventory.graph.flags & 8),
    },
  },
  aggregates: {
    moduleCount: inventory.modules.length,
    contentBytes: inventory.modules.reduce(
      (sum, module) => sum + module.contentSize,
      0,
    ),
    bytecodeBytes: inventory.modules.reduce(
      (sum, module) => sum + module.bytecodeSize,
      0,
    ),
    sourcemapBytes: inventory.modules.reduce(
      (sum, module) => sum + module.sourcemapSize,
      0,
    ),
    moduleInfoBytes: inventory.modules.reduce(
      (sum, module) => sum + module.moduleInfoSize,
      0,
    ),
    byLoader: countBy(inventory.modules, (module) => module.loader),
    byEncoding: countBy(inventory.modules, (module) => module.encoding),
    byFormat: countBy(inventory.modules, (module) => module.moduleFormat),
    bySide: countBy(inventory.modules, (module) => module.side),
  },
  entrypointPair: {
    moduleIndex: entry.index,
    name: entry.name,
    content: {
      payloadRange: range(entry.contentPayloadOffset, entry.contentSize),
      fileRange: range(entry.contentFileOffset, entry.contentSize),
    },
    contentSha256: entry.contentSha256,
    bytecodeCache: {
      payloadRange: range(entry.bytecodePayloadOffset, entry.bytecodeSize),
      fileRange: range(entry.bytecodeFileOffset, entry.bytecodeSize),
    },
    bytecodeOriginPath: entry.bytecodeOriginPath,
    originMatchesModuleName: entry.bytecodeOriginPath === entry.name,
    observedPayloadModulo128: entry.bytecodePayloadOffset % 128,
    observedFileModulo128: entry.bytecodeFileOffset % 128,
  },
  modules: inventory.modules.map((module) => ({
    index: module.index,
    entry: module.entry,
    name: module.name,
    encoding: module.encoding,
    loader: module.loader,
    moduleFormat: module.moduleFormat,
    side: module.side,
    content: {
      payloadOffset: module.contentPayloadOffset,
      fileOffset: module.contentFileOffset,
      size: module.contentSize,
      sha256: module.contentSha256,
    },
    sourcemapSize: module.sourcemapSize,
    moduleInfoSize: module.moduleInfoSize,
    bytecodeCache:
      module.bytecodeSize > 0
        ? {
            payloadOffset: module.bytecodePayloadOffset,
            fileOffset: module.bytecodeFileOffset,
            size: module.bytecodeSize,
            originPath: module.bytecodeOriginPath,
          }
        : null,
  })),
  nativePairs,
  securityEnvelope: {
    hardenedRuntime: provenance.signature.hardenedRuntime,
    entitlements: [...provenance.signature.entitlements].sort(),
  },
};

writeFileSync(outputPath, `${JSON.stringify(topology, null, 2)}\n`);
process.stdout.write(`wrote deterministic binary topology to ${outputPath}\n`);
