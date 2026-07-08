#!/usr/bin/env node

import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, extname, resolve, sep } from "node:path";

const root = resolve(new URL("..", import.meta.url).pathname);
const markdownFiles = [];

function collect(directory) {
  for (const name of readdirSync(directory).sort()) {
    if ([".git", ".work", "node_modules", "site"].includes(name)) continue;
    const path = resolve(directory, name);
    const stat = statSync(path);
    if (stat.isDirectory()) collect(path);
    else if (extname(path) === ".md") markdownFiles.push(path);
  }
}

function localTarget(source, rawTarget) {
  const target = rawTarget.replace(/^<|>$/gu, "").split("#", 1)[0].split("?", 1)[0];
  if (!target || target.startsWith("#") || target.startsWith("mailto:")) return null;

  const repositoryMatch = target.match(
    /^https:\/\/github\.com\/swyxio\/claude-code-internals\/(?:blob|tree)\/[^/]+\/(.+)$/u,
  );
  if (repositoryMatch) return resolve(root, decodeURIComponent(repositoryMatch[1]));

  const pagesMatch = target.match(
    /^https:\/\/swyxio\.github\.io\/claude-code-internals\/(.*)$/u,
  );
  if (pagesMatch) {
    const page = decodeURIComponent(pagesMatch[1]).replace(/\/$/u, "");
    return resolve(root, "docs", page ? `${page}.md` : "index.md");
  }

  if (/^[a-z][a-z0-9+.-]*:/iu.test(target)) return null;
  return resolve(dirname(source), decodeURIComponent(target));
}

const markdownLink = /!?\[[^\]]*\]\((<[^>]+>|[^\s)]+)(?:\s+['"][^'"]*['"])?\)/gu;
const failures = [];
collect(root);

for (const source of markdownFiles) {
  const markdown = readFileSync(source, "utf8").replace(/```[\s\S]*?```/gu, "");
  for (const match of markdown.matchAll(markdownLink)) {
    const target = localTarget(source, match[1]);
    if (!target) continue;
    assert(target === root || target.startsWith(`${root}${sep}`), `link escapes repository: ${match[1]}`);
    if (!existsSync(target)) {
      failures.push(`${source.slice(root.length + 1)} -> ${match[1]}`);
    }
  }
}

assert.deepEqual(failures, [], `broken local or repository links:\n${failures.join("\n")}`);
console.log(`links: ${markdownFiles.length} Markdown files checked`);
