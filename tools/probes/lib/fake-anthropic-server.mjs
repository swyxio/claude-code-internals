import { createServer } from "node:http";

import { summarizeAnthropicRequest } from "./sanitize-request.mjs";

const encoder = new TextEncoder();

function sseEvent(name, payload) {
  return `event: ${name}\ndata: ${JSON.stringify(payload)}\n\n`;
}

function baseMessage(id, model) {
  return {
    id,
    type: "message",
    role: "assistant",
    content: [],
    model,
    stop_reason: null,
    stop_sequence: null,
    usage: { input_tokens: 11, output_tokens: 1 },
  };
}

export function textResponse({ id = "msg_probe_text", model, text = "PROBE_OK" }) {
  return [
    sseEvent("message_start", { type: "message_start", message: baseMessage(id, model) }),
    sseEvent("content_block_start", {
      type: "content_block_start",
      index: 0,
      content_block: { type: "text", text: "" },
    }),
    sseEvent("content_block_delta", {
      type: "content_block_delta",
      index: 0,
      delta: { type: "text_delta", text },
    }),
    sseEvent("content_block_stop", { type: "content_block_stop", index: 0 }),
    sseEvent("message_delta", {
      type: "message_delta",
      delta: { stop_reason: "end_turn", stop_sequence: null },
      usage: { output_tokens: 1 },
    }),
    sseEvent("message_stop", { type: "message_stop" }),
  ].join("");
}

export function toolUseResponse({
  id = "msg_probe_tool",
  model,
  toolName = "Bash",
  toolUseId = "toolu_probe_001",
  input = { command: "printf PROBE_TOOL_OK" },
}) {
  return [
    sseEvent("message_start", { type: "message_start", message: baseMessage(id, model) }),
    sseEvent("content_block_start", {
      type: "content_block_start",
      index: 0,
      content_block: { type: "tool_use", id: toolUseId, name: toolName, input: {} },
    }),
    sseEvent("content_block_delta", {
      type: "content_block_delta",
      index: 0,
      delta: { type: "input_json_delta", partial_json: JSON.stringify(input) },
    }),
    sseEvent("content_block_stop", { type: "content_block_stop", index: 0 }),
    sseEvent("message_delta", {
      type: "message_delta",
      delta: { stop_reason: "tool_use", stop_sequence: null },
      usage: { output_tokens: 12 },
    }),
    sseEvent("message_stop", { type: "message_stop" }),
  ].join("");
}

async function readJson(request) {
  const chunks = [];
  let size = 0;
  for await (const chunk of request) {
    size += chunk.length;
    if (size > 20_000_000) throw new Error("probe request exceeded 20 MB safety limit");
    chunks.push(chunk);
  }
  const raw = Buffer.concat(chunks).toString("utf8");
  return raw ? JSON.parse(raw) : null;
}

export async function startFakeAnthropicServer({ responses }) {
  const requests = [];
  let responseIndex = 0;
  const server = createServer(async (request, response) => {
    try {
      const body = await readJson(request);
      requests.push(
        summarizeAnthropicRequest({
          method: request.method,
          url: request.url,
          headers: request.headers,
          body,
        }),
      );

      if (request.method === "HEAD" && request.url === "/") {
        response.writeHead(200, { "content-type": "text/plain" });
        response.end();
        return;
      }

      if (request.url?.startsWith("/v1/messages/count_tokens")) {
        response.writeHead(200, { "content-type": "application/json" });
        response.end(JSON.stringify({ input_tokens: 11 }));
        return;
      }
      if (!request.url?.startsWith("/v1/messages")) {
        response.writeHead(404, { "content-type": "application/json" });
        response.end(JSON.stringify({ type: "error", error: { type: "not_found_error", message: "probe route" } }));
        return;
      }

      const scripted = responses[responseIndex];
      responseIndex += 1;
      if (!scripted) {
        response.writeHead(500, { "content-type": "application/json" });
        response.end(JSON.stringify({ type: "error", error: { type: "api_error", message: "probe response exhausted" } }));
        return;
      }
      const payload = typeof scripted === "function" ? scripted({ body, index: responseIndex - 1 }) : scripted;
      response.writeHead(200, {
        "content-type": "text/event-stream",
        "cache-control": "no-cache",
        "request-id": `req_probe_${responseIndex}`,
      });
      response.end(encoder.encode(payload));
    } catch (error) {
      response.writeHead(400, { "content-type": "application/json" });
      response.end(JSON.stringify({ type: "error", error: { type: "invalid_request_error", message: error.message } }));
    }
  });

  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("probe server did not bind a TCP port");

  return {
    baseUrl: `http://127.0.0.1:${address.port}`,
    requests,
    close: () => new Promise((resolve, reject) => server.close((error) => (error ? reject(error) : resolve()))),
  };
}
