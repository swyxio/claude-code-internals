import http from "node:http";
import { summarizeRequest } from "./sanitize.mjs";

function messageStart(messageId) {
  return {
    event: "message_start",
    data: {
      type: "message_start",
      message: {
        id: messageId,
        type: "message",
        role: "assistant",
        model: "runtime-probe-model",
        content: [],
        stop_reason: null,
        stop_sequence: null,
        usage: { input_tokens: 1, output_tokens: 0 },
      },
    },
  };
}

function messageEnd(stopReason, outputTokens = 1) {
  return [
    {
      event: "message_delta",
      data: {
        type: "message_delta",
        delta: { stop_reason: stopReason, stop_sequence: null },
        usage: { output_tokens: outputTokens },
      },
    },
    { event: "message_stop", data: { type: "message_stop" } },
  ];
}

export function textEvents(step, text = "runtime-probe-ok") {
  return [
    messageStart(`msg_runtime_probe_text_${step}`),
    {
      event: "content_block_start",
      data: {
        type: "content_block_start",
        index: 0,
        content_block: { type: "text", text: "" },
      },
    },
    {
      event: "content_block_delta",
      data: {
        type: "content_block_delta",
        index: 0,
        delta: { type: "text_delta", text },
      },
    },
    {
      event: "content_block_stop",
      data: { type: "content_block_stop", index: 0 },
    },
    ...messageEnd("end_turn", 1),
  ];
}

export function toolUseEvents(step, { id, name, input }) {
  return [
    messageStart(`msg_runtime_probe_tool_${step}`),
    {
      event: "content_block_start",
      data: {
        type: "content_block_start",
        index: 0,
        content_block: { type: "tool_use", id, name, input: {} },
      },
    },
    {
      event: "content_block_delta",
      data: {
        type: "content_block_delta",
        index: 0,
        delta: {
          type: "input_json_delta",
          partial_json: JSON.stringify(input),
        },
      },
    },
    {
      event: "content_block_stop",
      data: { type: "content_block_stop", index: 0 },
    },
    ...messageEnd("tool_use", 1),
  ];
}

function writeSse(response, events) {
  response.writeHead(200, {
    "content-type": "text/event-stream",
    "cache-control": "no-cache",
    connection: "keep-alive",
    "request-id": "req_runtime_probe",
  });
  for (const item of events) {
    response.write(`event: ${item.event}\n`);
    response.write(`data: ${JSON.stringify(item.data)}\n\n`);
  }
  response.end();
}

async function collectBody(request, limitBytes = 16 * 1024 * 1024) {
  const chunks = [];
  let total = 0;
  for await (const chunk of request) {
    total += chunk.length;
    if (total > limitBytes)
      throw new Error("Probe request exceeded capture limit");
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
}

export async function startFakeAnthropicServer({ responder }) {
  const requests = [];
  const unexpectedRequests = [];
  let messageRequestIndex = 0;
  const server = http.createServer(async (request, response) => {
    try {
      const bodyBuffer = await collectBody(request);
      const summary = summarizeRequest(request, bodyBuffer);
      requests.push(summary);
      const pathname = new URL(request.url ?? "/", "http://localhost").pathname;
      if (request.method === "HEAD" && pathname === "/") {
        response.writeHead(200, { "content-type": "text/plain" });
        response.end();
        return;
      }
      if (
        request.method === "POST" &&
        pathname.endsWith("/v1/messages/count_tokens")
      ) {
        response.writeHead(200, { "content-type": "application/json" });
        response.end(JSON.stringify({ input_tokens: 11 }));
        return;
      }
      if (request.method !== "POST" || !pathname.endsWith("/v1/messages")) {
        unexpectedRequests.push({ method: request.method, pathname });
        response.writeHead(404, { "content-type": "application/json" });
        response.end(
          JSON.stringify({ type: "error", error: { type: "not_found" } }),
        );
        return;
      }

      let parsedBody;
      try {
        parsedBody = JSON.parse(bodyBuffer.toString("utf8"));
      } catch {
        response.writeHead(400, { "content-type": "application/json" });
        response.end(
          JSON.stringify({
            type: "error",
            error: { type: "invalid_request_error" },
          }),
        );
        return;
      }
      const events = await responder({
        index: messageRequestIndex,
        body: parsedBody,
      });
      messageRequestIndex += 1;
      writeSse(response, events);
    } catch (error) {
      response.writeHead(500, { "content-type": "application/json" });
      response.end(
        JSON.stringify({
          type: "error",
          error: { type: "api_error", message: "runtime probe server error" },
        }),
      );
    }
  });

  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });
  const address = server.address();
  if (!address || typeof address === "string")
    throw new Error("Missing loopback address");

  return {
    baseUrl: `http://127.0.0.1:${address.port}`,
    requests,
    unexpectedRequests,
    close: () =>
      new Promise((resolve, reject) =>
        server.close((error) => (error ? reject(error) : resolve())),
      ),
  };
}

export function createTextResponder() {
  return ({ index }) => textEvents(index);
}

export function createToolLoopResponder({ fixturePath, processOutputPath }) {
  return ({ index }) => {
    if (index === 0) {
      return toolUseEvents(index, {
        id: "toolu_runtime_probe_read",
        name: "Read",
        input: { file_path: fixturePath },
      });
    }
    if (index === 1) {
      const quotedPath = `'${processOutputPath.replaceAll("'", "'\\''")}'`;
      return toolUseEvents(index, {
        id: "toolu_runtime_probe_bash",
        name: "Bash",
        input: {
          command: `/usr/bin/printf runtime-process-ok > ${quotedPath}`,
          description: "Create a synthetic runtime-probe sentinel",
        },
      });
    }
    return textEvents(index, "runtime-tool-loop-ok");
  };
}
