#!/usr/bin/env node

import assert from "node:assert/strict";

import { summarizeAnthropicRequest } from "./sanitize-request.mjs";

const secret = "fixture-secret-that-must-not-survive";
const prompt = "fixture prompt that must only become a digest";
const summary = summarizeAnthropicRequest({
  method: "POST",
  url: "/v1/messages?beta=true",
  headers: {
    "content-type": "application/json",
    "user-agent": "fixture-agent/1.0",
    "x-api-key": secret,
  },
  body: {
    model: "fixture-model",
    system: [{ type: "text", text: prompt }],
    messages: [{ role: "user", content: [{ type: "text", text: prompt }] }],
    tools: [
      {
        name: "FixtureTool",
        description: prompt,
        input_schema: { type: "object", properties: { value: { type: "string" } } },
      },
    ],
  },
});

const encoded = JSON.stringify(summary);
assert(!encoded.includes(secret));
assert(!encoded.includes(prompt));
assert.equal(summary.credentials.apiKeyPresent, true);
assert.equal(summary.body.system[0].text.bytes, Buffer.byteLength(prompt));
assert.equal(summary.body.messages[0].content[0].text.bytes, Buffer.byteLength(prompt));
assert.equal(summary.body.tools[0].name, "FixtureTool");
assert.deepEqual(summary.body.tools[0].inputSchema.keys, ["properties", "type"]);

console.log("dynamic sanitizer: raw content and credentials removed");
