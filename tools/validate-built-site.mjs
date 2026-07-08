#!/usr/bin/env node

import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, extname, relative, resolve } from "node:path";

const root = resolve(new URL("..", import.meta.url).pathname);
const siteRoot = resolve(root, "site");

function collect(directory, extension) {
  const found = [];
  for (const name of readdirSync(directory).sort()) {
    const path = resolve(directory, name);
    if (statSync(path).isDirectory()) found.push(...collect(path, extension));
    else if (extname(path) === extension) found.push(path);
  }
  return found;
}

assert(existsSync(resolve(siteRoot, "index.html")), "site/index.html is missing; build MkDocs first");
const htmlFiles = collect(siteRoot, ".html");
const failures = [];
let mermaidTitleCount = 0;
let mermaidDescriptionCount = 0;
let mermaidRuntimePageCount = 0;

function resolveTarget(source, rawTarget) {
  const target = rawTarget.split(/[?#]/u, 1)[0];
  if (!target || /^(?:[a-z][a-z0-9+.-]*:|#)/iu.test(target)) return null;
  if (target.startsWith("/claude-code-internals/")) {
    return resolve(siteRoot, decodeURIComponent(target.slice("/claude-code-internals/".length)));
  }
  if (target.startsWith("/")) return null;
  return resolve(dirname(source), decodeURIComponent(target));
}

for (const source of htmlFiles) {
  const html = readFileSync(source, "utf8");
  assert(/<title>[^<]+<\/title>/u.test(html), `${relative(root, source)} has no title`);
  mermaidTitleCount += (html.match(/accTitle:/gu) || []).length;
  mermaidDescriptionCount += (html.match(/accDescr:/gu) || []).length;
  const hasDiagram = html.includes("accTitle:");
  const hasMermaidRuntime = html.includes("assets/vendor/mermaid-11.16.0.min.js");
  assert.equal(
    hasMermaidRuntime,
    hasDiagram,
    `${relative(root, source)} has the wrong conditional Mermaid runtime state`,
  );
  if (hasMermaidRuntime) mermaidRuntimePageCount += 1;

  for (const match of html.matchAll(/\b(?:href|src)="([^"]+)"/gu)) {
    const rawTarget = match[1];
    const target = resolveTarget(source, rawTarget);
    if (!target) continue;
    if (/\.md(?:$|[?#])/u.test(rawTarget)) {
      failures.push(`${relative(root, source)} retains source URL ${rawTarget}`);
      continue;
    }
    const candidate = rawTarget.split(/[?#]/u, 1)[0].endsWith("/") ? resolve(target, "index.html") : target;
    if (!existsSync(candidate)) failures.push(`${relative(root, source)} -> ${rawTarget}`);
  }
}

const home = readFileSync(resolve(siteRoot, "index.html"), "utf8");
assert(home.includes('class="atlas-hero"'), "built homepage is missing the artifact hero");
assert(home.includes("Artifact address strip"), "built homepage is missing the artifact address strip");
assert(home.includes('class="md-tabs"'), "built homepage is missing intent navigation tabs");
assert(mermaidTitleCount > 0, "built site has no accessible Mermaid titles");
assert.equal(mermaidTitleCount, mermaidDescriptionCount, "Mermaid titles and descriptions must remain paired");
assert(mermaidRuntimePageCount > 0, "built site has no diagram runtime pages");

assert.deepEqual(failures, [], `built site contains broken local links or assets:\n${failures.join("\n")}`);
console.log(`built site: ${htmlFiles.length} HTML pages, ${mermaidTitleCount} named diagrams, and local assets validated`);
