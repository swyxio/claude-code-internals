#!/usr/bin/env node

import { mkdirSync } from "node:fs";
import { resolve } from "node:path";

import {
  artifactIdentity,
  assertSuccessfulRun,
  createProbeContext,
  describeRun,
  initializeGitProject,
  oneTextResponse,
  PROBE_SCHEMA_VERSION,
  requestBodies,
  runIsolatedClaude,
  writeJson,
  writeSanitizedReport,
} from "./common.mjs";

const outputPath = resolve(
  process.argv[2] ?? "evidence/dynamic/extensions/settings-precedence.json",
);
const context = createProbeContext("settings-precedence");

const markers = {
  user: "probe-user-model",
  project: "probe-project-model",
  local: "probe-local-model",
  explicit: "probe-explicit-model",
  flag: "probe-flag-model",
};

function sourceForModel(model) {
  return Object.entries(markers).find(([, value]) => value === model)?.[0] ?? "unrecognized";
}
async function runCase(name, args) {
  const { run, requests } = await runIsolatedClaude({
    context,
    responses: oneTextResponse(),
    args: ["--tools", "", ...args],
  });
  assertSuccessfulRun(run, name);
  const messageRequests = requestBodies(requests);
  if (messageRequests.length !== 1) {
    throw new Error(`${name}: expected one messages request, saw ${messageRequests.length}`);
  }
  return {
    name,
    selectedSource: sourceForModel(messageRequests[0].body.model),
    messagesRequestCount: messageRequests.length,
    run: describeRun(run),
  };
}

try {
  initializeGitProject(context);
  mkdirSync(resolve(context.home, ".claude"), { recursive: true, mode: 0o700 });
  mkdirSync(resolve(context.project, ".claude"), { recursive: true, mode: 0o700 });
  writeJson(resolve(context.home, ".claude/settings.json"), { model: markers.user });
  writeJson(resolve(context.project, ".claude/settings.json"), { model: markers.project });
  writeJson(resolve(context.project, ".claude/settings.local.json"), { model: markers.local });
  const explicitPath = resolve(context.root, "explicit-settings.json");
  writeJson(explicitPath, { model: markers.explicit });

  const cases = [];
  cases.push(await runCase("user-source-only", ["--setting-sources", "user"]));
  cases.push(await runCase("project-source-only", ["--setting-sources", "project"]));
  cases.push(await runCase("local-source-only", ["--setting-sources", "local"]));
  cases.push(
    await runCase("all-persisted-sources", [
      "--setting-sources",
      "user,project,local",
    ]),
  );
  cases.push(
    await runCase("explicit-settings-file", [
      "--setting-sources",
      "user,project,local",
      "--settings",
      explicitPath,
    ]),
  );
  cases.push(
    await runCase("model-flag", [
      "--setting-sources",
      "user,project,local",
      "--settings",
      explicitPath,
      "--model",
      markers.flag,
    ]),
  );

  const report = {
    schemaVersion: PROBE_SCHEMA_VERSION,
    probe: "settings-precedence",
    safety: {
      temporaryHome: true,
      temporaryGitProject: true,
      loopbackProvider: true,
      dummyCredential: true,
      telemetryDisabled: true,
      rawPromptsRetained: false,
      rawConfigurationRetained: false,
    },
    artifact: artifactIdentity(),
    fixture: {
      sources: ["user", "project", "local", "explicit", "flag"],
      discriminant: "model request field",
      markerValuesRetained: false,
    },
    cases,
    observedOrder: {
      persistedWinner: cases.find((entry) => entry.name === "all-persisted-sources")
        ?.selectedSource,
      explicitWinner: cases.find((entry) => entry.name === "explicit-settings-file")
        ?.selectedSource,
      flagWinner: cases.find((entry) => entry.name === "model-flag")?.selectedSource,
    },
    limits: [
      "This probe measures model selection only; other setting keys can use key-specific merge rules.",
      "The report records source labels, never the synthetic model marker strings or prompt bodies.",
    ],
  };
  writeSanitizedReport(outputPath, report, [context]);
  process.stdout.write(`${outputPath}\n`);
} finally {
  context.cleanup();
}
