# Evidence and claim ledger

This directory records reproducible facts and carefully scoped interpretations for one inspected artifact: Claude Code 2.1.177 with SHA-256 `eb0730351be2f02b482b1855870f5877489085aac86b0c4c1db4e458d9e40ed9`.

The ledger is intentionally version-bound. At capture time, the installer's latest-release pointer was already 2.1.204, so none of these claims should be generalized to newer Claude Code builds without repeating the inspection and changing the subject hash.

## Evidence layers

- `provenance.json` records launcher resolution, release identity, manifest comparison, signing metadata, build identifiers, and installer behavior.
- `binary-inventory.json` records the Mach-O Bun container, standalone module graph, byte ranges, content hashes, loaders, formats, and native-module boundaries.
- `anchors.json` records short exact strings, stable anchor IDs, occurrence counts, and byte offsets in the hash-bound entry module.
- `claims.ndjson` turns those records into reviewable observed facts, derived interpretations, and explicitly labeled hypotheses.

No recovered application source or embedded native executable belongs in this evidence directory. The committed evidence is metadata, hashes, byte coordinates, short anchors, and behavioral claims. Repository hygiene checks enforce that boundary.

## Claim record format

Each line of `claims.ndjson` is an independent JSON object:

| Field | Meaning |
| --- | --- |
| `id` | Stable, human-readable claim identifier. |
| `claim` | One falsifiable statement. |
| `basis` | Epistemic class: `observed`, `derived`, or `hypothesis`. |
| `confidence` | Number from 0 to 1 for this artifact and evidence set. |
| `subject.version` | Claude Code version inspected. |
| `subject.artifactSha256` | Exact executable to which the claim applies. |
| `evidence` | One or more references to a committed evidence file. |
| `limits` | Optional boundary that prevents over-reading the claim. |

Evidence references use RFC 6901-style JSON pointers when a structured field is the source:

```json
{"file":"evidence/binary-inventory.json","pointer":"/modules/0"}
```

Behavioral anchors are referenced by their stable ID rather than by array index:

```json
{"file":"evidence/anchors.json","anchorId":"sandbox.fail-closed"}
```

## Epistemic classes

- `observed`: directly measured or recorded, such as a hash, size, signature identity, byte offset, module count, or exact string occurrence.
- `derived`: a constrained interpretation of observed records, such as pairing same-named JavaScript and N-API modules or explaining what a policy control does. Derived claims should remain falsifiable and avoid implying runtime defaults.
- `hypothesis`: a plausible architectural explanation that needs additional runtime tracing, upstream source, or another artifact to prove. A hypothesis must include a `limits` note.

Confidence is not a security score. It represents how strongly the cited evidence supports the exact wording. A high-confidence claim that a control exists does not mean the control is enabled by default, configured correctly, or sufficient against every threat.

## Review rules

1. Bind every claim to both version and artifact SHA-256.
2. Give every observed or derived claim at least one committed evidence reference.
3. Reference anchors by `anchorId`; an anchor is usable only when its `occurrenceCount` is greater than zero.
4. Keep facts about presence separate from claims about defaults or runtime activation. Provider paths, sandbox options, telemetry controls, and extension mechanisms may exist without being active.
5. Keep outer code signing separate from application-layer sandboxing. JIT, unsigned-executable-memory, and disabled-library-validation entitlements are material security context; they are neither proof of compromise nor proof of sandbox confinement.
6. Treat reconstructed formatting, names, and source-file splits as reconstructions. This artifact has no embedded source maps.
7. Add a hypothesis rather than upgrading an inference when runtime behavior has not been exercised in an isolated test environment.

Useful queries:

```sh
jq -s 'group_by(.basis) | map({basis: .[0].basis, count: length})' evidence/claims.ndjson
jq -s '.[] | select(.basis == "hypothesis")' evidence/claims.ndjson
jq -s '.[] | select(any(.evidence[]; .anchorId == "sandbox.fail-closed"))' evidence/claims.ndjson
```

Run the repository checks after changing evidence:

```sh
npm run check
```
