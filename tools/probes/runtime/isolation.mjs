import { spawn } from "node:child_process";
import { mkdtemp, mkdir, realpath, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { sha256 } from "./sanitize.mjs";
import { readFile } from "node:fs/promises";

export const DUMMY_API_KEY = "runtime-probe-dummy-key-not-a-secret";
export const SYNTHETIC_SYSTEM_PROMPT = "runtime-probe-system";
export const SYNTHETIC_USER_PROMPT =
  "Perform the synthetic runtime probe turn.";

export const LOOPBACK_SANDBOX_PROFILE =
  '(version 1) (allow default) (deny network-outbound) (allow network-outbound (remote ip "localhost:*"))';

export async function inspectBinary(binaryPath) {
  const resolvedPath = await realpath(binaryPath);
  const bytes = await readFile(resolvedPath);
  return {
    resolvedPath,
    bytes: bytes.length,
    sha256: sha256(bytes),
  };
}

export async function createIsolatedWorkspace(label) {
  const root = await mkdtemp(
    path.join(os.tmpdir(), `claude-runtime-${label}-`),
  );
  const workspace = {
    root,
    home: path.join(root, "home"),
    project: path.join(root, "project"),
    temp: path.join(root, "tmp"),
    config: path.join(root, "home", ".claude"),
    xdgConfig: path.join(root, "xdg", "config"),
    xdgCache: path.join(root, "xdg", "cache"),
    xdgData: path.join(root, "xdg", "data"),
    emptyZdotdir: path.join(root, "zdotdir"),
  };
  await Promise.all(
    Object.values(workspace)
      .filter((value) => value !== root)
      .map((directory) => mkdir(directory, { recursive: true })),
  );
  workspace.fixturePath = path.join(workspace.project, "synthetic-fixture.txt");
  workspace.processOutputPath = path.join(
    workspace.project,
    "process-sentinel.txt",
  );
  await writeFile(workspace.fixturePath, "synthetic-runtime-fixture\n", {
    mode: 0o600,
  });
  return workspace;
}

export function buildProbeEnvironment(workspace, baseUrl) {
  return {
    HOME: workspace.home,
    USER: "runtime-probe",
    LOGNAME: "runtime-probe",
    SHELL: "/bin/zsh",
    PATH: "/usr/bin:/bin:/usr/sbin:/sbin:/opt/homebrew/bin",
    LANG: "C.UTF-8",
    LC_ALL: "C.UTF-8",
    TERM: "dumb",
    TMPDIR: `${workspace.temp}${path.sep}`,
    XDG_CONFIG_HOME: workspace.xdgConfig,
    XDG_CACHE_HOME: workspace.xdgCache,
    XDG_DATA_HOME: workspace.xdgData,
    ZDOTDIR: workspace.emptyZdotdir,
    BASH_ENV: "/dev/null",
    ENV: "/dev/null",
    GIT_CONFIG_NOSYSTEM: "1",
    GIT_CONFIG_GLOBAL: "/dev/null",
    CLAUDE_CONFIG_DIR: workspace.config,
    ANTHROPIC_API_KEY: DUMMY_API_KEY,
    ANTHROPIC_BASE_URL: baseUrl,
    DISABLE_TELEMETRY: "1",
    CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC: "1",
    CLAUDE_CODE_DISABLE_AUTOUPDATER: "1",
    CLAUDE_CODE_SKIP_UPDATE_CHECK: "1",
    CLAUDE_CODE_DISABLE_FEEDBACK_SURVEY: "1",
    HTTP_PROXY: "http://127.0.0.1:9",
    HTTPS_PROXY: "http://127.0.0.1:9",
    ALL_PROXY: "http://127.0.0.1:9",
    NO_PROXY: "127.0.0.1,localhost",
    CI: "1",
  };
}

export function commonClaudeArguments({ sessionId, persist, tools }) {
  const argumentsList = [
    "--print",
    "--output-format",
    "stream-json",
    "--verbose",
    "--include-partial-messages",
    "--model",
    "runtime-probe-model",
    "--system-prompt",
    SYNTHETIC_SYSTEM_PROMPT,
    "--bare",
    "--safe-mode",
    "--no-chrome",
    "--strict-mcp-config",
    "--mcp-config",
    '{"mcpServers":{}}',
    "--session-id",
    sessionId,
    "--tools",
    tools.join(","),
  ];
  if (tools.length > 0) {
    argumentsList.push(
      "--allowedTools",
      tools.join(","),
      "--dangerously-skip-permissions",
    );
  }
  if (!persist) argumentsList.push("--no-session-persistence");
  argumentsList.push(SYNTHETIC_USER_PROMPT);
  return argumentsList;
}

export async function spawnIsolatedClaude({
  binaryPath,
  argumentsList,
  environment,
  cwd,
  timeoutMs = 60_000,
  outputLimitBytes = 32 * 1024 * 1024,
}) {
  const startedAt = Date.now();
  const child = spawn(
    "/usr/bin/sandbox-exec",
    ["-p", LOOPBACK_SANDBOX_PROFILE, binaryPath, ...argumentsList],
    {
      cwd,
      env: environment,
      stdio: ["ignore", "pipe", "pipe"],
    },
  );
  const stdout = [];
  const stderr = [];
  let stdoutBytes = 0;
  let stderrBytes = 0;
  const append = (target, chunk, currentBytes) => {
    if (currentBytes + chunk.length > outputLimitBytes) {
      child.kill("SIGKILL");
      return false;
    }
    target.push(chunk);
    return true;
  };
  child.stdout.on("data", (chunk) => {
    if (append(stdout, chunk, stdoutBytes)) stdoutBytes += chunk.length;
  });
  child.stderr.on("data", (chunk) => {
    if (append(stderr, chunk, stderrBytes)) stderrBytes += chunk.length;
  });

  let timedOut = false;
  const timeout = setTimeout(() => {
    timedOut = true;
    child.kill("SIGTERM");
    setTimeout(() => child.kill("SIGKILL"), 2_000).unref();
  }, timeoutMs);
  const result = await new Promise((resolve, reject) => {
    child.once("error", reject);
    child.once("close", (exitCode, signal) => resolve({ exitCode, signal }));
  });
  clearTimeout(timeout);
  return {
    ...result,
    timedOut,
    durationMs: Date.now() - startedAt,
    stdout: Buffer.concat(stdout).toString("utf8"),
    stderr: Buffer.concat(stderr).toString("utf8"),
  };
}

export async function removeWorkspace(workspace) {
  await rm(workspace.root, { recursive: true, force: true });
}
