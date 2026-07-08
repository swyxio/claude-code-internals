#!/usr/bin/env node

import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  createTextResponder,
  createToolLoopResponder,
  startFakeAnthropicServer,
} from "./fake-anthropic.mjs";
import {
  DUMMY_API_KEY,
  SYNTHETIC_SYSTEM_PROMPT,
  SYNTHETIC_USER_PROMPT,
  buildProbeEnvironment,
  commonClaudeArguments,
  createIsolatedWorkspace,
  inspectBinary,
  removeWorkspace,
  spawnIsolatedClaude,
} from "./isolation.mjs";
import {
  assertSanitized,
  diffTrees,
  sha256,
  summarizeJsonLines,
  summarizeTree,
} from "./sanitize.mjs";

const repositoryRoot = fileURLToPath(new URL("../../..", import.meta.url));
const provenance = JSON.parse(
  await readFile(path.join(repositoryRoot, "evidence/provenance.json"), "utf8"),
);

function parseArguments(argv) {
  const result = {
    binary:
      process.env.CLAUDE_BINARY ?? `${process.env.HOME}/.local/bin/claude`,
    output: path.join(
      repositoryRoot,
      "evidence/dynamic/runtime/runtime-dynamics.json",
    ),
  };
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === "--binary") result.binary = argv[++index];
    else if (argument === "--out") result.output = path.resolve(argv[++index]);
    else throw new Error(`Unknown argument: ${argument}`);
  }
  return result;
}

function summarizeProcessResult(result) {
  return {
    exitCode: result.exitCode,
    signal: result.signal,
    timedOut: result.timedOut,
    durationMs: result.durationMs,
    stdout: summarizeJsonLines(result.stdout),
    stderr: summarizeJsonLines(result.stderr),
  };
}

function runtimeAssertions({
  label,
  result,
  server,
  treeDiff,
  expectedMessageRequests,
  expectTranscript,
  expectProcessOutput,
  expectedToolSequence,
}) {
  const failures = [];
  if (result.exitCode !== 0) failures.push(`exitCode=${result.exitCode}`);
  if (result.timedOut) failures.push("process timed out");
  if (server.unexpectedRequests.length > 0)
    failures.push("unexpected loopback route");
  const messageRequests = server.requests.filter(
    (request) =>
      request.method === "POST" && request.pathname.endsWith("/v1/messages"),
  );
  if (messageRequests.length !== expectedMessageRequests) {
    failures.push(
      `message request count ${messageRequests.length} != ${expectedMessageRequests}`,
    );
  }
  if (server.requests[0]?.method !== "POST") {
    failures.push("first loopback request was not POST");
  }
  const output = summarizeJsonLines(result.stdout);
  if (!output.eventOrder.includes("result:success")) {
    failures.push("stream-json output did not end in success");
  }
  if (expectedToolSequence.length > 0) {
    const toolResults = (request) =>
      (request?.messages ?? []).flatMap((message) =>
        message.content?.kind === "blocks"
          ? message.content.blocks.filter(
              (block) => block.type === "tool_result",
            )
          : [],
      );
    const finalMessages = messageRequests.at(-1)?.messages ?? [];
    const observedTools = finalMessages.flatMap((message) =>
      message.content?.kind === "blocks"
        ? message.content.blocks
            .map((block) => block.toolName)
            .filter((name) => typeof name === "string")
        : [],
    );
    if (
      JSON.stringify(observedTools) !== JSON.stringify(expectedToolSequence)
    ) {
      failures.push(
        `tool sequence ${JSON.stringify(observedTools)} was unexpected`,
      );
    }
    const secondResults = toolResults(messageRequests[1]);
    const finalResults = toolResults(messageRequests[2]);
    if (
      secondResults.length !== 1 ||
      !secondResults[0].fields.includes("cache_control") ||
      finalResults.length !== 2 ||
      finalResults[0].fields.includes("cache_control") ||
      !finalResults[1].fields.includes("cache_control")
    ) {
      failures.push("tool-result cache boundary did not move as observed");
    }
  }
  const transcripts = treeDiff.created.filter((entry) =>
    entry.path.endsWith(".jsonl"),
  );
  if (expectTranscript !== transcripts.length > 0) {
    failures.push(`transcript expectation failed (${transcripts.length})`);
  }
  const processOutput = treeDiff.created.find((entry) =>
    entry.path.endsWith("project/process-sentinel.txt"),
  );
  if (expectProcessOutput !== Boolean(processOutput)) {
    failures.push("process sentinel expectation failed");
  }
  if (failures.length > 0) {
    throw new Error(`${label} failed: ${failures.join(", ")}`);
  }
}

async function runCase({
  label,
  binaryPath,
  sessionId,
  persist,
  tools,
  expectedMessageRequests,
}) {
  const workspace = await createIsolatedWorkspace(label);
  const responder =
    tools.length === 0
      ? createTextResponder()
      : createToolLoopResponder({
          fixturePath: workspace.fixturePath,
          processOutputPath: workspace.processOutputPath,
        });
  const server = await startFakeAnthropicServer({ responder });
  try {
    const before = await summarizeTree(workspace.root);
    const argumentsList = commonClaudeArguments({ sessionId, persist, tools });
    const result = await spawnIsolatedClaude({
      binaryPath,
      argumentsList,
      environment: buildProbeEnvironment(workspace, server.baseUrl),
      cwd: workspace.project,
    });
    const after = await summarizeTree(workspace.root);
    const treeDiff = diffTrees(before, after);
    runtimeAssertions({
      label,
      result,
      server,
      treeDiff,
      expectedMessageRequests,
      expectTranscript: persist,
      expectProcessOutput: tools.includes("Bash"),
      expectedToolSequence: tools,
    });

    const messageRequests = server.requests.filter(
      (request) =>
        request.method === "POST" && request.pathname.endsWith("/v1/messages"),
    );
    const processOutput = treeDiff.created.find((entry) =>
      entry.path.endsWith("project/process-sentinel.txt"),
    );
    const fixture = before.find((entry) =>
      entry.path.endsWith("project/synthetic-fixture.txt"),
    );
    return {
      label,
      invocation: {
        mode: "bare-safe-print",
        optionNames: argumentsList.filter((argument) =>
          argument.startsWith("--"),
        ),
        tools,
        persistenceEnabled: persist,
        syntheticPrompt: {
          bytes: Buffer.byteLength(SYNTHETIC_USER_PROMPT),
          sha256: sha256(SYNTHETIC_USER_PROMPT),
        },
        syntheticSystemPrompt: {
          bytes: Buffer.byteLength(SYNTHETIC_SYSTEM_PROMPT),
          sha256: sha256(SYNTHETIC_SYSTEM_PROMPT),
        },
        fixture: fixture
          ? { bytes: fixture.bytes, sha256: fixture.sha256, mode: fixture.mode }
          : null,
      },
      process: summarizeProcessResult(result),
      transport: {
        requestCount: server.requests.length,
        requestOrder: server.requests.map(
          (request) => `${request.method} ${request.pathname}`,
        ),
        requests: server.requests,
        unexpectedRequests: server.unexpectedRequests,
        messageRequestCount: messageRequests.length,
      },
      filesystem: {
        createdCount: treeDiff.created.length,
        modifiedCount: treeDiff.modified.length,
        deletedCount: treeDiff.deleted.length,
        changes: treeDiff,
        transcriptCount: treeDiff.created.filter((entry) =>
          entry.path.endsWith(".jsonl"),
        ).length,
        processSentinel: processOutput
          ? {
              present: true,
              bytes: processOutput.bytes,
              sha256: processOutput.sha256,
              mode: processOutput.mode,
            }
          : { present: false },
      },
    };
  } finally {
    await server.close();
    await removeWorkspace(workspace);
  }
}

async function main() {
  if (process.platform !== "darwin") {
    throw new Error(
      "This probe requires macOS sandbox-exec for loopback-only networking",
    );
  }
  const options = parseArguments(process.argv.slice(2));
  const binary = await inspectBinary(options.binary);
  if (binary.sha256 !== provenance.release.sha256) {
    throw new Error(
      "Claude binary hash does not match evidence/provenance.json",
    );
  }

  const textTurn = await runCase({
    label: "text-turn",
    binaryPath: binary.resolvedPath,
    sessionId: "00000000-0000-4000-8000-000000000001",
    persist: false,
    tools: [],
    expectedMessageRequests: 1,
  });
  const toolLoop = await runCase({
    label: "tool-loop",
    binaryPath: binary.resolvedPath,
    sessionId: "00000000-0000-4000-8000-000000000002",
    persist: true,
    tools: ["Read", "Bash"],
    expectedMessageRequests: 3,
  });

  const report = {
    schemaVersion: 1,
    probe: "runtime/runtime-dynamics",
    capturedAt: new Date().toISOString(),
    subject: {
      version: provenance.release.version,
      artifactSha256: binary.sha256,
      artifactBytes: binary.bytes,
      platform: provenance.release.platform,
    },
    isolation: {
      temporaryHomePerCase: true,
      temporaryProjectPerCase: true,
      inheritedEnvironment: false,
      dummyCredential: true,
      syntheticPromptsOnly: true,
      loopbackProvider: true,
      outboundNetworkPolicy: "sandbox-exec: deny outbound except localhost",
      nonessentialTrafficDisabled: true,
      telemetryDisabled: true,
      rawRequestBodiesRetained: false,
      rawProcessOutputRetained: false,
      rawTranscriptsRetained: false,
      temporaryDirectoriesRemoved: true,
    },
    runs: [textTurn, toolLoop],
    observations: [
      {
        id: "runtime.safe-startup-direct-post",
        basis: "observed-dynamic",
        claim:
          "Both bare-and-safe runs made POST /v1/messages their first loopback request, without the HEAD / preflight seen in the separate core bare-mode probe.",
      },
      {
        id: "runtime.synthetic-turn-stream",
        basis: "observed-dynamic",
        claim:
          "A synthetic text response was adapted into stream-json lifecycle records and a success result.",
      },
      {
        id: "runtime.tool-feedback-loop",
        basis: "observed-dynamic",
        claim:
          "One user turn executed Read then Bash across three Messages requests, feeding tool results back between requests.",
      },
      {
        id: "runtime.tool-result-cache-boundary",
        basis: "observed-dynamic",
        claim:
          "The newest tool_result carried cache_control; on the following request the older result no longer did and the newest result carried it instead.",
      },
      {
        id: "runtime.persistence-boundary",
        basis: "observed-dynamic",
        claim:
          "The persistence-enabled tool run created transcript JSONL state; the no-persistence text run did not.",
      },
      {
        id: "runtime.process-file-side-effect",
        basis: "observed-dynamic",
        claim:
          "The Bash tool created a synthetic project sentinel under an inherited OS policy that denied non-loopback outbound networking.",
      },
    ],
  };

  assertSanitized(report, [
    DUMMY_API_KEY,
    SYNTHETIC_SYSTEM_PROMPT,
    SYNTHETIC_USER_PROMPT,
    "synthetic-runtime-fixture",
    "runtime-probe-ok",
    "runtime-tool-loop-ok",
    "runtime-process-ok",
  ]);
  await mkdir(path.dirname(options.output), { recursive: true });
  await writeFile(options.output, `${JSON.stringify(report, null, 2)}\n`);
  process.stdout.write(
    `wrote sanitized runtime evidence to ${options.output}\n`,
  );
}

await main();
