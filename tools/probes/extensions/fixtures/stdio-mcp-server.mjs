#!/usr/bin/env node

import { appendFileSync } from "node:fs";
import { createInterface } from "node:readline";

const [logPath] = process.argv.slice(2);
if (!logPath) throw new Error("usage: stdio-mcp-server.mjs LOG");

function shape(value, depth = 0) {
  if (value === null) return "null";
  if (Array.isArray(value)) {
    return {
      type: "array",
      length: value.length,
      itemTypes: [...new Set(value.map((item) => typeof item))].sort(),
    };
  }
  if (typeof value === "object") {
    const keys = Object.keys(value).sort();
    return {
      type: "object",
      keys,
      values:
        depth < 2
          ? Object.fromEntries(keys.map((key) => [key, shape(value[key], depth + 1)]))
          : undefined,
    };
  }
  return typeof value;
}

function log(message) {
  const record = {
    method: typeof message.method === "string" ? message.method : null,
    kind: message.method?.startsWith("notifications/") ? "notification" : "request",
    idType: message.id === undefined ? "absent" : typeof message.id,
    paramsShape: shape(message.params ?? null),
  };
  if (message.method === "initialize") {
    record.protocolVersion = message.params?.protocolVersion ?? null;
    record.clientInfoKeys = Object.keys(message.params?.clientInfo ?? {}).sort();
    record.capabilityKeys = Object.keys(message.params?.capabilities ?? {}).sort();
  }
  if (message.method === "tools/call") {
    record.toolName = message.params?.name ?? null;
    record.argumentKeys = Object.keys(message.params?.arguments ?? {}).sort();
  }
  appendFileSync(logPath, `${JSON.stringify(record)}\n`, { encoding: "utf8", mode: 0o600 });
}

function respond(id, result) {
  process.stdout.write(`${JSON.stringify({ jsonrpc: "2.0", id, result })}\n`);
}

function respondError(id, code, message) {
  process.stdout.write(`${JSON.stringify({ jsonrpc: "2.0", id, error: { code, message } })}\n`);
}

const input = createInterface({ input: process.stdin, crlfDelay: Infinity });
input.on("line", (line) => {
  if (!line.trim()) return;
  let message;
  try {
    message = JSON.parse(line);
  } catch {
    return;
  }
  log(message);
  if (message.method === "initialize") {
    respond(message.id, {
      protocolVersion: message.params?.protocolVersion ?? "2024-11-05",
      capabilities: { tools: { listChanged: false } },
      serverInfo: { name: "claude-internals-extension-probe", version: "1.0.0" },
    });
    return;
  }
  if (message.method === "notifications/initialized") return;
  if (message.method === "ping") {
    respond(message.id, {});
    return;
  }
  if (message.method === "tools/list") {
    respond(message.id, {
      tools: [
        {
          name: "probe_echo",
          description: "Returns one synthetic probe result.",
          inputSchema: {
            type: "object",
            properties: { value: { type: "string" } },
            required: ["value"],
            additionalProperties: false,
          },
        },
      ],
    });
    return;
  }
  if (message.method === "tools/call") {
    respond(message.id, {
      content: [{ type: "text", text: "SYNTHETIC_MCP_TOOL_RESULT" }],
      isError: false,
    });
    return;
  }
  if (message.id !== undefined) respondError(message.id, -32601, "Method not found in probe fixture");
});
