# Chapter edit map

The master timeline is 586 seconds. Chapter cards are included in every standalone render; the master-only opening and closing are excluded.

| Output | Frames | Master range | Duration | Story job |
|---|---:|---:|---:|---|
| Master opening | 01–03 | `00:00–00:28` | 28s | Stakes, thesis, and seven-lens map |
| `start.mp4` | 04–09 | `00:28–01:44` | 76s | Specimen, method, evidence classes, publication boundary |
| `runtime.mp4` | 10–15 | `01:44–03:10` | 86s | Container, entrypoints, agent loop, tool gauntlet, idle |
| `extensions.mp4` | 16–21 | `03:10–04:30` | 80s | Capability lattice, plugin trust, hooks, MCP, provenance |
| `security.mp4` | 22–27 | `04:30–05:49` | 79s | Threat circuit, seven gates, permission, sandbox, audit stack |
| `observations.mp4` | 28–33 | `05:49–07:04` | 75s | Probe envelope, invocation split, tool loop, extension dynamics |
| `evidence.mp4` | 34–39 | `07:04–08:14` | 70s | Claim chain, ledger, anchor limits, validators, version scope |
| `reference.mp4` | 40–45 | `08:14–09:22` | 68s | Exact search, four indexes, source routes, verification caveat |
| Master closing | 46–47 | `09:22–09:46` | 24s | Seven-lens callback and four-verb operating model |

## Stitching rules

- Master seams use the chapter card's full four-second stinger.
- Standalone files begin with 250 ms of clean room, then the same card.
- Standalone files end with a 750 ms hold on the chapter source route.
- The master preserves continuous MIDI phase across seams; chapter files start each cue at bar one.
- Captions restart their local clock at zero in standalone renders.
