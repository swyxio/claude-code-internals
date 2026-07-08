# Protocols and Native Modules

Claude Code bridges several protocols: provider streaming, CLI stream-JSON, MCP, local IPC, remote control, and N-API calls. The public reconstruction documents boundaries and identities without copying protocol implementation bodies.

## CLI stream-JSON

The root help establishes two independent directions:

- `--input-format=stream-json` accepts realtime structured input in print mode.
- `--output-format=stream-json` emits realtime structured output.

Optional output includes partial messages, hook events, prompt suggestions, and replayed user-message acknowledgments. A robust consumer should:

1. frame input as complete JSON records according to the versioned contract;
2. dispatch output by explicit type;
3. tolerate unknown fields and event types;
4. distinguish model content, tool calls/results, hooks, session state, and final result;
5. preserve ordering but not assume every event is model-generated;
6. handle cancellation, EOF, and non-zero process exit independently.

The current evidence captures help, not a full JSON Schema for every event. The independent [`reconstructed/`](https://github.com/swyxio/claude-code-internals/tree/main/reconstructed) contracts should therefore mark optional/unknown fields explicitly.

## MCP

MCP client configuration supports stdio, HTTP, and SSE forms; `mcp serve` exposes a server. Project servers carry pending/approved/rejected state. Strict mode excludes implicit configuration sources.

Protocol conformance does not establish trust. Stdio crosses a process boundary; HTTP/SSE crosses a network boundary; both can provide model-visible descriptions and receive sensitive call arguments.

## Local and remote IPC

<span class="evidence-label derived">Derived</span> [`socket.directory-mode`](https://github.com/swyxio/claude-code-internals/blob/main/evidence/anchors.json) supports a local socket-directory requirement of `0700` permissions.

<span class="evidence-label derived">Derived</span> [`remote.peer-isolation`](https://github.com/swyxio/claude-code-internals/blob/main/evidence/anchors.json) supports explicit approval before cross-machine messages in an isolation mode.

The evidence does not yet publish framing, authentication, replay protection, or protocol versions for IDE, browser, or remote-control channels. Those remain high-priority reconstruction gaps.

## Embedded native modules

| Virtual module | File offset | Size | SHA-256 |
|---|---:|---:|---|
| `image-processor.node` | 218,535,992 | 1,249,368 | `77d12f8b…597b970` |
| `computer-use-swift.node` | 219,785,398 | 879,672 | `5ce6c077…6a88524` |
| `computer-use-input.node` | 220,665,108 | 1,692,096 | `55bd5d0d…0344da` |
| `audio-capture.node` | 222,357,237 | 438,112 | `6460a7e7…bfc3c37` |
| `url-handler.node` | 222,795,380 | 336,864 | `d8d71dab…dd6853f` |

Full digests and metadata are in [`binary-inventory.json`](https://github.com/swyxio/claude-code-internals/blob/main/evidence/binary-inventory.json). The modules are embedded artifacts and are not committed separately.

## JavaScript binding loaders

Each native module has a roughly 2 KB CJS loader. The loaders form convenient public reconstruction boundaries because their virtual names and content hashes are provided by the Bun table. The reconstructed interfaces should describe argument/result shapes only when call-site evidence supports them.

## Native security review questions

- Are paths canonicalized before crossing into native code?
- Are image/audio buffer sizes bounded before allocation?
- Does URL handling distinguish trusted schemes and reject argument injection?
- How are macOS Accessibility, Input Monitoring, and microphone permissions surfaced?
- Does native failure return structured errors or terminate the process?
- Are native modules loaded only from the signed embedded graph, or can search paths be influenced?

These questions are not findings. They identify where JavaScript-level permission assumptions meet code with direct OS access.
