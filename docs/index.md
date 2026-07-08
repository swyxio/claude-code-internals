---
hide:
  - navigation
  - toc
---

<section class="atlas-hero">
  <div class="atlas-hero__copy">
    <div class="atlas-hero__eyebrow">Independent runtime research · snapshot 2.1.177</div>
    <h1>A field atlas of one compiled agent runtime.</h1>
    <p class="atlas-hero__lead">
      Follow Claude Code from native container to provider stream, tool execution,
      persistence, extensions, and trust boundaries—then continue from each claim
      into committed evidence and independently authored reconstruction contracts.
    </p>
    <div class="atlas-hero__actions">
      <a class="atlas-action atlas-action--primary" href="maps/system-map/">Open the system map <span aria-hidden="true">→</span></a>
      <a class="atlas-action" href="audiences/">Choose by goal</a>
    </div>
  </div>

  <aside class="atlas-specimen" aria-label="Artifact identity">
    <div class="atlas-specimen__label">Specimen register</div>
    <dl>
      <dt>Artifact</dt><dd>Claude Code 2.1.177</dd>
      <dt>Target</dt><dd>darwin-arm64</dd>
      <dt>Size</dt><dd>225,124,512 bytes</dd>
      <dt>Graph</dt><dd>11 modules · entry 0 · flags 15</dd>
      <dt>SHA-256</dt><dd>eb073035…e40ed9</dd>
    </dl>
    <div class="atlas-module-band" aria-hidden="true">
      <span></span><span></span><span></span><span></span><span></span><span></span>
      <span></span><span></span><span></span><span></span><span></span>
    </div>
  </aside>

  <div class="atlas-address" role="figure" aria-label="Proportional binary layout: 72,368,128-byte prefix, 150,764,738-byte Bun section, and 1,991,646-byte suffix">
    <div class="atlas-address__header">
      <span>Artifact address strip</span>
      <code>0x00000000 → 0x0D6B20A0</code>
    </div>
    <div class="atlas-address__bar" aria-hidden="true">
      <span class="atlas-address__segment atlas-address__segment--prefix">Mach-O prefix</span>
      <span class="atlas-address__segment atlas-address__segment--bun">__BUN,__bun</span>
      <span class="atlas-address__segment atlas-address__segment--suffix"></span>
    </div>
    <div class="atlas-address__legend">
      <span>Prefix · 72,368,128 B</span>
      <span>Bun section @ 0x04504000 · 150,764,738 B</span>
      <span>Suffix · 1,991,646 B</span>
      <a href="https://github.com/swyxio/claude-code-internals/blob/main/evidence/binary-topology.json">Open derived topology</a>
    </div>
  </div>
</section>

<p class="atlas-legal-note">
  Independent research; not affiliated with or endorsed by Anthropic. The atlas
  publishes evidence summaries and explanatory contracts, not the executable or
  recovered proprietary source. <a href="legal-and-ethics/">Read the publication boundary.</a>
</p>

## Navigate by the question

<div class="atlas-route-list">
  <a class="atlas-route" href="maps/execution-flow/">
    <span class="atlas-route__verb">Trace</span>
    <strong>Follow a tool call</strong>
    <span class="atlas-route__detail">Startup → model stream → permission decision → local execution → tool result.</span>
    <span class="atlas-route__arrow" aria-hidden="true">→</span>
  </a>
  <a class="atlas-route" href="maps/extension-surfaces/">
    <span class="atlas-route__verb">Extend</span>
    <strong>Choose an extension surface</strong>
    <span class="atlas-route__detail">Compare instructions, skills, agents, hooks, plugins, MCP, and headless integration.</span>
    <span class="atlas-route__arrow" aria-hidden="true">→</span>
  </a>
  <a class="atlas-route" href="maps/threat-model/">
    <span class="atlas-route__verb">Secure</span>
    <strong>Audit a trust boundary</strong>
    <span class="atlas-route__detail">See what crosses the workspace, provider, extension, persistence, and update boundaries.</span>
    <span class="atlas-route__arrow" aria-hidden="true">→</span>
  </a>
  <a class="atlas-route" href="maps/evidence-code-cross-reference/">
    <span class="atlas-route__verb">Verify</span>
    <strong>Follow a claim to proof</strong>
    <span class="atlas-route__detail">Move from prose to claim ID, sanitized evidence, binary anchor, and reconstructed contract.</span>
    <span class="atlas-route__arrow" aria-hidden="true">→</span>
  </a>
</div>

## Evidence posture

Every non-trivial statement carries one of three confidence classes. The visual
language is deliberately structural: text and shape identify the class, while
color is only a second signal.

<div class="atlas-basis-ledger" role="figure" aria-label="The claim ledger contains 32 observed facts, 52 derived interpretations, and one hypothesis">
  <div class="atlas-basis-ledger__bar" aria-hidden="true"><span></span><span></span><span></span></div>
  <div class="atlas-basis-ledger__labels">
    <span><span class="evidence-label observed">Observed</span> 32 artifact or runtime facts</span>
    <span><span class="evidence-label derived">Derived</span> 52 bounded interpretations</span>
    <span><span class="evidence-label hypothesis">Hypothesis</span> 1 explicit open model</span>
  </div>
</div>

<div class="atlas-established">
  <div class="atlas-established__item">
    <div><span class="evidence-label observed">Observed</span></div>
    <p>The active launcher resolves to a signed arm64 Mach-O at <code>~/.local/share/claude/versions/2.1.177</code>. Its SHA-256 is <code>eb0730351be2f02b482b1855870f5877489085aac86b0c4c1db4e458d9e40ed9</code>. <a href="https://github.com/swyxio/claude-code-internals/blob/main/evidence/provenance.json">Artifact provenance</a></p>
  </div>
  <div class="atlas-established__item">
    <div><span class="evidence-label observed">Observed</span></div>
    <p>The executable contains one <code>__BUN,__bun</code> section with an 11-module graph: one large JavaScript entry module, five native-binding loaders, and five matching N-API modules. <a href="https://github.com/swyxio/claude-code-internals/blob/main/evidence/binary-inventory.json">Binary inventory</a></p>
  </div>
  <div class="atlas-established__item">
    <div><span class="evidence-label observed">Observed</span></div>
    <p>Isolated probes exercised provider streaming, a three-request <code>Read → Bash</code> loop, session persistence, settings precedence, concurrent hooks, MCP stdio, extension discovery, permissions, and sandbox containment. <a href="dynamics/">Browse runtime observations</a></p>
  </div>
  <div class="atlas-established__item">
    <div><span class="evidence-label derived">Derived</span></div>
    <p>The executable is best modeled as a local orchestration runtime around a remote model service. The client owns context assembly, extension discovery, permissions, tool execution, persistence, integrations, and transport selection.</p>
  </div>
</div>

## System at a glance

```mermaid
flowchart LR
    accTitle: Claude Code internals - System at a glance
    accDescr: Diagram showing system at a glance in the Claude Code internals section.
    User["User or SDK client"] --> CLI["CLI and protocol adapters"]
    CLI --> Config["Configuration and extension discovery"]
    Config --> Loop["Agent turn engine"]
    Loop --> Provider["Provider transport"]
    Provider --> Model["Remote model service"]
    Model --> Loop
    Loop --> Policy["Permission and sandbox policy"]
    Policy --> Tools["Local tools and integrations"]
    Tools --> FS["Workspace, shell, network, MCP, IDE"]
    Loop --> Store["Transcripts, tasks, memory, checkpoints"]
    Hooks["Hooks, skills, agents, plugins"] --> Config
    Hooks --> Loop
```

Continue with the [one-page boundary map](maps/system-map.md), choose an
[audience-specific route](audiences/index.md), or inspect the
[evidence-to-code index](maps/evidence-code-cross-reference.md).

## Deliberate omissions

The project does not publish the native executable, extracted JavaScript,
native add-ons, deminified function bodies, authentication material, local
configuration, transcripts, or private debug data. Reconstructed modules are
independently authored explanatory contracts; they may be incomplete and are
not represented as Anthropic's original source tree.
