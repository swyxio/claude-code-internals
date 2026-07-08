# Snapshot 2.1.177

This page is the immutable identity card for the artifact examined throughout the atlas. “Current” elsewhere means current **for this snapshot**, not the latest Claude Code release.

## Artifact identity

| Field | Captured value |
|---|---|
| Version output | `2.1.177 (Claude Code)` |
| Platform | `darwin-arm64` |
| Active launcher | `$HOME/.local/bin/claude` |
| Resolved executable | `$HOME/.local/share/claude/versions/2.1.177` |
| Size | `225,124,512` bytes |
| SHA-256 | `eb0730351be2f02b482b1855870f5877489085aac86b0c4c1db4e458d9e40ed9` |
| Embedded build time | `2026-06-13T00:21:57Z` |
| Embedded source revision | `6fae7a072b111776fc95ca221caac31b7439eb25` |
| Manifest checksum | Matched at capture time |

<div class="evidence-note"><strong>Observed.</strong> Source: <a href="https://github.com/swyxio/claude-code-internals/blob/main/evidence/provenance.json">provenance.json</a> and anchor <code>build.git-sha</code>.</div>

The installer reported `2.1.204` as latest at capture time, so `2.1.177` should not be described as the then-latest release. It is the active installed version selected by the local symlink.

## Signature and runtime posture

| Field | Value |
|---|---|
| Signing identifier | `com.anthropic.claude-code` |
| Authority | `Developer ID Application: Anthropic PBC (Q6L2SF6YDW)` |
| Team identifier | `Q6L2SF6YDW` |
| Signature timestamp | `2026-06-13T00:36:16Z` |
| Hardened runtime | Enabled |
| CDHash | `ea540922bb06b7d72b79ecba72c90c5ce74b82ea` |

<span class="evidence-label observed">Observed</span> The signed entitlement list contains JIT, unsigned executable memory, disabled library validation, and audio input.

<span class="evidence-label derived">Derived</span> These are runtime capabilities and review surfaces, not findings of vulnerability by themselves. They define which code-signing and runtime assumptions a threat model may not make.

## Bun graph

The `__BUN,__bun` section begins at file offset `72,368,128` and occupies `150,764,738` bytes. Its payload hash is `33523ba32a3854633cd877c9261525c3436bcba4723c038178aaf54f6343bd84`. The graph contains 11 modules.

| Module class | Count | Role |
|---|---:|---|
| Main JavaScript/CJS entry | 1 | CLI and application bundle at `/$bunfs/root/src/entrypoints/cli.js` |
| JavaScript/CJS binding loaders | 5 | Load image, audio, URL, and computer-use N-API modules |
| N-API native modules | 5 | Platform-native implementations |

The main text module begins at file offset `201,487,816`, is `17,038,096` bytes long, and hashes to `45cb1eaa2b7e274ce87b1df0a1729f017ac06fffe782fac8acb42ab186243573`. Its paired bytecode region is `129,119,488` bytes. No source map is recorded in the module table.

<div class="evidence-note"><strong>Observed.</strong> Complete offsets, sizes, loaders, formats, and hashes are in <a href="https://github.com/swyxio/claude-code-internals/blob/main/evidence/binary-inventory.json">binary-inventory.json</a>. The content itself is intentionally not committed.</div>

## Installation provenance

The captured installer at `https://claude.ai/install.sh` hashed to `b3f79015b54c751440a6488f07b1b64f9088742b9052bc1bd356d13108320d2a`. Its observed flow was: detect operating system and architecture, retrieve a release manifest and staging executable, verify SHA-256, invoke the staging executable’s `install` command, and remove the staging file.

<span class="evidence-label derived">Derived</span> The resulting directory of immutable version-named executables plus a movable launcher symlink supports atomic activation and retention of older local builds. It does not, on its own, prove rollback behavior or the policy for pruning old versions.

## Reproduction boundary

All pages in this site that cite a bundle anchor are scoped to the binary SHA-256 above. A matching version string with a different artifact digest must be treated as a different snapshot until the discrepancy is explained.
