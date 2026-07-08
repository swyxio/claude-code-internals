---
format: 1920x1080
mode: collaborative
message: "A compiled agent can be understood without pretending to recover its source, if every claim is pinned to an artifact, an observation, or a bounded inference."
arc: "concept-explainer with a seven-lens forensic process"
audience: "AI-agent developers, extension authors, security reviewers, and technically curious operators"
destination: "YouTube and website embed"
target_duration: "9m46s"
chapters: "Start · Runtime · Extensions · Security · Observations · Evidence · Reference"
---

## Frame 1 — One artifact

- scene: Four hard-cut specimen facts occupy the whole field, then collapse into one signed executable silhouette.
- voiceover: "One signed executable. Two hundred twenty-five million bytes. Eleven embedded modules. No source map."
- duration: 8s
- poster: 6s
- transition_in: cut
- status: outline
- src: compositions/frames/01-one-artifact.html
- type: hook
- persuasion: Shocking statistic + progressive disclosure
- beat: surprise + intrigue
- blueprint: kinetic-type-beats
- chapter: master-open
- evidence: OBSERVED
- source: https://github.com/swyxio/claude-code-internals/blob/main/docs/snapshot-2.1.177.md

narrativeRole: Opens a cognitive gap with the scale and opacity of the specimen.

keyMessage: A single compiled artifact contains enough structure to investigate, but not a convenient source tree.

## Frame 2 — The rule

- scene: A scan bar separates RECOVER SOURCE from UNDERSTAND SYSTEM; the first fractures while the second resolves into three evidence lanes.
- voiceover: "This is not a source-recovery story. It is a method for understanding a compiled agent—without quietly turning clues into facts."
- duration: 10s
- poster: 8s
- transition_in: push-slide LEFT
- status: outline
- src: compositions/frames/02-the-rule.html
- type: product_intro
- persuasion: Common-belief vs reality
- beat: skepticism → clarity
- blueprint: comparison-split
- chapter: master-open
- evidence: DERIVED
- source: https://github.com/swyxio/claude-code-internals/blob/main/docs/scope-and-method.md

narrativeRole: States the thesis by contrasting legitimate reconstruction with counterfeit certainty.

keyMessage: The project explains behavior while preserving the line between evidence and source recovery.

## Frame 3 — Seven lenses

- scene: One oversized forensic canvas pans across seven numbered stations connected to the same specimen strip.
- voiceover: "Seven lenses—start, runtime, extensions, security, observations, evidence, and reference—tie every claim to an address, a trace, or an inference."
- duration: 10s
- poster: 8s
- transition_in: zoom-through
- status: outline
- src: compositions/frames/03-seven-lenses.html
- type: benefit_highlight
- persuasion: Frame-then-fill + rule of seven
- beat: orientation + anticipation
- blueprint: spatial-pan-stations
- chapter: master-open
- evidence: DERIVED
- source: https://github.com/swyxio/claude-code-internals/blob/main/mkdocs.yml

narrativeRole: Gives viewers a durable map before the detailed chapters begin.

keyMessage: The atlas is a connected investigation, not seven unrelated documentation buckets.

## Frame 4 — Start

- scene: Orange chapter broadside: catalogue 01, oversized lowercase start, specimen strip, four-beat scan stinger.
- voiceover: ""
- duration: 4s
- poster: 2s
- transition_in: cut
- status: outline
- src: compositions/frames/04-start-card.html
- type: product_intro
- persuasion: Signposting
- beat: focus
- blueprint: kinetic-type-beats
- chapter: start
- evidence: N/A
- source: https://github.com/swyxio/claude-code-internals/blob/main/docs/index.md

narrativeRole: Opens the independently renderable Start chapter and resets the visual rhythm.

keyMessage: First establish what was inspected and what may honestly be said about it.

## Frame 5 — Freeze the specimen

- scene: A specimen plate locks version, platform, byte size, short hash, capture date, and version drift around a proportional binary strip.
- voiceover: "Freeze the specimen first: Claude Code 2.1.177, macOS arm64, 225,124,512 bytes, SHA ending e40ed9. The installer already called 2.1.204 latest."
- duration: 15s
- poster: 12s
- transition_in: push-slide LEFT
- status: outline
- src: compositions/frames/05-freeze-specimen.html
- type: social_proof
- persuasion: Worked example with real numbers
- beat: confidence + caution
- blueprint: dataviz-countup
- chapter: start
- evidence: OBSERVED
- source: https://github.com/swyxio/claude-code-internals/blob/main/evidence/provenance.json

narrativeRole: Makes version pinning tangible and blocks silent generalization to newer releases.

keyMessage: Every later statement is about one exact digest, not Claude Code in the abstract.

## Frame 6 — The forensic pipeline

- scene: The same artifact moves through seven stations: launcher, hash, signature, Mach-O, Bun graph, anchors, and loopback probes.
- voiceover: "Then follow a reproducible pipeline: launcher, hash, signature, Mach-O container, Bun graph, static anchors, then isolated loopback probes. Each stage narrows a different uncertainty."
- duration: 16s
- poster: 13s
- transition_in: push-slide LEFT
- status: outline
- src: compositions/frames/06-forensic-pipeline.html
- type: feature_showcase
- persuasion: Causal chain + signposting
- beat: comprehension + momentum
- blueprint: spatial-pan-stations
- chapter: start
- evidence: OBSERVED + DERIVED
- source: https://github.com/swyxio/claude-code-internals/blob/main/docs/evidence/methodology.md

narrativeRole: Teaches the inspection sequence and why no single technique carries the whole conclusion.

keyMessage: Identity, structure, anchors, and runtime behavior answer different questions.

## Frame 7 — Three evidence lanes

- scene: A 32/52/1 stat grid assembles above three unequal but clearly labeled tracks: observed, derived, hypothesis.
- voiceover: "The ledger keeps three lanes separate: thirty-two observed facts, fifty-two bounded derivations, and one explicit hypothesis. Observation is not interpretation; interpretation is not certainty."
- duration: 15s
- poster: 12s
- transition_in: push-slide LEFT
- status: outline
- src: compositions/frames/07-three-evidence-lanes.html
- type: social_proof
- persuasion: Statistical proof + comparison
- beat: clarity + trust
- blueprint: dataviz-countup
- chapter: start
- evidence: OBSERVED
- source: https://github.com/swyxio/claude-code-internals/blob/main/evidence/claims.ndjson

narrativeRole: Establishes the epistemic legend used in every later chapter.

keyMessage: The atlas records not only what it claims, but what kind of claim each statement is.

## Frame 8 — Publication air gap

- scene: A split conveyor sends maps, sanitized traces, claims, and contracts to PUBLIC while executable bytes, credentials, and transcripts hit a hard stop.
- voiceover: "There is an air gap around publication. Maps, sanitized traces, claims, and independent contracts go out. Executables, recovered code, credentials, transcripts, and private debug data do not."
- duration: 16s
- poster: 13s
- transition_in: push-slide LEFT
- status: outline
- src: compositions/frames/08-publication-air-gap.html
- type: feature_showcase
- persuasion: Comparison of two options
- beat: resolve + assurance
- blueprint: comparison-split
- chapter: start
- evidence: OBSERVED POLICY
- source: https://github.com/swyxio/claude-code-internals/blob/main/docs/legal-and-ethics.md

narrativeRole: Shows that browsability and restraint are designed together.

keyMessage: A useful technical atlas does not require publishing proprietary artifacts or private data.

## Frame 9 — Browsable truth

- scene: The pipeline compresses into a linked claim card with three exit routes: inspect, falsify, extend.
- voiceover: "The payoff is browsable truth: strong enough to inspect, narrow enough to falsify, and honest about what remains unknown."
- duration: 10s
- poster: 7s
- transition_in: zoom-through
- status: outline
- src: compositions/frames/09-browsable-truth.html
- type: benefit_highlight
- persuasion: Distillation
- beat: satisfaction + resolve
- blueprint: titlecard-reveal
- chapter: start
- evidence: DERIVED
- source: https://github.com/swyxio/claude-code-internals/blob/main/docs/index.md

narrativeRole: Lands the value of the Start chapter and routes viewers toward the runtime.

keyMessage: Rigor makes the system more useful, not less interesting.

## Frame 10 — Runtime

- scene: Orange chapter broadside: catalogue 02, oversized lowercase runtime, binary address strip accelerates beneath it.
- voiceover: ""
- duration: 4s
- poster: 2s
- transition_in: cut
- status: outline
- src: compositions/frames/10-runtime-card.html
- type: product_intro
- persuasion: Signposting
- beat: focus
- blueprint: kinetic-type-beats
- chapter: runtime
- evidence: N/A
- source: https://github.com/swyxio/claude-code-internals/blob/main/docs/architecture/index.md

narrativeRole: Opens the Runtime chapter with a new rhythmic gear.

keyMessage: Now trace the artifact from container to completed agent turn.

## Frame 11 — Executable anatomy

- scene: An exploded Mach-O reveals a 17 MB JavaScript entry, a 129 MB JSC cache region, five loader/native pairs, and an absent source-map slot.
- voiceover: "Inside the signed Mach-O, one Bun section holds eleven modules: one large JavaScript entry, five binding loaders, and five native modules. The cache is large; a source map is absent."
- duration: 17s
- poster: 14s
- transition_in: push-slide LEFT
- status: outline
- src: compositions/frames/11-executable-anatomy.html
- type: feature_showcase
- persuasion: Progressive disclosure + concretization
- beat: fascination + comprehension
- blueprint: grid-card-assemble
- chapter: runtime
- evidence: OBSERVED
- source: https://github.com/swyxio/claude-code-internals/blob/main/docs/architecture/bun-jsc-deep-dive.md

narrativeRole: Turns a monolithic binary into a legible native envelope and embedded module graph.

keyMessage: The artifact exposes strong structural facts without yielding an original source tree.

## Frame 12 — Entrypoint prism

- scene: One binary beam enters a prism labeled CLAUDE_CODE_ENTRYPOINT and exits as interactive, print, MCP server, IDE, remote, and background identities.
- voiceover: "One executable routes several identities through CLAUDE_CODE_ENTRYPOINT: interactive terminal, print protocols, MCP server, IDE bridges, remote control, and background agents share a bootstrap—then diverge."
- duration: 15s
- poster: 12s
- transition_in: push-slide LEFT
- status: outline
- src: compositions/frames/12-entrypoint-prism.html
- type: feature_showcase
- persuasion: Frame-then-fill
- beat: orientation + aha
- blueprint: spatial-pan-stations
- chapter: runtime
- evidence: DERIVED FROM ANCHOR + CLI
- source: https://github.com/swyxio/claude-code-internals/blob/main/docs/architecture/startup.md

narrativeRole: Explains why invocation identity changes startup behavior before any model turn.

keyMessage: The same artifact is a family of entrypoints, not one terminal-only program.

## Frame 13 — The turn engine

- scene: A heartbeat loop cycles context to provider stream to tool request to result feedback; three Messages pulses mark the observed Read-to-Bash case.
- voiceover: "The client assembles context, streams a provider response, adapts events, executes approved tools, and feeds results back. In one observed Read-to-Bash turn, that heartbeat required three Messages requests."
- duration: 18s
- poster: 15s
- transition_in: push-slide LEFT
- status: outline
- src: compositions/frames/13-turn-engine.html
- type: feature_showcase
- persuasion: Causal chain + demonstration
- beat: comprehension + momentum
- blueprint: spatial-pan-stations
- chapter: runtime
- evidence: OBSERVED + DERIVED
- source: https://github.com/swyxio/claude-code-internals/blob/main/docs/dynamics/runtime-tool-session.md

narrativeRole: Makes the asynchronous agent loop visible as repeated provider and local-execution phases.

keyMessage: A tool-using turn is a feedback loop, not one request followed by one answer.

## Frame 14 — Authorization gauntlet

- scene: A tool call advances through coerce, parse, validate, pre-hook, authorize, execute, post-hook, and normalize gates; permission and sandbox occupy separate rails.
- voiceover: "A tool call crosses a gauntlet: coerce, parse, validate, pre-hook, authorize, execute, post-hook, normalize. Permission decides whether it may run; sandbox policy constrains what an allowed process may do."
- duration: 18s
- poster: 15s
- transition_in: push-slide LEFT
- status: outline
- src: compositions/frames/14-authorization-gauntlet.html
- type: feature_showcase
- persuasion: Numbered enumeration + causal chain
- beat: mastery + caution
- chapter: runtime
- evidence: DERIVED CONTRACT
- source: https://github.com/swyxio/claude-code-internals/blob/main/reconstructed/tools/execution-pipeline.ts

narrativeRole: Separates the stages that are often collapsed into the vague phrase tool execution.

keyMessage: Validation, hooks, permission, execution, and containment are distinct control points.

## Frame 15 — False finish

- scene: A LAST TOKEN marker appears, then held-back results, hooks, background agents, compaction, and persistence continue before IDLE finally lights.
- voiceover: "And completion is not the last model token. Held-back results must flush; hooks, background agents, compaction, and persistence may continue. Idle is a coordination boundary—not a rendering state."
- duration: 14s
- poster: 11s
- transition_in: zoom-through
- status: outline
- src: compositions/frames/15-false-finish.html
- type: benefit_highlight
- persuasion: Counterintuitive claim + causal chain
- beat: surprise + foresight
- blueprint: kinetic-type-beats
- chapter: runtime
- evidence: DERIVED FROM ANCHORS
- source: https://github.com/swyxio/claude-code-internals/blob/main/docs/architecture/agent-loop-context.md

narrativeRole: Corrects the intuitive but unsafe definition of a finished agent turn.

keyMessage: Reliable integrations must wait for the runtime's true idle boundary.

## Frame 16 — Extensions

- scene: Orange chapter broadside: catalogue 03, oversized lowercase extensions, parallel rails fan out from one resolver.
- voiceover: ""
- duration: 4s
- poster: 2s
- transition_in: cut
- status: outline
- src: compositions/frames/16-extensions-card.html
- type: product_intro
- persuasion: Signposting
- beat: focus
- blueprint: kinetic-type-beats
- chapter: extensions
- evidence: N/A
- source: https://github.com/swyxio/claude-code-internals/blob/main/docs/extensibility/index.md

narrativeRole: Opens the Extensions chapter and visually changes from a loop to a lattice.

keyMessage: Extensibility is a graph of surfaces with different authority.

## Frame 17 — Capability lattice

- scene: Context, delegation, lifecycle, capability, and transport rails converge on an effective-session hub.
- voiceover: "Claude Code does not have one extension API. Instructions and memory shape context; skills add procedures; agents delegate; hooks bind events; MCP adds capabilities; plugins package several surfaces together."
- duration: 16s
- poster: 13s
- transition_in: push-slide LEFT
- status: outline
- src: compositions/frames/17-capability-lattice.html
- type: feature_showcase
- persuasion: Frame-then-fill + classification
- beat: orientation + comprehension
- blueprint: constellation-hub
- chapter: extensions
- evidence: DERIVED
- source: https://github.com/swyxio/claude-code-internals/blob/main/docs/extensibility/index.md

narrativeRole: Replaces the misleading single-API mental model with an authority-aware lattice.

keyMessage: Different extension surfaces contribute context, events, processes, tools, or transport.

## Frame 18 — Composite trust

- scene: A plugin package explodes into skills, agents, hooks, MCP, and LSP; execution-capable components cross an orange warning plane.
- voiceover: "Their authority is not uniform. Loading CLAUDE.md does not itself execute code. A command hook may run because an event fired. A plugin inherits the union of every component it enables."
- duration: 15s
- poster: 12s
- transition_in: push-slide LEFT
- status: outline
- src: compositions/frames/18-composite-trust.html
- type: feature_showcase
- persuasion: Comparison + generalization
- beat: caution + clarity
- blueprint: grid-card-assemble
- chapter: extensions
- evidence: DERIVED
- source: https://github.com/swyxio/claude-code-internals/blob/main/docs/extensibility/plugins.md

narrativeRole: Makes context influence and ambient local execution visibly different trust classes.

keyMessage: Review the most privileged enabled component, not the plugin label.

## Frame 19 — Hooks race

- scene: Slow and fast PreToolUse lanes emit start, start, response, response; response order crosses declaration order on an oscilloscope timeline.
- voiceover: "In an isolated probe, two sibling PreToolUse hooks launched concurrently: both start events arrived before either response. Declaration order cannot safely coordinate their side effects."
- duration: 15s
- poster: 12s
- transition_in: push-slide LEFT
- status: outline
- src: compositions/frames/19-hooks-race.html
- type: social_proof
- persuasion: Demonstration + counterexample
- beat: surprise + unease
- blueprint: spatial-pan-stations
- chapter: extensions
- evidence: OBSERVED
- source: https://github.com/swyxio/claude-code-internals/blob/main/docs/extensibility/hooks.md

narrativeRole: Grounds the trust model in a concrete scheduling behavior extension authors must design around.

keyMessage: Concurrent hooks require independent, idempotent side effects.

## Frame 20 — MCP airlock

- scene: An MCP server crosses Discovered, Pending, Approved, Connected gates, then four stdio messages reveal one namespaced tool.
- voiceover: "MCP has its own airlock: discovery is separate from approval, and strict mode excludes implicit sources. One captured stdio session ran initialize, initialized, tools list, then tools call."
- duration: 17s
- poster: 14s
- transition_in: push-slide LEFT
- status: outline
- src: compositions/frames/20-mcp-airlock.html
- type: feature_showcase
- persuasion: Progressive disclosure + causal chain
- beat: comprehension + confidence
- blueprint: spatial-pan-stations
- chapter: extensions
- evidence: OBSERVED + DERIVED
- source: https://github.com/swyxio/claude-code-internals/blob/main/docs/extensibility/mcp.md

narrativeRole: Separates MCP source discovery, user approval, connection, and protocol dispatch.

keyMessage: Seeing an MCP server is not the same as approving or connecting it.

## Frame 21 — Pin the origin

- scene: A scanner assembles component type, name, scope, resolved location, and digest into one origin tuple, then locks the effective runtime catalog.
- voiceover: "So pin the origin tuple: component type, declared name, source scope, resolved path or URL, and content digest. Then verify the effective runtime catalog—not the marketplace description."
- duration: 13s
- poster: 10s
- transition_in: zoom-through
- status: outline
- src: compositions/frames/21-pin-the-origin.html
- type: cta
- persuasion: Distillation + mnemonic
- beat: mastery + resolve
- blueprint: grid-card-assemble
- chapter: extensions
- evidence: DERIVED GUIDANCE
- source: https://github.com/swyxio/claude-code-internals/blob/main/docs/maps/extension-surfaces.md

narrativeRole: Converts the extension model into an actionable review procedure.

keyMessage: Stable provenance is the unit of extension trust.

## Frame 22 — Security

- scene: Orange chapter broadside: catalogue 04, oversized lowercase security, seven gate bars close in sequence.
- voiceover: ""
- duration: 4s
- poster: 2s
- transition_in: cut
- status: outline
- src: compositions/frames/22-security-card.html
- type: product_intro
- persuasion: Signposting
- beat: focus
- blueprint: kinetic-type-beats
- chapter: security
- evidence: N/A
- source: https://github.com/swyxio/claude-code-internals/blob/main/docs/security/index.md

narrativeRole: Opens the Security chapter with a threat-circuit motif.

keyMessage: Security comes from composable controls, not one shield.

## Frame 23 — The threat circuit

- scene: Repository, model, extensions, MCP, remote peers, state, provider, update channel, and host orbit the signed runtime with directional trust edges.
- voiceover: "The runtime uses your operating-system identity while combining input from repositories, models, extensions, remote peers, providers, and updates. Every connection is a separate trust boundary."
- duration: 14s
- poster: 11s
- transition_in: push-slide LEFT
- status: outline
- src: compositions/frames/23-threat-circuit.html
- type: pain_point
- persuasion: Concretization + causal framing
- beat: concern + orientation
- blueprint: constellation-hub
- chapter: security
- evidence: DERIVED
- source: https://github.com/swyxio/claude-code-internals/blob/main/docs/security/index.md

narrativeRole: Establishes the principals and assets before discussing individual controls.

keyMessage: A signed local client still mediates multiple untrusted sources with ambient user authority.

## Frame 24 — Seven gates

- scene: One request traverses workspace trust, extension approval, validation and hooks, permission, sandbox, OS controls, then persistence and egress.
- voiceover: "Security is layered: workspace trust, extension approval, validation and hooks, permissions, sandboxing, operating-system controls, then persistence and egress. Remove one gate, and the others do not become equivalent."
- duration: 16s
- poster: 13s
- transition_in: push-slide LEFT
- status: outline
- src: compositions/frames/24-seven-gates.html
- type: feature_showcase
- persuasion: Numbered enumeration + causal chain
- beat: comprehension + caution
- blueprint: grid-card-assemble
- chapter: security
- evidence: DERIVED
- source: https://github.com/swyxio/claude-code-internals/blob/main/docs/maps/threat-model.md

narrativeRole: Shows why the security model must be evaluated as a chain of distinct decisions.

keyMessage: Permission, sandbox, OS security, transport, and persistence solve different problems.

## Frame 25 — Permission experiment

- scene: Identical Bash requests run side by side: dontAsk without allow returns error and no marker; explicit allow produces the marker.
- voiceover: "That distinction is observable. With dontAsk and no allow rule, the Bash request returned an error and wrote nothing. Add an explicit allow rule, and the same request executed."
- duration: 15s
- poster: 12s
- transition_in: push-slide LEFT
- status: outline
- src: compositions/frames/25-permission-experiment.html
- type: social_proof
- persuasion: Controlled comparison
- beat: confidence + clarity
- blueprint: comparison-split
- chapter: security
- evidence: OBSERVED
- source: https://github.com/swyxio/claude-code-internals/blob/main/docs/dynamics/security-permissions-sandbox.md

narrativeRole: Grounds permission semantics in a bounded, repeatable experiment.

keyMessage: An allowed tool call is a deliberate policy outcome, not the absence of a prompt.

## Frame 26 — Sandbox boundary

- scene: An allowed command writes inside a temporary working directory, then a second write pulse strikes a hard boundary at the parent directory.
- voiceover: "Under fail-closed sandbox settings, an allowed command wrote inside its working directory but was denied at the parent. That proves one tested boundary—not complete containment."
- duration: 14s
- poster: 11s
- transition_in: push-slide LEFT
- status: outline
- src: compositions/frames/26-sandbox-boundary.html
- type: social_proof
- persuasion: Demonstration + caveat
- beat: confidence + restraint
- blueprint: comparison-split
- chapter: security
- evidence: OBSERVED
- source: https://github.com/swyxio/claude-code-internals/blob/main/docs/dynamics/security-permissions-sandbox.md

narrativeRole: Demonstrates sandbox effect while explicitly preventing a containment overclaim.

keyMessage: A successful boundary probe is evidence for that boundary, not certification of the whole sandbox.

## Frame 27 — Verify the stack

- scene: Six audit tiles lock in order: policy, extensions, sandbox backend, credentials, egress, persistence; safe and bare mode labels remain outside the shield.
- voiceover: "Safe mode is not offline. Bare mode is not hermetic. Verify active policy, executable extensions, sandbox backend, credentials, egress, persistence, and the artifact signature—each as an additive control."
- duration: 16s
- poster: 13s
- transition_in: zoom-through
- status: outline
- src: compositions/frames/27-verify-the-stack.html
- type: cta
- persuasion: Checklist + distillation
- beat: resolve + mastery
- blueprint: grid-card-assemble
- chapter: security
- evidence: DERIVED GUIDANCE
- source: https://github.com/swyxio/claude-code-internals/blob/main/docs/security/runtime-modes.md

narrativeRole: Ends the threat model with a concrete deployment-verification order.

keyMessage: Security posture must be verified across all active layers.

## Frame 28 — Observations

- scene: Orange chapter broadside: catalogue 05, oversized lowercase observations, a loopback trace sweeps across the specimen strip.
- voiceover: ""
- duration: 4s
- poster: 2s
- transition_in: cut
- status: outline
- src: compositions/frames/28-observations-card.html
- type: product_intro
- persuasion: Signposting
- beat: focus
- blueprint: kinetic-type-beats
- chapter: observations
- evidence: N/A
- source: https://github.com/swyxio/claude-code-internals/blob/main/docs/dynamics/index.md

narrativeRole: Opens the Observations chapter and switches the visual register from model to experiment.

keyMessage: Dynamic evidence is only as credible as its isolation and limits.

## Frame 29 — Safety envelope

- scene: The signed binary enters an isolated chamber containing fresh HOME, config, project, dummy credentials, loopback provider, socket denial, sanitizer, and offline validator.
- voiceover: "Every committed probe starts with a fresh home, config directory, and project; dummy credentials; a loopback provider; blocked non-loopback sockets; bounded capture; sanitization; then offline validation."
- duration: 14s
- poster: 11s
- transition_in: push-slide LEFT
- status: outline
- src: compositions/frames/29-safety-envelope.html
- type: feature_showcase
- persuasion: Frame-then-fill + causal chain
- beat: assurance + comprehension
- blueprint: constellation-hub
- chapter: observations
- evidence: OBSERVED METHOD
- source: https://github.com/swyxio/claude-code-internals/blob/main/docs/dynamics/runtime-probe-method.md

narrativeRole: Establishes the controls that make runtime observations publishable and interpretable.

keyMessage: The probe harness minimizes ambient data and external effects before recording behavior.

## Frame 30 — Invocation split

- scene: Two invocation paths fork: one sends HEAD then POST; another reaches POST directly; both terminate at the same loopback Messages fixture.
- voiceover: "Startup is invocation-sensitive. One controlled path performed HEAD, then POST to Messages. Another reached POST directly. The difference is observed behavior—not a universal provider rule."
- duration: 14s
- poster: 11s
- transition_in: push-slide LEFT
- status: outline
- src: compositions/frames/30-invocation-split.html
- type: social_proof
- persuasion: Controlled comparison + caveat
- beat: surprise + restraint
- blueprint: comparison-split
- chapter: observations
- evidence: OBSERVED
- source: https://github.com/swyxio/claude-code-internals/blob/main/docs/dynamics/runtime-startup-provider.md

narrativeRole: Shows how small invocation differences can change the visible network sequence.

keyMessage: Dynamic claims must name the invocation that produced them.

## Frame 31 — Three-request loop

- scene: Three provider request cards advance across a shared stage: ask for Read, return result, ask for Bash, return marker, final response; a mode-0600 JSONL trail grows below.
- voiceover: "The observed tool case took three Messages requests: request Read, return its result, request Bash, return its result, then finish. A mode-zero-six-zero-zero JSONL transcript recorded nine sanitized event shapes."
- duration: 15s
- poster: 12s
- transition_in: push-slide LEFT
- status: outline
- src: compositions/frames/31-three-request-loop.html
- type: social_proof
- persuasion: Demonstration + numbered sequence
- beat: comprehension + confidence
- blueprint: spatial-pan-stations
- chapter: observations
- evidence: OBSERVED
- source: https://github.com/swyxio/claude-code-internals/blob/main/docs/dynamics/runtime-tool-session.md

narrativeRole: Concretizes provider-tool feedback and persistence in one controlled trace.

keyMessage: The runtime turns model requests and local results into a multi-request conversation with durable state.

## Frame 32 — Extension dynamics

- scene: A four-panel observation board synchronizes settings precedence, concurrent hooks, MCP handshake, and explicit agent/skill/plugin discovery.
- voiceover: "The same harness exposed extension dynamics: scalar settings precedence, concurrent sibling hooks, MCP initialize through tools call, and explicit discovery of agents, skills, and plugins. Each result is scenario-bound."
- duration: 16s
- poster: 13s
- transition_in: push-slide LEFT
- status: outline
- src: compositions/frames/32-extension-dynamics.html
- type: social_proof
- persuasion: Rule of four + demonstration
- beat: momentum + caution
- blueprint: grid-card-assemble
- chapter: observations
- evidence: OBSERVED
- source: https://github.com/swyxio/claude-code-internals/blob/main/docs/dynamics/extensions-runtime.md

narrativeRole: Summarizes the extension probes without laundering them into universal architecture.

keyMessage: Controlled observations can validate several boundaries while remaining narrow.

## Frame 33 — This version did this

- scene: A giant statement THIS VERSION DID THIS replaces a fading ALL VERSIONS DO THIS; the specimen digest remains pinned underneath.
- voiceover: "The disciplined conclusion is narrow: this version crossed this boundary in this scenario. Everything broader returns to the derived lane—or remains unexercised."
- duration: 12s
- poster: 9s
- transition_in: zoom-through
- status: outline
- src: compositions/frames/33-this-version-did-this.html
- type: branding
- persuasion: Distillation + counterexample
- beat: clarity + resolve
- blueprint: titlecard-reveal
- chapter: observations
- evidence: OBSERVED / DERIVED / UNEXERCISED
- source: https://github.com/swyxio/claude-code-internals/blob/main/docs/dynamics/index.md

narrativeRole: Lands the exact language viewers should use when citing a dynamic probe.

keyMessage: Scenario-bounded wording preserves the value of experimental evidence.

## Frame 34 — Evidence

- scene: Orange chapter broadside: catalogue 06, oversized lowercase evidence, an address pointer snaps onto a claim ID.
- voiceover: ""
- duration: 4s
- poster: 2s
- transition_in: cut
- status: outline
- src: compositions/frames/34-evidence-card.html
- type: product_intro
- persuasion: Signposting
- beat: focus
- blueprint: kinetic-type-beats
- chapter: evidence
- evidence: N/A
- source: https://github.com/swyxio/claude-code-internals/blob/main/docs/evidence/index.md

narrativeRole: Opens the Evidence chapter and turns the viewer from consumer into auditor.

keyMessage: Every strong statement should expose its route back to proof.

## Frame 35 — Follow a claim

- scene: A reader question becomes atlas prose, claim ID, evidence pointer, reconstructed contract, then known limit or falsification path.
- voiceover: "To audit a statement, follow the chain: reader question, atlas explanation, version-bound claim ID, static or dynamic evidence, reconstructed contract, then the known limit or falsification path."
- duration: 13s
- poster: 10s
- transition_in: push-slide LEFT
- status: outline
- src: compositions/frames/35-follow-a-claim.html
- type: feature_showcase
- persuasion: Causal chain
- beat: comprehension + agency
- blueprint: spatial-pan-stations
- chapter: evidence
- evidence: DERIVED WORKFLOW
- source: https://github.com/swyxio/claude-code-internals/blob/main/docs/evidence/index.md

narrativeRole: Teaches the audit path that links prose, evidence, code model, and limitations.

keyMessage: Traceability is a navigable graph, not a footnote pile.

## Frame 36 — The ledger

- scene: Three top-border stat cards count to 32 observed, 52 derived, and 1 hypothesis while 51 anchor ticks fill an address ruler.
- voiceover: "The current ledger contains eighty-five claims: thirty-two observed, fifty-two derived, one hypothesis. Fifty-one static anchors give exact byte ranges, hashes, CLI surfaces, or bounded semantic neighborhoods."
- duration: 13s
- poster: 10s
- transition_in: push-slide LEFT
- status: outline
- src: compositions/frames/36-the-ledger.html
- type: social_proof
- persuasion: Statistical proof
- beat: confidence + scale
- blueprint: dataviz-countup
- chapter: evidence
- evidence: OBSERVED
- source: https://github.com/swyxio/claude-code-internals/blob/main/evidence/anchors.json

narrativeRole: Quantifies the audit surface and visually distinguishes claims from anchors.

keyMessage: The project publishes a structured ledger with explicit epistemic classes and locations.

## Frame 37 — String is not system

- scene: A raw string token appears on the left; a complete active subsystem schematic appears on the right but is blocked by a not-equal divider.
- voiceover: "A string proves that bytes exist. It does not prove activation, reachability, default policy, or complete semantics. STRING IS NOT SYSTEM is the atlas's most important brake."
- duration: 13s
- poster: 10s
- transition_in: push-slide LEFT
- status: outline
- src: compositions/frames/37-string-not-system.html
- type: benefit_highlight
- persuasion: Counterexample + coined mnemonic
- beat: caution + mastery
- blueprint: comparison-split
- chapter: evidence
- evidence: DERIVED RULE
- source: https://github.com/swyxio/claude-code-internals/blob/main/docs/evidence/methodology.md

narrativeRole: Installs the core anti-overclaiming heuristic in a memorable form.

keyMessage: Presence evidence and behavior evidence answer different questions.

## Frame 38 — Validator gate

- scene: Candidate evidence files pass through schema, size, secret, key, executable, recovered-hash, and text-content gates; rejected payloads burn orange and disappear.
- voiceover: "Before evidence is committed, validators reject credentials, private keys, executable payloads, recovered-code hashes, oversized files, and unsafe text. Publication safety is executable—not a promise in prose."
- duration: 14s
- poster: 11s
- transition_in: push-slide LEFT
- status: outline
- src: compositions/frames/38-validator-gate.html
- type: feature_showcase
- persuasion: Demonstration + causal chain
- beat: assurance + resolve
- blueprint: grid-card-assemble
- chapter: evidence
- evidence: OBSERVED REPOSITORY CONTROL
- source: https://github.com/swyxio/claude-code-internals/blob/main/tools/validate-evidence.mjs

narrativeRole: Shows that publication boundaries are enforced by automated checks.

keyMessage: The repository turns ethical and security constraints into validation failures.

## Frame 39 — Version-bound

- scene: The specimen plate stays sharp while platform coverage, server behavior, feature flags, configuration, and future releases recede into an UNEXERCISED field.
- voiceover: "The limits matter: one platform, one digest, controlled runtime coverage, opaque server behavior, feature gates, and configuration drift. Confidence erodes when the subject hash changes."
- duration: 13s
- poster: 10s
- transition_in: zoom-through
- status: outline
- src: compositions/frames/39-version-bound.html
- type: branding
- persuasion: Distillation + generalization
- beat: restraint + clarity
- blueprint: titlecard-reveal
- chapter: evidence
- evidence: OBSERVED LIMITS
- source: https://github.com/swyxio/claude-code-internals/blob/main/docs/evidence/versions-limitations.md

narrativeRole: Makes limitations part of the evidence product rather than an afterthought.

keyMessage: A changed artifact hash requires a new investigation.

## Frame 40 — Reference

- scene: Orange chapter broadside: catalogue 07, oversized lowercase reference, search cursor blinks beside an exact identifier.
- voiceover: ""
- duration: 4s
- poster: 2s
- transition_in: cut
- status: outline
- src: compositions/frames/40-reference-card.html
- type: product_intro
- persuasion: Signposting
- beat: focus
- blueprint: typewriter-reveal
- chapter: reference
- evidence: N/A
- source: https://github.com/swyxio/claude-code-internals/blob/main/docs/reference/index.md

narrativeRole: Opens the Reference chapter as a retrieval workflow rather than a glossary recital.

keyMessage: Exact identifiers are the fastest route through the atlas.

## Frame 41 — Search the surface

- scene: A command palette types --allowedTools, CLAUDE_CODE_ENTRYPOINT, PreToolUse, and tools/call; each query opens both explanation and source route.
- voiceover: "When you know the surface name, search it exactly: dash-dash allowedTools, CLAUDE_CODE_ENTRYPOINT, PreToolUse, or tools slash call. Each route joins explanation to source-of-truth links."
- duration: 13s
- poster: 10s
- transition_in: push-slide LEFT
- status: outline
- src: compositions/frames/41-search-the-surface.html
- type: feature_showcase
- persuasion: Demonstration + anchoring
- beat: agency + delight
- blueprint: typewriter-reveal
- chapter: reference
- evidence: OBSERVED REFERENCE
- source: https://github.com/swyxio/claude-code-internals/blob/main/docs/reference/index.md

narrativeRole: Demonstrates the site's exact-identifier retrieval model.

keyMessage: Search terms bridge conceptual documentation and concrete source surfaces.

## Frame 42 — Four rails

- scene: Four indexed rails self-assemble: CLI; files, config, environment; hooks and plugins; protocols and native modules.
- voiceover: "The reference is split into four rails: commands and flags; files, configuration, and environment; hook and plugin catalogs; then stream JSON, MCP, IPC, and native-module boundaries."
- duration: 14s
- poster: 11s
- transition_in: push-slide LEFT
- status: outline
- src: compositions/frames/42-four-rails.html
- type: feature_showcase
- persuasion: Rule of four + classification
- beat: orientation + mastery
- blueprint: grid-card-assemble
- chapter: reference
- evidence: OBSERVED REFERENCE
- source: https://github.com/swyxio/claude-code-internals/blob/main/docs/reference/index.md

narrativeRole: Gives the viewer a compact taxonomy for retrieving exact surfaces.

keyMessage: The reference pages organize lookup by interface type, not by narrative chapter.

## Frame 43 — Identifier to contract

- scene: An exact term fans out to CLI help capture, anchor, prose explanation, reconstructed filename, and dynamic observation when one exists.
- voiceover: "An identifier can lead to captured CLI help, a static anchor, an explanation, a reconstructed contract, and sometimes a dynamic observation. Those links expose both evidence and uncertainty."
- duration: 13s
- poster: 10s
- transition_in: push-slide LEFT
- status: outline
- src: compositions/frames/43-identifier-to-contract.html
- type: benefit_highlight
- persuasion: Progressive disclosure + causal chain
- beat: comprehension + confidence
- blueprint: kinetic-type-beats
- chapter: reference
- evidence: DERIVED NAVIGATION
- source: https://github.com/swyxio/claude-code-internals/blob/main/docs/maps/evidence-code-cross-reference.md

narrativeRole: Connects reference lookup to the atlas's full evidence graph.

keyMessage: Good reference documentation shows where a name came from and what remains unproven.

## Frame 44 — Names have limits

- scene: EXISTS lights under a token while ACTIVE, DEFAULT, COMPLETE, and SAFE remain dark behind a divider.
- voiceover: "But names have limits. A flag, event, environment variable, or protocol method proves a surface exists. It does not prove activation, defaults, completeness, or safety."
- duration: 12s
- poster: 9s
- transition_in: push-slide LEFT
- status: outline
- src: compositions/frames/44-names-have-limits.html
- type: pain_point
- persuasion: Counterexample + comparison
- beat: caution + clarity
- blueprint: comparison-split
- chapter: reference
- evidence: DERIVED RULE
- source: https://github.com/swyxio/claude-code-internals/blob/main/docs/reference/cli.md

narrativeRole: Applies the String Is Not System rule to exact-reference surfaces.

keyMessage: Reference names are starting points for verification, not deployment guarantees.

## Frame 45 — Browse, then verify

- scene: Four source routes lock beside TRACE, EXTEND, SECURE, VERIFY, ending on the repository and GitHub Pages URLs.
- voiceover: "Use the index to browse. Use claims and anchors to verify. Then repeat the probe against your exact version, configuration, platform, and extension catalog."
- duration: 12s
- poster: 9s
- transition_in: zoom-through
- status: outline
- src: compositions/frames/45-browse-then-verify.html
- type: cta
- persuasion: Signposting + call to act
- beat: resolve + agency
- blueprint: titlecard-reveal
- chapter: reference
- evidence: DERIVED GUIDANCE
- source: https://github.com/swyxio/claude-code-internals

narrativeRole: Ends the final standalone chapter with a safe operational workflow.

keyMessage: Browse the atlas for orientation, then verify against the system actually being deployed.

## Frame 46 — Pull back

- scene: All seven chapter mechanisms zoom out into one linked field atlas surrounding the immutable specimen strip.
- voiceover: "Zoom out, and the pattern is simple: runtime, extensions, and security become understandable when every strong statement carries an address, an observation, or an inference."
- duration: 14s
- poster: 11s
- transition_in: zoom-through
- status: outline
- src: compositions/frames/46-pull-back.html
- type: branding
- persuasion: Callback + generalization
- beat: satisfaction + inevitability
- blueprint: grid-card-assemble
- chapter: master-close
- evidence: DERIVED
- source: https://github.com/swyxio/claude-code-internals/blob/main/docs/index.md

narrativeRole: Recombines the seven chapters into the opening thesis.

keyMessage: Epistemic discipline is what makes a compiled runtime browsable.

## Frame 47 — Trace, extend, secure, verify

- scene: Four verbs strike one per beat, then resolve beside the atlas mark, repository URL, and specimen digest.
- voiceover: "Trace the runtime. Extend by authority. Secure every boundary. Verify every claim."
- duration: 10s
- poster: 7s
- transition_in: cut
- status: outline
- src: compositions/frames/47-final-verbs.html
- type: cta
- persuasion: Rule of four + distillation
- beat: resolve + inspiration
- blueprint: kinetic-type-beats
- chapter: master-close
- evidence: N/A
- source: https://swyxio.github.io/claude-code-internals/

narrativeRole: Gives the viewer a memorable four-verb operating model and a direct route to the atlas.

keyMessage: TRACE · EXTEND · SECURE · VERIFY.
