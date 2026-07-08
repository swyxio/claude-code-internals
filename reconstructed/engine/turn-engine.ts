/**
 * SCHEMATIC — NOT BEHAVIORALLY EQUIVALENT.
 * Model/tool turn state machine reconstructed from the async generator core.
 * Provenance: agent-loop.core-generator, agent-loop.idle-boundary,
 * compaction.lifecycle, tools.execution-pipeline.
 * Confidence: observed = central async-generator and major control concepts;
 * derived = readable states/events; hypothesis = exact phase order, counters,
 * helper boundaries, error mapping, and scheduling.
 */

export interface TurnRequest {
  messages: ConversationMessage[];
  systemPrompt: string[];
  userContext: Record<string, unknown>;
  systemContext: Record<string, unknown>;
  model: string;
  fallbackModels: string[];
  maxTurns?: number;
  maxBudgetUsd?: number;
  maxOutputTokens?: number;
  stopHookAlreadyActive?: boolean;
  querySource: string;
  abortSignal: AbortSignal;
}

export type ConversationMessage = {
  role: "user" | "assistant" | "system";
  content: unknown;
  uuid?: string;
};

export type TurnEvent =
  | { type: "model-message"; message: ConversationMessage }
  | { type: "tool-progress"; toolUseId: string; payload: unknown }
  | { type: "tool-result"; toolUseId: string; result: unknown }
  | { type: "command-lifecycle"; uuid: string; state: "started" | "completed" }
  | { type: "hook-event"; event: string; payload: unknown }
  | { type: "compaction"; beforeTokens: number; afterTokens: number };

export type TurnExitReason =
  | "completed"
  | "hook_stopped"
  | "max_turns"
  | "aborted_streaming"
  | "prompt_too_long"
  | "image_error"
  | "model_error"
  | "max_budget_usd";

interface MutableTurnState {
  messages: ConversationMessage[];
  turnCount: number;
  spentUsd: number;
  stopHookBlockingCount: number;
  hasAttemptedReactiveCompact: boolean;
  currentModelIndex: number;
}

export interface TurnDependencies {
  streamModel(
    state: Readonly<MutableTurnState>,
    request: TurnRequest,
  ): AsyncIterable<ModelFrame>;
  executeTools(
    frames: ModelFrame[],
    state: MutableTurnState,
  ): AsyncIterable<TurnEvent>;
  compact(state: MutableTurnState): Promise<boolean>;
  runStopHooks(state: MutableTurnState): Promise<"allow" | "continue" | "stop">;
  estimateCost(frames: ModelFrame[]): number;
  classifyModelError(
    error: unknown,
  ): "context-overflow" | "image-error" | "retryable" | "fatal";
}

export type ModelFrame =
  | { type: "assistant"; message: ConversationMessage }
  | { type: "tool-use"; id: string; name: string; input: unknown }
  | { type: "usage"; inputTokens: number; outputTokens: number }
  | { type: "error"; kind: string; retryable: boolean };

export async function* runTurn(
  request: TurnRequest,
  dependencies: TurnDependencies,
): AsyncGenerator<TurnEvent, TurnExitReason> {
  const state: MutableTurnState = {
    messages: [...request.messages],
    turnCount: 1,
    spentUsd: 0,
    stopHookBlockingCount: 0,
    hasAttemptedReactiveCompact: false,
    currentModelIndex: 0,
  };

  while (!request.abortSignal.aborted) {
    if (request.maxTurns !== undefined && state.turnCount > request.maxTurns)
      return "max_turns";
    if (
      request.maxBudgetUsd !== undefined &&
      state.spentUsd >= request.maxBudgetUsd
    )
      return "max_budget_usd";

    const frames: ModelFrame[] = [];
    try {
      for await (const frame of dependencies.streamModel(state, request)) {
        frames.push(frame);
        if (frame.type === "assistant") {
          state.messages.push(frame.message);
          yield { type: "model-message", message: frame.message };
        }
      }
    } catch (error) {
      const classification = dependencies.classifyModelError(error);
      if (classification === "context-overflow") {
        if (!state.hasAttemptedReactiveCompact) {
          state.hasAttemptedReactiveCompact = true;
          if (await dependencies.compact(state)) continue;
        }
        return "prompt_too_long";
      }
      if (classification === "image-error") return "image_error";
      if (
        classification === "retryable" &&
        state.currentModelIndex < request.fallbackModels.length
      ) {
        state.currentModelIndex += 1;
        continue;
      }
      return "model_error";
    }

    state.spentUsd += dependencies.estimateCost(frames);
    const toolUses = frames.filter((frame) => frame.type === "tool-use");
    if (toolUses.length > 0) {
      for await (const event of dependencies.executeTools(toolUses, state))
        yield event;
      state.turnCount += 1;
      continue;
    }

    const stopDecision = await dependencies.runStopHooks(state);
    if (stopDecision === "continue") {
      state.stopHookBlockingCount += 1;
      state.turnCount += 1;
      continue;
    }
    return stopDecision === "stop" ? "hook_stopped" : "completed";
  }

  return "aborted_streaming";
}
