import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { test } from "node:test";

import {
  createTextResponder,
  startFakeAnthropicServer,
  toolUseEvents,
} from "./fake-anthropic.mjs";
import {
  DUMMY_API_KEY,
  LOOPBACK_SANDBOX_PROFILE,
  buildProbeEnvironment,
  commonClaudeArguments,
  createIsolatedWorkspace,
  removeWorkspace,
} from "./isolation.mjs";
import {
  assertSanitized,
  diffTrees,
  summarizeJsonLines,
  summarizeRequest,
  summarizeTree,
} from "./sanitize.mjs";

test("request sanitizer keeps shape and discards raw content and credentials", () => {
  const rawPrompt = "private synthetic prompt marker";
  const rawKey = "private dummy credential marker";
  const request = {
    method: "POST",
    url: "/v1/messages?beta=secret-value",
    headers: {
      "x-api-key": rawKey,
      "content-type": "application/json",
    },
  };
  const body = Buffer.from(
    JSON.stringify({
      model: "probe-model",
      stream: true,
      system: rawPrompt,
      messages: [{ role: "user", content: rawPrompt }],
      tools: [
        {
          name: "Read",
          description: rawPrompt,
          input_schema: { type: "object" },
        },
      ],
    }),
  );
  const summary = summarizeRequest(request, body);
  assert.deepEqual(summary.queryFieldNames, ["beta"]);
  assert.deepEqual(summary.headerNames, ["content-type", "x-api-key"]);
  assert.equal(summary.messages[0].content.kind, "string");
  assert.equal(summary.tools.names[0], "Read");
  assertSanitized(summary, [rawPrompt, rawKey, "secret-value"]);
});

test("stream-json sanitizer retains event order but not content", () => {
  const rawText = "raw assistant text marker";
  const rawSessionId = "raw-session-id-opaque-marker";
  const summary = summarizeJsonLines(
    [
      JSON.stringify({
        type: "system",
        subtype: "init",
        session_id: rawSessionId,
      }),
      JSON.stringify({
        type: "assistant",
        message: {
          role: "assistant",
          content: [{ type: "text", text: rawText }],
        },
      }),
      JSON.stringify({ type: "result", subtype: "success", result: rawText }),
    ].join("\n"),
  );
  assert.deepEqual(summary.eventOrder, [
    "system:init",
    "assistant",
    "result:success",
  ]);
  assertSanitized(summary, [rawText, rawSessionId]);
});

test("fake endpoint supports reachability and one Messages stream", async () => {
  const server = await startFakeAnthropicServer({
    responder: createTextResponder(),
  });
  try {
    const head = await fetch(`${server.baseUrl}/`, { method: "HEAD" });
    assert.equal(head.status, 200);
    const response = await fetch(`${server.baseUrl}/v1/messages`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": DUMMY_API_KEY,
      },
      body: JSON.stringify({
        model: "probe-model",
        stream: true,
        messages: [{ role: "user", content: "raw local prompt" }],
      }),
    });
    assert.equal(response.status, 200);
    assert.match(await response.text(), /event: message_stop/);
    assert.deepEqual(
      server.requests.map((request) => `${request.method} ${request.pathname}`),
      ["HEAD /", "POST /v1/messages"],
    );
    assertSanitized(server.requests, [DUMMY_API_KEY, "raw local prompt"]);
  } finally {
    await server.close();
  }
});

test("tool fixture emits a structural tool-use stream", () => {
  const events = toolUseEvents(0, {
    id: "toolu_test",
    name: "Read",
    input: { file_path: "/temporary/path" },
  });
  assert.deepEqual(
    events.map((event) => event.event),
    [
      "message_start",
      "content_block_start",
      "content_block_delta",
      "content_block_stop",
      "message_delta",
      "message_stop",
    ],
  );
});

test("probe environment is allowlisted and sandbox policy is loopback-only", async () => {
  const workspace = await createIsolatedWorkspace("environment-test");
  try {
    const environment = buildProbeEnvironment(workspace, "http://127.0.0.1:1");
    assert.equal(environment.ANTHROPIC_API_KEY, DUMMY_API_KEY);
    assert.equal(environment.AWS_SECRET_ACCESS_KEY, undefined);
    assert.equal(environment.GITHUB_TOKEN, undefined);
    assert.match(LOOPBACK_SANDBOX_PROFILE, /deny network-outbound/);
    assert.match(LOOPBACK_SANDBOX_PROFILE, /localhost:\*/);
    const argumentsList = commonClaudeArguments({
      sessionId: "00000000-0000-4000-8000-000000000003",
      persist: false,
      tools: [],
    });
    assert.ok(argumentsList.includes("--no-session-persistence"));
    assert.ok(argumentsList.includes("--safe-mode"));
    assert.ok(argumentsList.includes("--bare"));
  } finally {
    await removeWorkspace(workspace);
  }
});

test("filesystem diff publishes only relative metadata", async () => {
  const workspace = await createIsolatedWorkspace("tree-test");
  try {
    const before = await summarizeTree(workspace.root);
    const transcriptDirectory = path.join(
      workspace.home,
      ".claude/projects/encoded-private-temp-project",
    );
    await mkdir(transcriptDirectory, { recursive: true });
    await writeFile(
      path.join(
        transcriptDirectory,
        "00000000-0000-4000-8000-000000000004.jsonl",
      ),
      `${JSON.stringify({ type: "user", message: { role: "user", content: "raw" } })}\n`,
    );
    const after = await summarizeTree(workspace.root);
    const difference = diffTrees(before, after);
    assert.equal(difference.created.length, 1);
    assert.equal(
      difference.created[0].path,
      "home/.claude/projects/$PROJECT_KEY/$UUID.jsonl",
    );
    assertSanitized(before, [workspace.root]);
    assertSanitized(difference, [
      workspace.root,
      "encoded-private-temp-project",
      "raw",
    ]);
  } finally {
    await removeWorkspace(workspace);
  }
});
