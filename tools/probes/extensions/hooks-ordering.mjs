#!/usr/bin/env node

import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { textResponse, toolUseResponse } from "../lib/fake-anthropic-server.mjs";
import {
  artifactIdentity,
  assertSuccessfulRun,
  createProbeContext,
  describeRun,
  initializeGitProject,
  PROBE_SCHEMA_VERSION,
  runIsolatedClaude,
  writeJson,
  writeSanitizedReport,
} from "./common.mjs";

const outputPath = resolve(
  process.argv[2] ?? "evidence/dynamic/extensions/hooks-ordering.json",
);
const recorderPath = resolve("tools/probes/extensions/fixtures/hook-recorder.mjs");
const context = createProbeContext("hooks-ordering");

function shellQuote(value) {
  return `'${String(value).replaceAll("'", `'\\''`)}'`;
}

function recorderCommand(logPath, label, delayMs = 0) {
  return [process.execPath, recorderPath, logPath, label, String(delayMs)]
    .map(shellQuote)
    .join(" ");
}

function parseJsonLines(text, label) {
  return text
    .split("\n")
    .filter(Boolean)
    .map((line, index) => {
      try {
        return JSON.parse(line);
      } catch (error) {
        throw new Error(`${label} line ${index + 1} is not JSON: ${error.message}`);
      }
    });
}

function summarizeStream(stdout) {
  return parseJsonLines(stdout, "stream output").map((event) => ({
    type: typeof event.type === "string" ? event.type : null,
    subtype: typeof event.subtype === "string" ? event.subtype : null,
    hookEvent:
      typeof event.hook_event_name === "string"
        ? event.hook_event_name
        : typeof event.hook_event === "string"
          ? event.hook_event
          : null,
    topLevelKeys:
      event && typeof event === "object" ? Object.keys(event).sort() : [],
  }));
}

try {
  initializeGitProject(context);
  const logPath = resolve(context.root, "hook-events.ndjson");
  const settingsPath = resolve(context.root, "hook-settings.json");
  const readTarget = resolve(context.project, "probe-readable.txt");
  writeJson(readTarget, { synthetic: true });
  writeJson(settingsPath, {
    hooks: {
      UserPromptSubmit: [
        {
          hooks: [
            { type: "command", command: recorderCommand(logPath, "prompt") },
          ],
        },
      ],
      PreToolUse: [
        {
          matcher: "Read",
          hooks: [
            { type: "command", command: recorderCommand(logPath, "pre-slow", 250) },
            { type: "command", command: recorderCommand(logPath, "pre-fast") },
          ],
        },
      ],
      PostToolUse: [
        {
          matcher: "Read",
          hooks: [
            { type: "command", command: recorderCommand(logPath, "post") },
          ],
        },
      ],
      Stop: [
        {
          hooks: [{ type: "command", command: recorderCommand(logPath, "stop") }],
        },
      ],
    },
  });

  const { run, requests } = await runIsolatedClaude({
    context,
    outputFormat: "stream-json",
    responses: [
      ({ body }) =>
        toolUseResponse({
          model: body.model,
          toolName: "Read",
          input: { file_path: readTarget },
        }),
      ({ body }) => textResponse({ model: body.model, text: "SYNTHETIC_HOOK_PROBE_OK" }),
    ],
    args: [
      "--verbose",
      "--include-hook-events",
      "--setting-sources",
      "local",
      "--settings",
      settingsPath,
      "--tools",
      "Read",
      "--allowedTools",
      "Read",
      "--permission-mode",
      "dontAsk",
    ],
  });
  assertSuccessfulRun(run, "hooks-ordering");

  const hookRecords = parseJsonLines(readFileSync(logPath, "utf8"), "hook log");
  const invocationOrder = hookRecords.map((record) => `${record.label}:${record.phase}`);
  const preSlowStart = invocationOrder.indexOf("pre-slow:start");
  const preSlowEnd = invocationOrder.indexOf("pre-slow:end");
  const preFastStart = invocationOrder.indexOf("pre-fast:start");
  const preFastEnd = invocationOrder.indexOf("pre-fast:end");
  const payloads = hookRecords
    .filter((record) => record.phase === "end")
    .map((record) => ({
      label: record.label,
      payloadBytes: record.payloadBytes,
      safeNames: record.safeNames,
      payloadShape: record.payloadShape,
    }));

  const streamEvents = summarizeStream(run.stdout);
  const preToolStreamPhases = streamEvents
    .filter((event) => event.hookEvent === "PreToolUse")
    .map((event) => event.subtype);
  const report = {
    schemaVersion: PROBE_SCHEMA_VERSION,
    probe: "hooks-ordering-and-payload-shape",
    safety: {
      temporaryHome: true,
      temporaryGitProject: true,
      loopbackProvider: true,
      dummyCredential: true,
      telemetryDisabled: true,
      hookExecutable: "repository-owned fixture recorder",
      hookWritesConfinedToProbeRoot: true,
      rawHookPayloadsRetained: false,
      rawPromptsRetained: false,
    },
    artifact: artifactIdentity(),
    run: describeRun(run),
    messagesRequestCount: requests.filter((request) => request.path === "/v1/messages")
      .length,
    configuredPreToolHookOrder: ["pre-slow", "pre-fast"],
    hookInvocationOrder: invocationOrder,
    preToolRecorderIntervalsOverlap:
      preFastStart !== -1 &&
      preFastEnd !== -1 &&
      preSlowStart !== -1 &&
      preSlowEnd !== -1 &&
      preFastStart < preSlowEnd &&
      preSlowStart < preFastEnd,
    preToolStreamPhases,
    preToolConcurrentDispatch:
      preToolStreamPhases.length === 4 &&
      preToolStreamPhases[0] === "hook_started" &&
      preToolStreamPhases[1] === "hook_started" &&
      preToolStreamPhases[2] === "hook_response" &&
      preToolStreamPhases[3] === "hook_response",
    payloads,
    streamEvents,
    limits: [
      "The concurrency result describes two command hooks in one matching PreToolUse entry on this artifact only.",
      "Operating-system process start order can vary; concurrent dispatch is classified from the stream's started/response phase sequence.",
      "Payload schemas retain field names and primitive types, but no field values except known lifecycle and tool names.",
      "Absolute paths, prompt bodies, tool inputs, tool results, and raw stream events are not retained.",
    ],
  };
  writeSanitizedReport(outputPath, report, [context]);
  process.stdout.write(`${outputPath}\n`);
} finally {
  context.cleanup();
}
