/**
 * SCHEMATIC — NOT BEHAVIORALLY EQUIVALENT.
 * Reconstruction of the model streaming boundary used by the turn engine.
 * Provenance: agent-loop.core-generator, compaction.lifecycle.
 * Confidence: observed = streaming and fallback concepts; derived = normalized
 * frames and policy boundary; hypothesis = exact event shapes and retry values.
 */

export interface ModelRequest {
  model: string;
  messages: unknown[];
  system: unknown[];
  tools: unknown[];
  thinking?: {
    type: "adaptive" | "enabled" | "disabled";
    budgetTokens?: number;
  };
  effort?: string;
  maxTokens?: number;
  betas?: string[];
  promptCaching?: boolean;
  outputSchema?: unknown;
  signal: AbortSignal;
}

export type StreamDelta =
  | { type: "message-start"; messageId: string; requestId?: string }
  | { type: "text"; text: string }
  | { type: "thinking"; thinking: string }
  | { type: "tool-use-start"; id: string; name: string }
  | { type: "tool-use-json"; id: string; partialJson: string }
  | {
      type: "usage";
      input: number;
      output: number;
      cacheRead?: number;
      cacheWrite?: number;
    }
  | { type: "message-stop"; stopReason: string };

export interface ApiTransport {
  stream(request: ModelRequest): AsyncIterable<StreamDelta>;
}

export interface StreamPolicy {
  fallbackModels: string[];
  isRetryable(error: unknown): boolean;
  shouldCompact(error: unknown): boolean;
  maxRetriesPerModel: number;
}

export async function* streamWithFallback(
  request: ModelRequest,
  transport: ApiTransport,
  policy: StreamPolicy,
): AsyncGenerator<StreamDelta, { model: string }> {
  const candidates = [request.model, ...policy.fallbackModels];

  for (const model of candidates) {
    for (let attempt = 0; attempt <= policy.maxRetriesPerModel; attempt += 1) {
      try {
        for await (const delta of transport.stream({ ...request, model }))
          yield delta;
        return { model };
      } catch (error) {
        if (request.signal.aborted) throw error;
        if (policy.shouldCompact(error)) throw error; // turn engine owns compaction
        if (!policy.isRetryable(error)) throw error;
        if (attempt === policy.maxRetriesPerModel) break;
      }
    }
  }

  throw new Error("All configured model candidates failed");
}

/**
 * Tool input arrives incrementally. The observed implementation validates the
 * completed value at the client tool boundary; this accumulator makes that
 * boundary explicit without copying its minified parser.
 */
export class ToolJsonAccumulator {
  readonly #chunks = new Map<string, string[]>();

  append(id: string, partialJson: string): void {
    const chunks = this.#chunks.get(id) ?? [];
    chunks.push(partialJson);
    this.#chunks.set(id, chunks);
  }

  finish(id: string): unknown {
    const json = (this.#chunks.get(id) ?? []).join("");
    this.#chunks.delete(id);
    return JSON.parse(json || "{}");
  }
}
