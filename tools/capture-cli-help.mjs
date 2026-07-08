#!/usr/bin/env node

import { createHash } from "node:crypto";
import { mkdirSync, mkdtempSync, readFileSync, realpathSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { spawnSync } from "node:child_process";

const binary = realpathSync(process.env.CLAUDE_BINARY ?? `${process.env.HOME}/.local/bin/claude`);
const outputDirectory = resolve(process.argv[2] ?? "evidence/cli-help");
const captureHome = mkdtempSync(join(tmpdir(), "claude-help-"));
process.on("exit", () => rmSync(captureHome, { recursive: true, force: true }));
const captureEnvironment = Object.fromEntries(
  ["PATH", "TMPDIR", "LANG", "LC_ALL"]
    .filter((key) => process.env[key] !== undefined)
    .map((key) => [key, process.env[key]]),
);
Object.assign(captureEnvironment, {
  HOME: captureHome,
  CLAUDE_CONFIG_DIR: join(captureHome, ".claude"),
  CLAUDE_CODE_SAFE_MODE: "1",
  NO_COLOR: "1",
  TERM: "dumb",
  CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC: "1",
});
const versionResult = spawnSync(binary, ["--version"], {
  encoding: "utf8",
  env: captureEnvironment,
});
if (versionResult.status !== 0) {
  throw new Error(`claude --version exited ${versionResult.status}: ${versionResult.stderr ?? ""}`);
}
const binaryVersion = versionResult.stdout.trim().split(/\s+/u)[0];
const commands = [
  { name: "root", args: ["--help"] },
  { name: "agents", args: ["agents", "--help"] },
  { name: "auth", args: ["auth", "--help"] },
  { name: "auto-mode", args: ["auto-mode", "--help"] },
  { name: "install", args: ["install", "--help"] },
  { name: "mcp", args: ["mcp", "--help"] },
  { name: "plugin", args: ["plugin", "--help"] },
  { name: "plugin-init", args: ["plugin", "init", "--help"] },
  { name: "plugin-install", args: ["plugin", "install", "--help"] },
  { name: "plugin-validate", args: ["plugin", "validate", "--help"] },
  { name: "project", args: ["project", "--help"] },
  { name: "setup-token", args: ["setup-token", "--help"] },
  { name: "ultrareview", args: ["ultrareview", "--help"] },
  { name: "update", args: ["update", "--help"] },
];

mkdirSync(outputDirectory, { recursive: true });
const captures = [];

for (const command of commands) {
  const result = spawnSync(binary, command.args, { encoding: "utf8", env: captureEnvironment });
  const text = `${result.stdout ?? ""}${result.stderr ?? ""}`.replace(/[ \t]+$/gmu, "");
  if (result.status !== 0) {
    throw new Error(`claude ${command.args.join(" ")} exited ${result.status}: ${text}`);
  }
  const path = resolve(outputDirectory, `${command.name}.txt`);
  writeFileSync(path, text);
  captures.push({
    command: ["claude", ...command.args],
    file: `cli-help/${command.name}.txt`,
    bytes: Buffer.byteLength(text),
    sha256: createHash("sha256").update(text).digest("hex"),
  });
}

const indexPath = resolve(dirname(outputDirectory), "cli-help-index.json");
writeFileSync(
  indexPath,
  `${JSON.stringify(
    {
      schemaVersion: 1,
      binaryVersion,
      binarySha256: createHash("sha256").update(readFileSync(binary)).digest("hex"),
      note: "Captured from --help invocations with a temporary clean HOME/config, an allowlisted environment, safe mode, and nonessential traffic disabled; no configuration or credential subcommand was invoked.",
      captures,
    },
    null,
    2,
  )}\n`,
);

console.log(`captured ${captures.length} help surfaces in ${outputDirectory}`);
