---
format: 1920x1080
mode: collaborative
message: "A compiled agent becomes legible as a turn engine, extension surface, and layered control boundary—when every claim remains version-pinned and testable."
arc: "three-act forensic concept explainer: engine → surface → boundary"
audience: "AI-agent developers, extension authors, security reviewers, and technically curious operators"
destination: "YouTube and website embed"
target_duration: "5m00s"
acts: "01 Engine · 02 Surface · 03 Boundary"
---

## Frame 1 — The monolith

- scene: A black signed-executable monolith emerges from four specimen facts; each fact locks onto the persistent specimen spine.
- voiceover: "One signed executable. Two hundred twenty-five million bytes. Eleven embedded modules. No source map."
- duration: 12s
- poster: 9s
- transition_in: cut
- status: outline
- src: compositions/frames/01-the-monolith.html
- type: hook
- persuasion: Shocking statistic + progressive disclosure
- beat: surprise + intrigue
- blueprint: kinetic-type-beats
- act: intro
- evidence: OBSERVED
- source: https://github.com/swyxio/claude-code-internals/blob/main/docs/snapshot-2.1.177.md

narrativeRole: Opens the cognitive gap with the exact specimen and the absence of a convenient source map.

keyMessage: The artifact is opaque, but it is not unknowable.

## Frame 2 — Three questions

- scene: The specimen spine becomes three dormant shapes—pulse rail, socket, gate—under the questions RUNS, CHANGES, CONSTRAINS.
- voiceover: "We do not need to recover its source to understand it. We need three questions: how does it run? What changes its power? What constrains it—and how do we prove it?"
- duration: 13s
- poster: 10s
- transition_in: push-slide LEFT
- status: outline
- src: compositions/frames/02-three-questions.html
- type: product_intro
- persuasion: Rhetorical question + frame-then-fill
- beat: clarity + anticipation
- blueprint: spatial-pan-stations
- act: intro
- evidence: DERIVED
- source: https://github.com/swyxio/claude-code-internals/blob/main/docs/index.md

narrativeRole: Makes the three-act contract explicit before any mechanism is explained.

keyMessage: Engine, surface, and boundary are the three questions that turn a black box into a model.

## Frame 3 — Engine: structure, not source

- scene: Integrated title move `01 / ENGINE` resolves inside the monolith; the envelope opens only to a native shell, Bun payload, entry module, loaders, and native add-ons.
- voiceover: "One—engine. The version-pinned specimen is a signed Mach-O with a Bun payload: one entry module, loaders, and native add-ons. That is structure—not source."
- duration: 20s
- poster: 15s
- transition_in: zoom-through
- status: outline
- src: compositions/frames/03-engine-structure.html
- type: product_intro
- persuasion: Concretization + subtractive framing
- beat: focus + curiosity
- blueprint: grid-card-assemble
- act: engine
- evidence: OBSERVED + DERIVED
- source: https://github.com/swyxio/claude-code-internals/blob/main/docs/architecture/binary-container.md

narrativeRole: Sets the evidence boundary for the runtime model while introducing the first act's spatial grammar.

keyMessage: Binary structure can support a model of the runtime without becoming recovered source.

## Frame 4 — The living turn

- scene: The Bun payload morphs into one large pulse rail: context → provider stream → tool call → local result → provider; an observed three-request Read-to-Bash trace fills the rail once.
- voiceover: "Inside, the client assembles context, streams a provider response, adapts events, evaluates tool calls, executes approved work locally, then feeds results back. That is a feedback loop, not a one-shot answer. In one observed Read-to-Bash case, the loop made three Messages requests."
- duration: 30s
- poster: 23s
- transition_in: push-slide LEFT
- status: outline
- src: compositions/frames/04-living-turn.html
- type: feature_showcase
- persuasion: Causal chain + demonstration
- beat: comprehension + momentum
- blueprint: spatial-pan-stations
- act: engine
- evidence: OBSERVED + DERIVED
- source: https://github.com/swyxio/claude-code-internals/blob/main/docs/dynamics/runtime-tool-session.md

narrativeRole: Makes the turn loop memorable by showing one complete observed tool-feedback case rather than a list of subsystems.

keyMessage: A tool-using agent turn is a repeated provider-and-local-execution loop.

## Frame 5 — The real finish line

- scene: The tool branch passes through one continuous gauntlet—coerce, parse, validate, hook, permit, execute, normalize—then drains held work before the `IDLE` lamp lights.
- voiceover: "Each tool call crosses a sequence: coerce, parse, validate, pre-hook, authorize, execute, post-hook, normalize. Permission asks may it run; sandbox constrains what an allowed process reaches. And the turn is not done at the last token—it drains to idle."
- duration: 25s
- poster: 19s
- transition_in: push-slide LEFT
- status: outline
- src: compositions/frames/05-real-finish-line.html
- type: benefit_highlight
- persuasion: Numbered sequence + counterintuitive claim
- beat: mastery + foresight
- act: engine
- evidence: DERIVED CONTRACT
- source: https://github.com/swyxio/claude-code-internals/blob/main/reconstructed/tools/execution-pipeline.ts

narrativeRole: Turns the first act's loop into a practical integration rule.

keyMessage: A trustworthy integration waits for an idle boundary, not merely the final model token.

## Frame 6 — Surface: capability arrives

- scene: The pulse rail becomes a modular core; integrated title `02 / SURFACE` appears as ports for context, skills, agents, hooks, MCP, plugins, and bridges assemble.
- voiceover: "Two—surface. There is no single extension API. Instructions and memory shape context; skills and agents shape procedure and delegation; hooks, MCP, plugins, and bridges add capability."
- duration: 20s
- poster: 15s
- transition_in: zoom-through
- status: outline
- src: compositions/frames/06-surface-capability.html
- type: product_intro
- persuasion: Classification + progressive disclosure
- beat: orientation + comprehension
- blueprint: constellation-hub
- act: surface
- evidence: DERIVED
- source: https://github.com/swyxio/claude-code-internals/blob/main/docs/extensibility/index.md

narrativeRole: Replaces the single-API mental model with one capability surface that has visibly different ports.

keyMessage: Extensions change an effective session through several distinct kinds of contribution.

## Frame 7 — Uneven authority

- scene: Context-only ports remain unpowered while hook, MCP, and executable plugin components carry orange current; two PreToolUse lanes race while a separate MCP airlock stages discovery, approval, and connection.
- voiceover: "Those surfaces do not have equal authority. Loading CLAUDE.md does not execute code. A command hook can run because an event fires. In the probe, sibling PreToolUse hooks launched concurrently; MCP discovery remained separate from approval and connection."
- duration: 30s
- poster: 23s
- transition_in: push-slide LEFT
- status: outline
- src: compositions/frames/07-uneven-authority.html
- type: social_proof
- persuasion: Controlled contrast + demonstration
- beat: surprise + caution
- blueprint: comparison-split
- act: surface
- evidence: OBSERVED + DERIVED
- source: https://github.com/swyxio/claude-code-internals/blob/main/docs/dynamics/extensions-runtime.md

narrativeRole: Grounds the authority distinction in the two dynamic behaviors that matter most to authors and operators.

keyMessage: Context, lifecycle execution, and process-backed capability are different trust classes.

## Frame 8 — Trust composition

- scene: Every powered port folds into one provenance passport: component type, declared name, scope, resolved location, digest, then an effective-catalog seal.
- voiceover: "That makes an extension a trust composition, not a feature checkbox. Pin its component type, declared name, source scope, resolved location, and digest—then inspect the effective catalog."
- duration: 25s
- poster: 19s
- transition_in: push-slide LEFT
- status: outline
- src: compositions/frames/08-trust-composition.html
- type: cta
- persuasion: Distillation + mnemonic
- beat: resolve + confidence
- blueprint: grid-card-assemble
- act: surface
- evidence: DERIVED GUIDANCE
- source: https://github.com/swyxio/claude-code-internals/blob/main/docs/maps/extension-surfaces.md

narrativeRole: Converts the extension model into a concise review practice.

keyMessage: Stable provenance—not a marketplace label—is the unit of extension trust.

## Frame 9 — Boundary: non-equivalent controls

- scene: The modular core acquires concentric gates; integrated title `03 / BOUNDARY` reveals repository, model, extension, provider, update, and host inputs at the perimeter.
- voiceover: "Three—boundary. This runtime acts with your operating-system identity while input arrives from repositories, models, extensions, providers, and updates. Security is a sequence of non-equivalent controls."
- duration: 20s
- poster: 15s
- transition_in: zoom-through
- status: outline
- src: compositions/frames/09-boundary-controls.html
- type: product_intro
- persuasion: Concretization + causal framing
- beat: concern + focus
- blueprint: constellation-hub
- act: boundary
- evidence: DERIVED
- source: https://github.com/swyxio/claude-code-internals/blob/main/docs/security/index.md

narrativeRole: Reframes security as an authority perimeter around the same core introduced in the first two acts.

keyMessage: The agent's local authority must be controlled across several independent boundaries.

## Frame 10 — Gates are not substitutes

- scene: One request crosses nested gates in order: workspace trust, extension approval, validation and hooks, permission, sandbox, OS, transport, egress, persistence; each gate stays visibly distinct.
- voiceover: "Workspace trust decides whether repository configuration participates. Extension approval controls entry. Permission decides whether a request may run. Sandboxing constrains allowed processes. Operating system, transport, egress, and persistence remain separate."
- duration: 30s
- poster: 23s
- transition_in: push-slide LEFT
- status: outline
- src: compositions/frames/10-gates-not-substitutes.html
- type: feature_showcase
- persuasion: Causal chain + classification
- beat: comprehension + caution
- blueprint: spatial-pan-stations
- act: boundary
- evidence: DERIVED
- source: https://github.com/swyxio/claude-code-internals/blob/main/docs/maps/threat-model.md

narrativeRole: Makes it impossible to confuse permission, containment, and operating-system controls as one gate.

keyMessage: Removing or verifying one control does not make another redundant.

## Frame 11 — Test the actual path

- scene: Identical Bash requests split: dontAsk with no allow rule stops before execution; explicit allow reaches a sandbox where the workdir write passes and the parent write is denied.
- voiceover: "The probe makes the distinction concrete: dontAsk without an allow rule denied Bash and wrote nothing. With an explicit allow, it ran. Under fail-closed sandboxing, workdir writes passed; parent writes failed."
- duration: 20s
- poster: 15s
- transition_in: push-slide LEFT
- status: outline
- src: compositions/frames/11-test-actual-path.html
- type: social_proof
- persuasion: Controlled comparison + demonstration
- beat: confidence + restraint
- blueprint: comparison-split
- act: boundary
- evidence: OBSERVED
- source: https://github.com/swyxio/claude-code-internals/blob/main/docs/dynamics/security-permissions-sandbox.md

narrativeRole: Gives one concrete experiment that demonstrates the difference between denial, allowance, and containment.

keyMessage: The result proves only the named tested path, not complete sandbox containment.

## Frame 12 — Evidence is the final gate

- scene: A probe reticle stamps the tested path `OBSERVED`; untested rings remain dim while a claim chain resolves address → trace → bounded inference → known limit.
- voiceover: "That is one tested path, not total containment. Evidence stays version-bound: an address shows bytes, a trace shows behavior, and a bounded inference explains the gap. String is not system."
- duration: 15s
- poster: 11s
- transition_in: push-slide LEFT
- status: outline
- src: compositions/frames/12-evidence-final-gate.html
- type: benefit_highlight
- persuasion: Distillation + counterexample
- beat: clarity + resolve
- blueprint: titlecard-reveal
- act: boundary
- evidence: OBSERVED + DERIVED + UNEXERCISED
- source: https://github.com/swyxio/claude-code-internals/blob/main/docs/evidence/index.md

narrativeRole: Explains why evidence and limitations are part of the boundary model, not a separate appendix.

keyMessage: A claim is useful only when its evidence class, subject version, and limit remain visible.

## Frame 13 — The model clicks

- scene: Pulse rail, modular socket, and nested gate fold onto one atlas; labels settle as ENGINE / SURFACE / BOUNDARY over ADDRESS / TRACE / INFERENCE.
- voiceover: "Now the three questions resolve. The engine tells us what runs. The surface tells us where capability enters. The boundary tells us what may happen—and the evidence tells us how far we can honestly claim."
- duration: 25s
- poster: 19s
- transition_in: zoom-through
- status: outline
- src: compositions/frames/13-model-clicks.html
- type: branding
- persuasion: Callback + generalization
- beat: aha + satisfaction
- blueprint: grid-card-assemble
- act: ending
- evidence: DERIVED
- source: https://github.com/swyxio/claude-code-internals/blob/main/docs/maps/system-map.md

narrativeRole: Pays off the three shapes and three questions introduced in the opening.

keyMessage: The artifact becomes an inspectable model when behavior, authority, and proof are kept connected.

## Frame 14 — Trace, pin, test

- scene: The atlas collapses to three verbs—TRACE THE TURN, PIN THE EXTENSION, TEST THE BOUNDARY—then resolves to the repository route and the specimen spine.
- voiceover: "Trace the turn. Pin the extension. Test the boundary. That is how a compiled agent becomes legible—without pretending we recovered its source."
- duration: 15s
- poster: 11s
- transition_in: cut
- status: outline
- src: compositions/frames/14-trace-pin-test.html
- type: cta
- persuasion: Rule of three + distillation
- beat: resolve + inspiration
- blueprint: kinetic-type-beats
- act: ending
- evidence: N/A
- source: https://swyxio.github.io/claude-code-internals/

narrativeRole: Leaves a short operational mnemonic and a direct route into the atlas.

keyMessage: TRACE · PIN · TEST.
