import { spawn } from "node:child_process";
import { mkdtempSync, mkdirSync, readdirSync, readFileSync, realpathSync, rmSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, relative, resolve } from "node:path";

import { sha256 } from "./sanitize-request.mjs";

const outputLimit = 2_000_000;

export function resolveClaudeBinary() {
  return realpathSync(process.env.CLAUDE_BINARY ?? `${process.env.HOME}/.local/bin/claude`);
}

export function createProbeContext(name) {
  const root = mkdtempSync(join(tmpdir(), `claude-internals-${name}-`));
  const home = join(root, "home");
  const project = join(root, "project");
  mkdirSync(home, { recursive: true });
  mkdirSync(project, { recursive: true });
  return {
    root,
    home,
    project,
    cleanup: () => rmSync(root, { recursive: true, force: true }),
  };
}

export function probeEnvironment(context, overrides = {}) {
  const environment = Object.fromEntries(
    ["PATH", "TMPDIR", "LANG", "LC_ALL", "SHELL"]
      .filter((key) => process.env[key] !== undefined)
      .map((key) => [key, process.env[key]]),
  );
  return {
    ...environment,
    HOME: context.home,
    CLAUDE_CONFIG_DIR: join(context.home, ".claude"),
    CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC: "1",
    DISABLE_TELEMETRY: "1",
    NO_COLOR: "1",
    TERM: "dumb",
    ...overrides,
  };
}

function appendBounded(chunks, chunk, state) {
  const buffer = Buffer.from(chunk);
  const remaining = outputLimit - state.bytes;
  if (remaining > 0) chunks.push(buffer.subarray(0, remaining));
  state.bytes += buffer.length;
}

export function runClaude({ binary = resolveClaudeBinary(), args, cwd, env, timeoutMs = 30_000 }) {
  return new Promise((resolveRun, rejectRun) => {
    const child = spawn(binary, args, { cwd, env, stdio: ["ignore", "pipe", "pipe"] });
    const stdout = [];
    const stderr = [];
    const stdoutState = { bytes: 0 };
    const stderrState = { bytes: 0 };
    child.stdout.on("data", (chunk) => appendBounded(stdout, chunk, stdoutState));
    child.stderr.on("data", (chunk) => appendBounded(stderr, chunk, stderrState));

    const timer = setTimeout(() => child.kill("SIGTERM"), timeoutMs);
    child.once("error", rejectRun);
    child.once("close", (code, signal) => {
      clearTimeout(timer);
      resolveRun({
        code,
        signal,
        stdout: Buffer.concat(stdout).toString("utf8"),
        stderr: Buffer.concat(stderr).toString("utf8"),
        stdoutTotalBytes: stdoutState.bytes,
        stderrTotalBytes: stderrState.bytes,
        truncated: stdoutState.bytes > outputLimit || stderrState.bytes > outputLimit,
      });
    });
  });
}

function walkFiles(root, directory, result) {
  for (const name of readdirSync(directory).sort()) {
    const path = join(directory, name);
    const stat = statSync(path, { throwIfNoEntry: false });
    if (!stat) continue;
    if (stat.isDirectory()) walkFiles(root, path, result);
    else if (stat.isFile()) {
      const bytes = readFileSync(path);
      const normalizedPath = relative(root, path)
        .replace(/[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/giu, "$UUID")
        .replace(/\b\d{13}\b/gu, "$EPOCH_MS");
      result.push({ path: normalizedPath, bytes: bytes.length, sha256: sha256(bytes) });
    }
  }
}

export function snapshotFiles(context) {
  const files = [];
  walkFiles(context.root, context.root, files);
  return files;
}

export function normalizeProbePath(context, value) {
  return String(value).replaceAll(resolve(context.root), "$PROBE_ROOT");
}
