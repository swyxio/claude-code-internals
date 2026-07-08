#!/usr/bin/env node

import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, extname, relative, resolve } from "node:path";

const root = resolve(new URL("..", import.meta.url).pathname);
const docsRoot = resolve(root, "docs");
const config = readFileSync(resolve(root, "mkdocs.yml"), "utf8");
const topology = JSON.parse(readFileSync(resolve(root, "evidence/binary-topology.json"), "utf8"));
const home = readFileSync(resolve(docsRoot, "index.md"), "utf8");

function collect(directory, extension) {
  const found = [];
  for (const name of readdirSync(directory).sort()) {
    const path = resolve(directory, name);
    if (statSync(path).isDirectory()) found.push(...collect(path, extension));
    else if (extname(path) === extension) found.push(path);
  }
  return found;
}

const stylesheetPaths = ["tokens.css", "layout.css", "content.css", "home.css"].map((name) =>
  resolve(docsRoot, "stylesheets", name),
);
const scriptPaths = ["site-ui.js"].map((name) =>
  resolve(docsRoot, "javascripts", name),
);
const fontAssetPaths = [
  "barlow-condensed-latin-600-normal.woff2",
  "barlow-condensed-latin-700-normal.woff2",
  "atkinson-hyperlegible-latin-400-normal.woff2",
  "atkinson-hyperlegible-latin-700-normal.woff2",
  "fragment-mono-latin-400-normal.woff2",
  "barlow-condensed-OFL.txt",
  "atkinson-hyperlegible-OFL.txt",
  "fragment-mono-OFL.txt",
].map((name) => resolve(docsRoot, "assets/fonts", name));
const vendorAssetPaths = ["mermaid-11.16.0.min.js", "mermaid-LICENSE.txt"].map((name) =>
  resolve(docsRoot, "assets/vendor", name),
);

for (const path of [
  ...stylesheetPaths,
  ...scriptPaths,
  ...fontAssetPaths,
  ...vendorAssetPaths,
  resolve(docsRoot, "assets/atlas-mark.svg"),
]) {
  assert(existsSync(path), `missing presentation asset: ${relative(root, path)}`);
}

for (const path of stylesheetPaths) {
  const css = readFileSync(path, "utf8");
  const lines = css.split("\n").length;
  assert(lines <= 500, `${relative(root, path)} exceeds the 500-line maintainability limit`);
  assert.equal((css.match(/\{/gu) || []).length, (css.match(/\}/gu) || []).length, `${path} has unbalanced braces`);
  assert(config.includes(relative(docsRoot, path)), `${relative(root, path)} is not declared in mkdocs.yml`);
}

for (const path of scriptPaths) {
  assert(config.includes(relative(docsRoot, path)), `${relative(root, path)} is not declared in mkdocs.yml`);
}

assert(config.includes("font: false"), "remote Material fonts must remain disabled");
assert(config.includes("navigation.tabs"), "intent navigation tabs are required");
assert(config.includes("navigation.path"), "deep pages require breadcrumbs");
assert(config.includes("navigation.footer"), "deep pages require previous/next navigation");

const tokenStyles = readFileSync(resolve(docsRoot, "stylesheets/tokens.css"), "utf8");
for (const path of fontAssetPaths.filter((path) => extname(path) === ".woff2")) {
  assert(tokenStyles.includes(relative(resolve(docsRoot, "stylesheets"), path)), `${relative(root, path)} has no @font-face rule`);
}

const navDocs = [...config.matchAll(/:\s+([^\s]+\.md)\s*$/gmu)].map((match) => match[1]);
const duplicateNavDocs = navDocs.filter((path, index) => navDocs.indexOf(path) !== index);
assert.deepEqual(duplicateNavDocs, [], "documentation pages must appear only once in navigation");

const allDocs = collect(docsRoot, ".md").map((path) => relative(docsRoot, path));
assert.deepEqual([...navDocs].sort(), [...allDocs].sort(), "every documentation page must be represented in navigation");

let mermaidDiagramCount = 0;
for (const path of allDocs) {
  const markdown = readFileSync(resolve(docsRoot, path), "utf8");
  for (const match of markdown.matchAll(/```mermaid\n([\s\S]*?)```/gu)) {
    mermaidDiagramCount += 1;
    assert(/^\s*accTitle:\s+\S.+$/mu.test(match[1]), `${path} has a Mermaid diagram without accTitle`);
    assert(/^\s*accDescr:\s+\S.+$/mu.test(match[1]), `${path} has a Mermaid diagram without accDescr`);
  }
}
assert(mermaidDiagramCount > 0, "no Mermaid diagrams were found");

const template = readFileSync(resolve(root, "overrides/main.html"), "utf8");
assert(template.includes("page.content"), "Mermaid must only preload on pages that contain diagrams");
assert(template.includes("mermaid-11.16.0.min.js"), "Mermaid must remain version-pinned");
const mermaidIntegrity = `sha384-${createHash("sha384")
  .update(readFileSync(resolve(docsRoot, "assets/vendor/mermaid-11.16.0.min.js")))
  .digest("base64")}`;
assert(template.includes(`integrity="${mermaidIntegrity}"`), "Mermaid integrity must match the vendored runtime");
assert(
  template.indexOf("mermaid-11.16.0") <
    template.indexOf("{{ super() }}", template.indexOf("{% block scripts %}")),
  "Mermaid must load before Material's renderer",
);
const siteUi = readFileSync(resolve(docsRoot, "javascripts/site-ui.js"), "utf8");
assert(siteUi.includes("wrapper.scrollWidth > wrapper.clientWidth"), "table regions must be conditional on overflow");
assert(!siteUi.includes('aria-label", "Scrollable data table"'), "table regions need heading-specific labels");

const expectedArtifactValues = [
  topology.subject.version,
  topology.subject.platform,
  topology.subject.binarySize.toLocaleString("en-US"),
  topology.fileLayout.bunSection.size.toLocaleString("en-US"),
  topology.graph.moduleCount.toString(),
  topology.subject.artifactSha256.slice(0, 8),
  topology.subject.artifactSha256.slice(-6),
];
for (const value of expectedArtifactValues) {
  assert(home.includes(value), `homepage artifact strip is missing topology value: ${value}`);
}

const rawHtmlLinks = allDocs.flatMap((path) => {
  const source = resolve(docsRoot, path);
  const markdown = readFileSync(source, "utf8");
  return [...markdown.matchAll(/<a\b[^>]*\bhref="([^"]+)"/gu)].map((match) => ({ source, target: match[1] }));
});

for (const { source, target } of rawHtmlLinks) {
  if (/^(?:[a-z][a-z0-9+.-]*:|#)/iu.test(target)) continue;
  assert(!target.endsWith(".md"), `raw HTML link bypasses MkDocs URL rewriting: ${relative(root, source)} -> ${target}`);
  const clean = decodeURIComponent(target.split(/[?#]/u, 1)[0]).replace(/\/$/u, "");
  const stem = resolve(dirname(source), clean);
  const candidates = [`${stem}.md`, resolve(stem, "index.md")];
  assert(candidates.some(existsSync), `broken raw HTML link: ${relative(root, source)} -> ${target}`);
}

console.log(
  `presentation: ${allDocs.length} nav pages, ${mermaidDiagramCount} named diagrams, ${stylesheetPaths.length} focused stylesheets, and grounded artifact strip validated`,
);
