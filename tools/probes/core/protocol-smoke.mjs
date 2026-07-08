#!/usr/bin/env node

import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

import { startFakeAnthropicServer, textResponse } from "../lib/fake-anthropic-server.mjs";
import {
  createProbeContext,
  LOOPBACK_ONLY_SANDBOX_PROFILE,
  probeEnvironment,
  resolveClaudeBinary,
  runClaude,
  snapshotFiles,
} from "../lib/probe-runner.mjs";
import { sha256, summarizeJsonShape } from "../lib/sanitize-request.mjs";

const root = resolve(new URL("../../..", import.meta.url).pathname);
const provenance = JSON.parse(readFileSync(resolve(root, "evidence/provenance.json"), "utf8"));
const outputPath = resolve(root, process.argv[2] ?? "evidence/dynamic/core/protocol-smoke.json");
const model = "claude-sonnet-4-5-20250929";
const prompt = "Return exactly PROBE_OK.";

function digestText(text) {
  return { bytes: Buffer.byteLength(text), sha256: sha256(text) };
}

function summarizeOutput(stdout) {
  const lines = stdout.split("\n").filter(Boolean);
  return lines.map((line) => {
    try {
      const value = JSON.parse(line);
      const summary = {
        type: value.type ?? null,
        subtype: value.subtype ?? null,
        keys: Object.keys(value).sort(),
      };
      if (value.event && typeof value.event === "object") {
        summary.event = {
          type: value.event.type ?? null,
          deltaType: value.event.delta?.type ?? null,
          contentBlockType: value.event.content_block?.type ?? null,
        };
      }
      if (typeof value.result === "string") summary.result = digestText(value.result);
      if (typeof value.model === "string") summary.model = value.model;
      if (Array.isArray(value.tools)) summary.tools = value.tools.filter((tool) => typeof tool === "string");
      if (value.permissionMode !== undefined) summary.permissionMode = value.permissionMode;
      if (value.session_id !== undefined) summary.sessionIdPresent = true;
      return summary;
    } catch {
      return { type: "non-json", line: digestText(line) };
    }
  });
}

const context = createProbeContext("protocol-smoke");
const server = await startFakeAnthropicServer({
  responses: [textResponse({ model, text: "PROBE_OK" })],
});

try {
  const binary = resolveClaudeBinary();
  const before = snapshotFiles(context);
  const args = [
    "--bare",
    "--print",
    prompt,
    "--model",
    model,
    "--output-format",
    "stream-json",
    "--verbose",
    "--include-partial-messages",
    "--no-session-persistence",
    "--tools",
    "",
    "--permission-mode",
    "dontAsk",
  ];
  const result = await runClaude({
    binary,
    args,
    cwd: context.project,
    env: probeEnvironment(context, {
      ANTHROPIC_API_KEY: "probe-dummy-key",
      ANTHROPIC_BASE_URL: server.baseUrl,
      NO_PROXY: "127.0.0.1,localhost",
    }),
    sandboxProfile: LOOPBACK_ONLY_SANDBOX_PROFILE,
  });
  const after = snapshotFiles(context);
  if (result.code !== 0) {
    throw new Error(
      `Claude probe exited ${result.code ?? result.signal}: stderr ${JSON.stringify(digestText(result.stderr))}`,
    );
  }
  if (server.requests.length === 0) throw new Error("Claude probe made no loopback API request");

  const report = {
    schemaVersion: 1,
    probe: "core/protocol-smoke",
    capturedAt: new Date().toISOString(),
    subject: {
      version: provenance.release.version,
      artifactSha256: createHash("sha256").update(readFileSync(binary)).digest("hex"),
      platform: provenance.release.platform,
    },
    isolation: {
      temporaryHome: true,
      temporaryProject: true,
      loopbackProvider: true,
      outboundNetworkDeniedExceptLoopback: true,
      dummyCredential: true,
      nonessentialTrafficDisabled: true,
      telemetryDisabled: true,
      sessionPersistenceDisabled: true,
      rawPromptsRetained: false,
      rawCredentialsRetained: false,
    },
    invocation: {
      executable: "$HOME/.local/bin/claude",
      mode: "bare-print",
      optionNames: args.filter((argument) => argument.startsWith("-")),
      prompt: digestText(prompt),
      model,
    },
    result: {
      exitCode: result.code,
      signal: result.signal,
      stdout: digestText(result.stdout),
      stderr: digestText(result.stderr),
      truncated: result.truncated,
      stream: summarizeOutput(result.stdout),
    },
    transport: {
      requestCount: server.requests.length,
      requests: server.requests,
    },
    filesystem: {
      before,
      after,
      shape: summarizeJsonShape(after),
    },
  };

  mkdirSync(dirname(outputPath), { recursive: true });
  writeFileSync(outputPath, `${JSON.stringify(report, null, 2)}\n`);
  console.log(`wrote sanitized dynamic evidence to ${outputPath}`);
} finally {
  await server.close();
  context.cleanup();
}
