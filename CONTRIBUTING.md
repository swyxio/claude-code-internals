# Contributing

Contributions should improve the independently written model or its evidence
links without turning this repository into a source dump.

## Accepted contributions

- new version inventories containing hashes, offsets, and short anchors;
- corrections backed by a reproducible read-only command;
- independently written contracts, state machines, diagrams, and pseudocode;
- cross-version diffs that distinguish observed changes from inference; and
- security hardening analysis that does not disclose an uncoordinated exploit.

## Do not submit

- Claude Code binaries, native add-ons, bytecode, or recovered bundles;
- copied decompiled/disassembled function bodies or substantial proprietary
  source excerpts;
- leaked or confidential Anthropic material;
- API keys, OAuth tokens, keychain contents, user configuration, transcripts,
  debug logs, or customer data; or
- vulnerability details before coordinated disclosure permits publication.

## Evidence requirements

Use an existing ID from `evidence/anchor-spec.json` or add a narrowly scoped
anchor and regenerate `evidence/anchors.json`. Label the claim `observed`,
`derived`, or `hypothesis`. Avoid claiming that the presence of a string proves
that a code path is reachable or publicly supported.

Run:

```bash
npm run validate
python -m mkdocs build --strict
```

If you have the exact local fixture, also run `npm run check`.
