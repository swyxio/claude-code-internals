import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
  mkdirSync,
  readFileSync,
  realpathSync,
  writeFileSync,
} from "node:fs";
import { dirname, resolve } from "node:path";

import { startFakeAnthropicServer, textResponse } from "../lib/fake-anthropic-server.mjs";
import {
  createProbeContext,
  LOOPBACK_ONLY_SANDBOX_PROFILE,
  probeEnvironment,
  resolveClaudeBinary,
  runClaude,
} from "../lib/probe-runner.mjs";

export { createProbeContext } from "../lib/probe-runner.mjs";

export const PROBE_SCHEMA_VERSION = 1;
export const DUMMY_API_KEY = "probe-dummy-key-never-valid";
export const SYNTHETIC_SYSTEM_PROMPT = "SYNTHETIC_EXTENSION_PROBE_SYSTEM";
export const SYNTHETIC_USER_PROMPT = "SYNTHETIC_EXTENSION_PROBE_INPUT";

export function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

export function writeJson(path, value) {
  mkdirSync(dirname(path), { recursive: true, mode: 0o700 });
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`, {
    encoding: "utf8",
    mode: 0o600,
  });
}

export function initializeGitProject(context) {
  execFileSync("git", ["init", "--quiet"], {
    cwd: context.project,
    env: probeEnvironment(context),
    stdio: "ignore",
  });
}

export function artifactIdentity(binary = resolveClaudeBinary()) {
  const bytes = readFileSync(binary);
  const version = execFileSync(binary, ["--version"], {
    encoding: "utf8",
    env: {
      PATH: process.env.PATH ?? "",
      HOME: process.env.HOME ?? "",
      CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC: "1",
      DISABLE_TELEMETRY: "1",
    },
  })
    .trim()
    .split(/\s+/u)[0];
  return {
    version,
    sha256: sha256(bytes),
    size: bytes.length,
    platform: `${process.platform}-${process.arch}`,
  };
}

export function requestBodies(requests) {
  return requests.filter((request) => request.path === "/v1/messages");
}

export function describeRun(run) {
  return {
    exitCode: run.code,
    signal: run.signal,
    stdoutPresent: run.stdoutTotalBytes > 0,
    stderrPresent: run.stderrTotalBytes > 0,
    outputTruncated: run.truncated,
  };
}

export function assertSuccessfulRun(run, label) {
  if (run.code !== 0 || run.signal || run.truncated) {
    if (process.env.PROBE_DEBUG === "1") {
      process.stderr.write(run.stderr);
    }
    throw new Error(
      `${label} failed (exit=${run.code}, signal=${run.signal}, stdoutBytes=${run.stdoutTotalBytes}, stderrBytes=${run.stderrTotalBytes})`,
    );
  }
}

export async function runIsolatedClaude({
  context,
  responses,
  args = [],
  environment = {},
  outputFormat = "json",
  systemPrompt = SYNTHETIC_SYSTEM_PROMPT,
  userPrompt = SYNTHETIC_USER_PROMPT,
  timeoutMs = 30_000,
  enforceLoopbackNetwork = true,
}) {
  const server = await startFakeAnthropicServer({ responses });
  try {
    const run = await runClaude({
      binary: resolveClaudeBinary(),
      cwd: context.project,
      env: probeEnvironment(context, {
        ANTHROPIC_API_KEY: DUMMY_API_KEY,
        ANTHROPIC_BASE_URL: server.baseUrl,
        ...environment,
      }),
      timeoutMs,
      sandboxProfile: enforceLoopbackNetwork ? LOOPBACK_ONLY_SANDBOX_PROFILE : undefined,
      args: [
        "--print",
        "--output-format",
        outputFormat,
        "--no-session-persistence",
        ...(systemPrompt === null ? [] : ["--system-prompt", systemPrompt]),
        ...args,
        "--",
        userPrompt,
      ],
    });
    return { run, requests: server.requests };
  } finally {
    await server.close();
  }
}

export function oneTextResponse() {
  return [
    ({ body }) =>
      textResponse({
        model: typeof body?.model === "string" ? body.model : "probe-model",
        text: "SYNTHETIC_PROBE_OK",
      }),
  ];
}

export function assertSanitizedReport(report, context) {
  const serialized = JSON.stringify(report);
  const forbidden = [
    resolve(context.root),
    realpathSync(context.root),
    DUMMY_API_KEY,
    SYNTHETIC_SYSTEM_PROMPT,
    SYNTHETIC_USER_PROMPT,
  ];
  for (const value of forbidden) {
    if (serialized.includes(value)) {
      throw new Error(`sanitized report contains a forbidden probe value (${sha256(value).slice(0, 12)})`);
    }
  }
  if (/sk-ant-[A-Za-z0-9_-]{12,}/u.test(serialized)) {
    throw new Error("sanitized report contains an Anthropic credential pattern");
  }
}

export function writeSanitizedReport(outputPath, report, contexts) {
  for (const context of contexts) assertSanitizedReport(report, context);
  writeJson(resolve(outputPath), report);
}
