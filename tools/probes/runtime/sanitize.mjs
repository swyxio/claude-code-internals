import { createHash } from "node:crypto";
import { readdir, readFile, stat } from "node:fs/promises";
import path from "node:path";

export function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

export function sortedFields(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return [];
  return Object.keys(value).sort();
}

function summarizeScalar(value) {
  if (typeof value === "string") {
    return {
      kind: "string",
      bytes: Buffer.byteLength(value),
      sha256: sha256(value),
    };
  }
  if (value === null) return { kind: "null" };
  return { kind: typeof value };
}

export function summarizeContent(content) {
  if (!Array.isArray(content)) return summarizeScalar(content);
  return {
    kind: "blocks",
    count: content.length,
    blocks: content.map((block) => {
      if (!block || typeof block !== "object") return summarizeScalar(block);
      const summary = {
        type: typeof block.type === "string" ? block.type : "unknown",
        fields: sortedFields(block),
      };
      if (typeof block.name === "string") summary.toolName = block.name;
      if (typeof block.is_error === "boolean") summary.isError = block.is_error;
      if ("content" in block) summary.content = summarizeContent(block.content);
      if ("input" in block) {
        summary.input = {
          kind: Array.isArray(block.input) ? "array" : typeof block.input,
          fields: sortedFields(block.input),
        };
      }
      return summary;
    }),
  };
}

export function summarizeRequest(request, bodyBuffer) {
  let body;
  try {
    body = JSON.parse(bodyBuffer.toString("utf8"));
  } catch {
    body = undefined;
  }
  const url = new URL(request.url ?? "/", "http://localhost");
  const summary = {
    method: request.method ?? "UNKNOWN",
    pathname: url.pathname,
    queryFieldNames: [...url.searchParams.keys()].sort(),
    headerNames: Object.keys(request.headers)
      .map((key) => key.toLowerCase())
      .sort(),
    bodyBytes: bodyBuffer.length,
    bodySha256: sha256(bodyBuffer),
    bodyParsedAsJson: body !== undefined,
    topLevelFields: sortedFields(body),
  };
  if (!body || typeof body !== "object" || Array.isArray(body)) return summary;

  if (typeof body.model === "string") {
    summary.model = {
      bytes: Buffer.byteLength(body.model),
      sha256: sha256(body.model),
    };
  }
  if (typeof body.stream === "boolean") summary.stream = body.stream;
  if (typeof body.max_tokens === "number") summary.maxTokens = body.max_tokens;
  if ("system" in body) summary.system = summarizeContent(body.system);
  if (Array.isArray(body.messages)) {
    summary.messages = body.messages.map((message) => ({
      fields: sortedFields(message),
      role: typeof message?.role === "string" ? message.role : "unknown",
      content: summarizeContent(message?.content),
    }));
  }
  if (Array.isArray(body.tools)) {
    summary.tools = {
      count: body.tools.length,
      names: body.tools
        .map((tool) => tool?.name)
        .filter((name) => typeof name === "string"),
      fieldSets: body.tools.map((tool) => sortedFields(tool)),
    };
  }
  return summary;
}

function summarizeProtocolObject(value, index) {
  const entry = {
    index,
    fields: sortedFields(value),
    type: typeof value?.type === "string" ? value.type : "unknown",
  };
  if (typeof value?.subtype === "string") entry.subtype = value.subtype;
  if (typeof value?.session_id === "string") {
    entry.sessionIdSha256 = sha256(value.session_id);
  }
  if (value?.message && typeof value.message === "object") {
    entry.message = {
      fields: sortedFields(value.message),
      role:
        typeof value.message.role === "string" ? value.message.role : "unknown",
      content: summarizeContent(value.message.content),
    };
  }
  if (value?.content !== undefined)
    entry.content = summarizeContent(value.content);
  if (value?.result !== undefined)
    entry.result = summarizeContent(value.result);
  if (value?.event && typeof value.event === "object") {
    entry.event = {
      fields: sortedFields(value.event),
      type: typeof value.event.type === "string" ? value.event.type : "unknown",
    };
    if (typeof value.event.delta?.type === "string") {
      entry.event.deltaType = value.event.delta.type;
    }
    if (typeof value.event.content_block?.type === "string") {
      entry.event.contentBlockType = value.event.content_block.type;
    }
  }
  return entry;
}

export function summarizeJsonLines(raw) {
  const lines = raw.split(/\r?\n/).filter((line) => line.length > 0);
  const entries = [];
  let nonJsonCount = 0;
  for (const [index, line] of lines.entries()) {
    try {
      entries.push(summarizeProtocolObject(JSON.parse(line), index));
    } catch {
      nonJsonCount += 1;
    }
  }
  return {
    bytes: Buffer.byteLength(raw),
    sha256: sha256(raw),
    lineCount: lines.length,
    jsonLineCount: entries.length,
    nonJsonCount,
    eventOrder: entries.map((entry) =>
      entry.subtype ? `${entry.type}:${entry.subtype}` : entry.type,
    ),
    entries,
  };
}

async function walk(root, current, files) {
  for (const entry of await readdir(current, { withFileTypes: true })) {
    const absolute = path.join(current, entry.name);
    if (entry.isDirectory()) await walk(root, absolute, files);
    else if (entry.isFile())
      files.push({ absolute, relative: path.relative(root, absolute) });
  }
}

function normalizeEvidencePath(value) {
  return value
    .split(path.sep)
    .join("/")
    .replace(
      /home\/\.claude\/projects\/[^/]+/u,
      "home/.claude/projects/$PROJECT_KEY",
    )
    .replace(
      /[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/giu,
      "$UUID",
    )
    .replace(/\b\d{13}\b/gu, "$EPOCH_MS");
}

export async function summarizeTree(root) {
  const files = [];
  await walk(root, root, files);
  const summaries = [];
  for (const file of files.sort((left, right) =>
    left.relative.localeCompare(right.relative),
  )) {
    const [metadata, bytes] = await Promise.all([
      stat(file.absolute),
      readFile(file.absolute),
    ]);
    const summary = {
      path: normalizeEvidencePath(file.relative),
      bytes: bytes.length,
      sha256: sha256(bytes),
      mode: (metadata.mode & 0o777).toString(8).padStart(3, "0"),
    };
    if (file.relative.endsWith(".jsonl")) {
      summary.jsonLines = summarizeJsonLines(bytes.toString("utf8"));
    }
    summaries.push(summary);
  }
  return summaries;
}

export function diffTrees(before, after) {
  const beforeByPath = new Map(before.map((entry) => [entry.path, entry]));
  const afterByPath = new Map(after.map((entry) => [entry.path, entry]));
  const compact = (entry) => ({
    path: entry.path,
    bytes: entry.bytes,
    sha256: entry.sha256,
    mode: entry.mode,
    ...(entry.jsonLines ? { jsonLines: entry.jsonLines } : {}),
  });
  return {
    created: after
      .filter((entry) => !beforeByPath.has(entry.path))
      .map(compact),
    modified: after
      .filter((entry) => {
        const prior = beforeByPath.get(entry.path);
        return prior && prior.sha256 !== entry.sha256;
      })
      .map(compact),
    deleted: before
      .filter((entry) => !afterByPath.has(entry.path))
      .map((entry) => entry.path),
  };
}

export function assertSanitized(value, forbiddenValues) {
  const encoded = JSON.stringify(value);
  for (const forbidden of forbiddenValues.filter(Boolean)) {
    if (encoded.includes(forbidden)) {
      throw new Error("Sanitized evidence contains a forbidden raw value");
    }
  }
}
