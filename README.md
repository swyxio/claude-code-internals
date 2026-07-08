# Claude Code Internals

An evidence-linked, independently written reconstruction of Claude Code's native
CLI architecture. The project combines static inspection with isolated dynamic
probes of the official macOS arm64 executable installed by
`https://claude.ai/install.sh`.

**Snapshot:** Claude Code `2.1.177`, build
`6fae7a072b111776fc95ca221caac31b7439eb25`, SHA-256
`eb0730351be2f02b482b1855870f5877489085aac86b0c4c1db4e458d9e40ed9`.

**Wiki:** <https://swyxio.github.io/claude-code-internals/>

> This is an independent research project. It is not affiliated with,
> sponsored by, or endorsed by Anthropic. “Claude” and “Claude Code” are
> trademarks of Anthropic. The repository does not distribute Anthropic's
> executable, embedded native libraries, or recovered application bundle.

## What is here

- [`reconstructed/`](reconstructed/) — readable TypeScript-shaped contracts,
  state machines, and control-flow pseudocode. It is designed for browsing and
  may not compile.
- [`evidence/`](evidence/) — artifact provenance, the complete Bun module
  inventory, CLI help captures, sanitized dynamic reports, and a
  machine-readable anchor/claim ledger.
- [`tools/probes/`](tools/probes/) — loopback provider fixtures and isolated
  behavioral probes that never retain raw prompts or credentials.
- [`tools/inspect-binary.mjs`](tools/inspect-binary.mjs) — a dependency-free,
  read-only parser for the `__BUN,__bun` module graph in this exact Mach-O
  packaging format.
- [`docs/`](docs/) — the detailed GitHub Pages wiki, with architecture,
  extensibility, and security analysis.

The terminal UI is intentionally not reconstructed except where a presentation
boundary affects the underlying protocol or state machine.

## Verified artifact layout

The local launcher resolves as follows:

```text
~/.local/bin/claude
  -> ~/.local/share/claude/versions/2.1.177
     Mach-O arm64, 225,124,512 bytes
     __BUN,__bun @ 72,368,128, 150,764,738 bytes
```

The Bun standalone graph has eleven entries:

- one minified CommonJS entry bundle (`17,038,096` bytes);
- one JavaScriptCore bytecode cache (`129,119,488` bytes);
- five small JavaScript native-loader shims; and
- five native add-ons for image processing, audio capture, URL handling, and
  computer-use capture/input.

There is no source map. Semantic file boundaries in `reconstructed/` are
therefore independently chosen for readability and explicitly labeled as
reconstructions. See the [binary inventory](evidence/binary-inventory.json) and
[methodology](docs/evidence/methodology.md).

## Reproduce the inspection

Requirements: Node.js 18+ and the installed native `claude` binary.

```bash
npm run inspect -- ~/.local/bin/claude
npm run extract -- ~/.local/bin/claude --out .work/extracted
npm run anchors -- ~/.local/bin/claude --out .work/anchors.json
npm run check
```

`extract` requires a new or empty output directory and writes only to the
ignored `.work/` tree unless told otherwise. Do not commit the output. The
public evidence records content hashes and byte offsets so a lawful local copy
can be checked without republishing it.

## Evidence model

Every substantive claim is classified as:

- **Observed** — directly encoded in the executable, its signature, its module
  graph, or read-only CLI output.
- **Derived** — follows from multiple observed facts or reconstructed control
  flow.
- **Hypothesis** — plausible but not confirmed by this snapshot.

The reconstruction references stable IDs from
[`evidence/anchor-spec.json`](evidence/anchor-spec.json). Generated locations in
[`evidence/anchors.json`](evidence/anchors.json) map each short string to both a
module-relative and executable file offset.

## Publication boundary

This repository deliberately excludes:

- the Claude Code executable and embedded `.node` files;
- the recovered 17 MB minified application bundle or beautified copies;
- long decompiled or disassembled function bodies;
- credentials, keychain data, configuration, transcripts, and debug logs; and
- exploit details that should go through coordinated disclosure.

The executable itself carries an all-rights-reserved header. Anthropic's
[Commercial Terms](https://www.anthropic.com/legal/commercial-terms),
[Consumer Terms](https://www.anthropic.com/legal/consumer-terms), and
[Claude Code legal page](https://code.claude.com/docs/en/legal-and-compliance)
may constrain reverse engineering or redistribution. Obtain appropriate
permission or legal advice before going beyond the narrow research and
interoperability boundary used here.

## Status

The snapshot is version-specific. The installer release pointer was `2.1.204`
when this evidence was captured on 2026-07-08, while the active local symlink
was still `2.1.177`. Claims should not be projected onto another version
without rerunning the inventory and anchor checks.

Original documentation and tooling in this repository are MIT-licensed; see
[`NOTICE.md`](NOTICE.md) for exclusions.
