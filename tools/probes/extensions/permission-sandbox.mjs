#!/usr/bin/env node

import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

import { textResponse, toolUseResponse } from "../lib/fake-anthropic-server.mjs";
import {
  artifactIdentity,
  assertSuccessfulRun,
  createProbeContext,
  describeRun,
  initializeGitProject,
  PROBE_SCHEMA_VERSION,
  requestBodies,
  runIsolatedClaude,
  sha256,
  writeJson,
  writeSanitizedReport,
} from "./common.mjs";

const outputPath = resolve(
  process.argv[2] ?? "evidence/dynamic/extensions/permission-sandbox.json",
);
const contexts = [];

function toolResultSummary(body) {
  for (const message of body?.messages ?? []) {
    const blocks = Array.isArray(message?.content) ? message.content : [];
    for (const block of blocks) {
      if (block?.type !== "tool_result") continue;
      return {
        topLevelKeys: Object.keys(block).sort(),
        isError: block.is_error ?? null,
        contentType: Array.isArray(block.content) ? "array" : typeof block.content,
      };
    }
  }
  return null;
}

async function runBashCase({
  name,
  command,
  args = [],
  settings,
  enforceLoopbackNetwork = true,
}) {
  const context = createProbeContext(`security-${name}`);
  contexts.push(context);
  initializeGitProject(context);
  const markerPath = resolve(context.project, "permission-marker");
  const settingsPath = resolve(context.root, "settings.json");
  if (settings) writeJson(settingsPath, settings);
  let followupToolResult = null;
  const { run, requests } = await runIsolatedClaude({
    context,
    responses: [
      ({ body }) =>
        toolUseResponse({
          model: body.model,
          toolName: "Bash",
          input: { command: command(context, markerPath) },
        }),
      ({ body }) => {
        followupToolResult = toolResultSummary(body);
        return textResponse({ model: body.model, text: "SYNTHETIC_SECURITY_PROBE_OK" });
      },
    ],
    args: [
      "--tools",
      "Bash",
      "--permission-mode",
      "dontAsk",
      ...(settings ? ["--setting-sources", "local", "--settings", settingsPath] : []),
      ...args,
    ],
    enforceLoopbackNetwork,
  });
  assertSuccessfulRun(run, name);
  const messageRequests = requestBodies(requests);
  const rawCommand = command(context, markerPath);
  const normalizedCommand = rawCommand.replaceAll(resolve(context.root), "$PROBE_ROOT");
  return {
    context,
    result: {
      name,
      run: describeRun(run),
      messagesRequestCount: messageRequests.length,
      command: {
        normalizedBytes: Buffer.byteLength(normalizedCommand),
        normalizedSha256: sha256(normalizedCommand),
        rawRetained: false,
      },
      toolResult: followupToolResult,
      markerCreated: existsSync(markerPath),
      markerSha256: existsSync(markerPath) ? sha256(readFileSync(markerPath)) : null,
    },
  };
}

try {
  const writeMarker = (_context, markerPath) =>
    `printf %s SYNTHETIC_PERMISSION_OK > '${markerPath}'`;

  const denied = await runBashCase({
    name: "dont-ask-without-allow-rule",
    command: writeMarker,
  });
  const allowed = await runBashCase({
    name: "dont-ask-with-cli-allow-rule",
    command: writeMarker,
    args: ["--allowedTools", "Bash"],
  });
  const sandboxed = await runBashCase({
    name: "sandbox-fail-closed",
    command: (context) =>
      [
        "if [ -n \"$CLAUDE_CODE_SANDBOXED\" ]; then printf %s sandboxed > sandbox-env-marker; fi",
        "printf %s inside > sandbox-inside-marker",
        `printf %s outside > '${resolve(context.root, "sandbox-outside-marker")}'`,
      ].join("; "),
    args: ["--allowedTools", "Bash"],
    // Do not wrap the product sandbox in a second Seatbelt profile: that
    // changes availability and confounds the fail-closed behavior under test.
    enforceLoopbackNetwork: false,
    settings: {
      sandbox: {
        enabled: true,
        failIfUnavailable: true,
        autoAllowBashIfSandboxed: true,
        allowUnsandboxedCommands: false,
      },
    },
  });

  const {
    markerCreated: _unusedSandboxMarker,
    markerSha256: _unusedSandboxMarkerHash,
    ...sandboxResult
  } = sandboxed.result;
  const report = {
    schemaVersion: PROBE_SCHEMA_VERSION,
    probe: "permission-and-sandbox-behavior",
    safety: {
      temporaryHomes: true,
      temporaryGitProjects: true,
      loopbackProvider: true,
      dummyCredential: true,
      telemetryDisabled: true,
      scriptedBashOnly: true,
      writesConfinedToProbeRoots: true,
      externalNetworkIntentionallyUsed: false,
      outerLoopbackPolicyAppliedToPermissionCases: true,
      outerLoopbackPolicyAppliedToNestedSandboxCase: false,
      rawCommandsRetained: false,
      rawToolResultsRetained: false,
      rawPromptsRetained: false,
    },
    artifact: artifactIdentity(),
    permissionCases: [denied.result, allowed.result],
    sandboxCase: {
      ...sandboxResult,
      sandboxSettings: {
        enabled: true,
        failIfUnavailable: true,
        autoAllowBashIfSandboxed: true,
        allowUnsandboxedCommands: false,
      },
      sandboxEnvironmentObserved: existsSync(
        resolve(sandboxed.context.project, "sandbox-env-marker"),
      ),
      cwdWriteCreated: existsSync(
        resolve(sandboxed.context.project, "sandbox-inside-marker"),
      ),
      parentWriteCreated: existsSync(
        resolve(sandboxed.context.root, "sandbox-outside-marker"),
      ),
    },
    limits: [
      "The permission probe compares dontAsk with and without one explicit CLI allow rule for a synthetic Bash command.",
      "The sandbox probe checks one macOS fail-closed command and two temporary write locations; it is not an escape test or a complete policy audit.",
      "A marker proves execution reached that write; absence can result from permission denial, sandbox denial, or command failure and is interpreted with the tool-result shape.",
    ],
  };
  writeSanitizedReport(outputPath, report, contexts);
  process.stdout.write(`${outputPath}\n`);
} finally {
  for (const context of contexts) context.cleanup();
}
