#!/usr/bin/env node

import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

import { textResponse } from "../lib/fake-anthropic-server.mjs";
import {
  artifactIdentity,
  assertSanitizedReport,
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
  process.argv[2] ?? "evidence/dynamic/extensions/discovery.json",
);
const markers = {
  agentDescription: "SYNTHETIC_AGENT_DESCRIPTION_MARKER_7F3A",
  agentPrompt: "SYNTHETIC_AGENT_PROMPT_MARKER_90C2",
  userSkill: "SYNTHETIC_USER_SKILL_MARKER_48D1",
  pluginSkill: "SYNTHETIC_PLUGIN_SKILL_MARKER_B6E4",
};
const contexts = [];

function findStringPaths(value, marker, path = "$", result = []) {
  if (typeof value === "string") {
    if (value.includes(marker)) result.push(path);
    return result;
  }
  if (Array.isArray(value)) {
    value.forEach((item, index) => findStringPaths(item, marker, `${path}[${index}]`, result));
    return result;
  }
  if (value && typeof value === "object") {
    for (const [key, child] of Object.entries(value)) {
      findStringPaths(child, marker, `${path}.${key}`, result);
    }
  }
  return result;
}

function collectProbeStrings(value, result = new Set()) {
  if (typeof value === "string") {
    if (value.toLowerCase().includes("probe") && !value.includes("/")) result.add(value);
  } else if (Array.isArray(value)) {
    for (const item of value) collectProbeStrings(item, result);
  } else if (value && typeof value === "object") {
    for (const child of Object.values(value)) collectProbeStrings(child, result);
  }
  return [...result].sort();
}

function parseJsonLines(text) {
  return text
    .split("\n")
    .filter(Boolean)
    .map((line) => JSON.parse(line));
}

function writeSkill(path, { name, descriptionMarker, bodyMarker }) {
  mkdirSync(path, { recursive: true, mode: 0o700 });
  const text = [
    "---",
    `name: ${name}`,
    `description: ${descriptionMarker}`,
    "user_invocable: true",
    "---",
    "",
    "# Synthetic discovery fixture",
    "",
    bodyMarker,
    "",
  ].join("\n");
  // This file is synthetic probe input and is deleted with the temporary context.
  writeFileSync(resolve(path, "SKILL.md"), text, { mode: 0o600 });
}

async function runCase({ name, setup, args = [], userPrompt, bare = true }) {
  const context = createProbeContext(`discovery-${name}`);
  contexts.push(context);
  initializeGitProject(context);
  const setupResult = setup ? (await setup(context)) ?? {} : {};
  const markerPaths = {};
  let rawBody = null;
  const { run, requests } = await runIsolatedClaude({
    context,
    systemPrompt: null,
    outputFormat: "stream-json",
    args: [
      "--verbose",
      ...(bare ? ["--bare"] : []),
      ...args,
      ...(setupResult.args ?? []),
    ],
    userPrompt: setupResult.userPrompt ?? userPrompt,
    responses: [
      ({ body }) => {
        rawBody = body;
        for (const [markerName, marker] of Object.entries(markers)) {
          markerPaths[markerName] = findStringPaths(body, marker);
        }
        return textResponse({ model: body.model, text: "SYNTHETIC_DISCOVERY_PROBE_OK" });
      },
    ],
  });
  assertSuccessfulRun(run, name);
  const messageRequests = requestBodies(requests);
  if (messageRequests.length !== 1 || !rawBody) {
    if (process.env.PROBE_DEBUG === "1") process.stderr.write(run.stdout);
    throw new Error(`${name}: expected exactly one model request`);
  }
  const sanitizedBody = messageRequests[0].body;
  const toolNames = sanitizedBody.tools.map((tool) => tool.name).sort();
  const streamEvents = parseJsonLines(run.stdout);
  const init = streamEvents.find(
    (event) => event?.type === "system" && event?.subtype === "init",
  );
  if (!init) throw new Error(`${name}: stream did not contain a system/init event`);
  for (const [markerName, marker] of Object.entries(markers)) {
    markerPaths[markerName].push(
      ...findStringPaths(init, marker).map((path) => `streamInit:${path}`),
    );
  }
  return {
    name,
    mode: bare ? "bare" : "normal",
    run: describeRun(run),
    markerPaths,
    toolCount: toolNames.length,
    toolNames,
    toolCatalogSha256: sha256(JSON.stringify(sanitizedBody.tools)),
    initKeys: Object.keys(init).sort(),
    catalogCounts: {
      agents: Array.isArray(init.agents) ? init.agents.length : null,
      plugins: Array.isArray(init.plugins) ? init.plugins.length : null,
      skills: Array.isArray(init.skills) ? init.skills.length : null,
      slashCommands: Array.isArray(init.slash_commands) ? init.slash_commands.length : null,
    },
    syntheticCatalogEntries: collectProbeStrings({
      agents: init.agents,
      plugins: init.plugins,
      skills: init.skills,
      slashCommands: init.slash_commands,
    }),
  };
}

try {
  const cases = [];
  cases.push(await runCase({ name: "baseline" }));
  cases.push(
    await runCase({
      name: "inline-agent-selected",
      args: [
        "--agents",
        JSON.stringify({
          "probe-agent": {
            description: markers.agentDescription,
            prompt: markers.agentPrompt,
            tools: ["Read"],
          },
        }),
        "--agent",
        "probe-agent",
      ],
    }),
  );
  cases.push(
    await runCase({
      name: "user-skill-discovered",
      bare: false,
      setup: async (context) => {
        writeSkill(resolve(context.home, ".claude/skills/probe-user-skill"), {
          name: "probe-user-skill",
          descriptionMarker: markers.userSkill,
          bodyMarker: markers.userSkill,
        });
      },
    }),
  );
  cases.push(
    await runCase({
      name: "explicit-plugin-skill-discovered",
      setup: async (context) => {
        const pluginRoot = resolve(context.root, "probe-plugin");
        writeJson(resolve(pluginRoot, ".claude-plugin/plugin.json"), {
          name: "probe-extension-plugin",
          version: "1.0.0",
          description: "Synthetic local plugin used only for isolated discovery testing.",
        });
        writeSkill(resolve(pluginRoot, "skills/probe-plugin-skill"), {
          name: "probe-plugin-skill",
          descriptionMarker: markers.pluginSkill,
          bodyMarker: markers.pluginSkill,
        });
        return { args: ["--plugin-dir", pluginRoot] };
      },
    }),
  );

  const pluginCase = cases.find((entry) => entry.name === "explicit-plugin-skill-discovered");
  if (
    pluginCase &&
    pluginCase.markerPaths.pluginSkill.length === 0 &&
    pluginCase.syntheticCatalogEntries.length === 0
  ) {
    if (process.env.PROBE_DEBUG === "1") {
      process.stderr.write(`${JSON.stringify(cases.map(({ name, markerPaths, toolNames }) => ({ name, markerPaths, toolNames })), null, 2)}\n`);
    }
    throw new Error("explicit plugin skill marker was not discovered");
  }

  const report = {
    schemaVersion: PROBE_SCHEMA_VERSION,
    probe: "agent-skill-plugin-discovery",
    safety: {
      temporaryHomes: true,
      temporaryGitProjects: true,
      loopbackProvider: true,
      dummyCredential: true,
      telemetryDisabled: true,
      bareModeUsed: true,
      normalModeUsed: true,
      externalPluginsFetched: false,
      rawPromptsRetained: false,
      rawExtensionBodiesRetained: false,
    },
    artifact: artifactIdentity(),
    markers: Object.fromEntries(
      Object.entries(markers).map(([name, value]) => [
        name,
        { bytes: Buffer.byteLength(value), sha256: sha256(value) },
      ]),
    ),
    cases,
    limits: [
      "Marker paths prove that synthetic extension metadata or instructions reached the request boundary; they do not prove how the model uses that text.",
      "Tool and system signatures are hashes of sanitized structural summaries, not raw prompts, descriptions, schemas, or extension bodies.",
      "Only inline agents, user-home skills, and an explicitly supplied local plugin are in scope.",
    ],
  };
  for (const context of contexts) assertSanitizedReport(report, context);
  writeSanitizedReport(outputPath, report, contexts);
  process.stdout.write(`${outputPath}\n`);
} finally {
  for (const context of contexts) context.cleanup();
}
