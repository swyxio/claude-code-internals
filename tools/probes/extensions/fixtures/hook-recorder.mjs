#!/usr/bin/env node

import { appendFileSync } from "node:fs";

const [logPath, label, delayText = "0"] = process.argv.slice(2);
if (!logPath || !label) throw new Error("usage: hook-recorder.mjs LOG LABEL [DELAY_MS]");
const delayMs = Number.parseInt(delayText, 10);
if (!Number.isSafeInteger(delayMs) || delayMs < 0 || delayMs > 2_000) {
  throw new Error("hook delay must be an integer between 0 and 2000 ms");
}

function append(record) {
  appendFileSync(logPath, `${JSON.stringify(record)}\n`, { encoding: "utf8", mode: 0o600 });
}

function shape(value, depth = 0) {
  if (value === null) return "null";
  if (Array.isArray(value)) {
    return {
      type: "array",
      length: value.length,
      itemTypes: [...new Set(value.map((item) => shape(item, 4)?.type ?? shape(item, 4)))].sort(),
    };
  }
  if (typeof value === "object") {
    const keys = Object.keys(value).sort();
    return {
      type: "object",
      keys,
      values:
        depth < 3
          ? Object.fromEntries(keys.map((key) => [key, shape(value[key], depth + 1)]))
          : undefined,
    };
  }
  return typeof value;
}

const chunks = [];
let bytes = 0;
for await (const chunk of process.stdin) {
  bytes += chunk.length;
  if (bytes > 1_000_000) throw new Error("hook payload exceeded 1 MB safety limit");
  chunks.push(chunk);
}
const raw = Buffer.concat(chunks).toString("utf8");
const payload = raw ? JSON.parse(raw) : null;
const safeNames = {
  hookEventName:
    typeof payload?.hook_event_name === "string" ? payload.hook_event_name : null,
  toolName: typeof payload?.tool_name === "string" ? payload.tool_name : null,
};

append({ label, phase: "start" });
if (delayMs > 0) await new Promise((resolve) => setTimeout(resolve, delayMs));
append({
  label,
  phase: "end",
  payloadBytes: Buffer.byteLength(raw),
  safeNames,
  payloadShape: shape(payload),
});
