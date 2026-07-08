import { createHash } from "node:crypto";

export function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function textDescriptor(value) {
  const text = typeof value === "string" ? value : JSON.stringify(value);
  return {
    bytes: Buffer.byteLength(text),
    sha256: sha256(text),
  };
}

function summarizeContentBlock(block) {
  if (typeof block === "string") return { type: "text", text: textDescriptor(block) };
  if (block === null || typeof block !== "object") return { type: typeof block };

  const summary = { type: block.type ?? "object" };
  if (typeof block.text === "string") summary.text = textDescriptor(block.text);
  if (typeof block.thinking === "string") summary.thinking = textDescriptor(block.thinking);
  if (typeof block.name === "string") summary.name = block.name;
  if (typeof block.tool_use_id === "string") summary.toolUseId = textDescriptor(block.tool_use_id);
  if (block.input !== undefined) summary.input = summarizeJsonShape(block.input);
  if (block.content !== undefined) {
    const nested = Array.isArray(block.content) ? block.content : [block.content];
    summary.content = nested.map(summarizeContentBlock);
  }
  if (block.cache_control && typeof block.cache_control === "object") {
    summary.cacheControlType = block.cache_control.type ?? "object";
  }
  return summary;
}

export function summarizeJsonShape(value, depth = 0) {
  if (value === null) return { type: "null" };
  if (Array.isArray(value)) {
    return {
      type: "array",
      length: value.length,
      items: depth < 2 ? value.slice(0, 20).map((item) => summarizeJsonShape(item, depth + 1)) : [],
    };
  }
  if (typeof value === "object") {
    const keys = Object.keys(value).sort();
    return {
      type: "object",
      keys,
      values:
        depth < 2
          ? Object.fromEntries(keys.slice(0, 40).map((key) => [key, summarizeJsonShape(value[key], depth + 1)]))
          : {},
    };
  }
  if (typeof value === "string") return { type: "string", ...textDescriptor(value) };
  return { type: typeof value, value };
}

function summarizeMessage(message) {
  const content = Array.isArray(message.content) ? message.content : [message.content];
  return {
    role: message.role ?? null,
    content: content.map(summarizeContentBlock),
  };
}

function summarizeTool(tool) {
  return {
    name: tool.name ?? null,
    description: typeof tool.description === "string" ? textDescriptor(tool.description) : null,
    inputSchema: summarizeJsonShape(tool.input_schema ?? null),
  };
}

function selectHeader(headers, name) {
  const value = headers[name];
  if (Array.isArray(value)) return value.join(", ");
  return value ?? null;
}

export function summarizeAnthropicRequest({ method, url, headers, body }) {
  const systemBlocks = Array.isArray(body?.system) ? body.system : body?.system ? [body.system] : [];
  return {
    method,
    path: new URL(url, "http://loopback.invalid").pathname,
    headerNames: Object.keys(headers).map((name) => name.toLowerCase()).sort(),
    safeHeaders: {
      anthropicVersion: selectHeader(headers, "anthropic-version"),
      anthropicBeta: selectHeader(headers, "anthropic-beta"),
      contentType: selectHeader(headers, "content-type"),
      userAgent: selectHeader(headers, "user-agent"),
    },
    credentials: {
      apiKeyPresent: Boolean(selectHeader(headers, "x-api-key")),
      authorizationPresent: Boolean(selectHeader(headers, "authorization")),
    },
    body: {
      topLevelKeys: body && typeof body === "object" ? Object.keys(body).sort() : [],
      model: body?.model ?? null,
      maxTokens: body?.max_tokens ?? null,
      stream: body?.stream ?? null,
      metadataKeys: body?.metadata && typeof body.metadata === "object" ? Object.keys(body.metadata).sort() : [],
      system: systemBlocks.map(summarizeContentBlock),
      messages: Array.isArray(body?.messages) ? body.messages.map(summarizeMessage) : [],
      tools: Array.isArray(body?.tools) ? body.tools.map(summarizeTool) : [],
      toolChoice: body?.tool_choice ? summarizeJsonShape(body.tool_choice) : null,
    },
  };
}
