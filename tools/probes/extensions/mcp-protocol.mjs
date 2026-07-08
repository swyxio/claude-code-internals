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
  requestBodies,
  runIsolatedClaude,
  writeJson,
  writeSanitizedReport,
} from "./common.mjs";

const outputPath = resolve(
  process.argv[2] ?? "evidence/dynamic/extensions/mcp-protocol.json",
);
const fixturePath = resolve("tools/probes/extensions/fixtures/stdio-mcp-server.mjs");
const context = createProbeContext("mcp-protocol");

function parseJsonLines(text) {
  return text
    .split("\n")
    .filter(Boolean)
    .map((line) => JSON.parse(line));
}
try {
  initializeGitProject(context);
  const protocolLog = resolve(context.root, "mcp-protocol.ndjson");
  const configPath = resolve(context.root, "mcp-config.json");
  writeJson(configPath, {
    mcpServers: {
      probe: {
        type: "stdio",
        command: process.execPath,
        args: [fixturePath, protocolLog],
      },
    },
  });

  let requestedToolName = null;
  const { run, requests } = await runIsolatedClaude({
    context,
    responses: [
      ({ body }) => {
        const names = Array.isArray(body?.tools)
          ? body.tools.map((tool) => tool?.name).filter((name) => typeof name === "string")
          : [];
        requestedToolName = names.find((name) => name.includes("probe_echo")) ?? null;
        if (!requestedToolName) throw new Error("MCP probe tool was not advertised to the model");
        return toolUseResponse({
          model: body.model,
          toolName: requestedToolName,
          input: { value: "SYNTHETIC_MCP_ARGUMENT" },
        });
      },
      ({ body }) => textResponse({ model: body.model, text: "SYNTHETIC_MCP_PROBE_OK" }),
    ],
    args: [
      "--bare",
      "--mcp-config",
      configPath,
      "--strict-mcp-config",
      "--permission-mode",
      "dontAsk",
      "--allowedTools",
      "mcp__probe__probe_echo",
    ],
  });
  assertSuccessfulRun(run, "mcp-protocol");

  const protocol = parseJsonLines(readFileSync(protocolLog, "utf8"));
  const messageRequests = requestBodies(requests);
  const advertised = messageRequests[0]?.body.tools.find(
    (tool) => tool.name === requestedToolName,
  );
  const toolCalls = protocol.filter((entry) => entry.method === "tools/call");
  const report = {
    schemaVersion: PROBE_SCHEMA_VERSION,
    probe: "mcp-stdio-handshake-and-tool-dispatch",
    safety: {
      temporaryHome: true,
      temporaryGitProject: true,
      loopbackProvider: true,
      dummyCredential: true,
      telemetryDisabled: true,
      strictMcpConfig: true,
      mcpTransport: "stdio",
      mcpExecutable: "repository-owned fixture server",
      externalNetworkUsed: false,
      rawJsonRpcRetained: false,
      rawPromptsRetained: false,
      rawToolArgumentsRetained: false,
    },
    artifact: artifactIdentity(),
    run: describeRun(run),
    protocolMethodOrder: protocol.map((entry) => entry.method),
    protocol,
    advertisedTool: {
      localName: requestedToolName,
      inputSchema: advertised?.inputSchema ?? null,
      description: advertised?.description ?? null,
    },
    dispatch: {
      messagesRequestCount: messageRequests.length,
      toolsCallCount: toolCalls.length,
      remoteToolName: toolCalls[0]?.toolName ?? null,
      argumentKeys: toolCalls[0]?.argumentKeys ?? [],
    },
    limits: [
      "The fixture implements initialize, initialized, ping, tools/list, and tools/call only.",
      "The result establishes one stdio client path; it does not characterize SSE, HTTP, WebSocket, OAuth, retries, or cancellation.",
      "Tool descriptions and schemas are represented by sanitized shape/digest summaries from the loopback request recorder.",
    ],
  };
  writeSanitizedReport(outputPath, report, [context]);
  process.stdout.write(`${outputPath}\n`);
} finally {
  context.cleanup();
}
