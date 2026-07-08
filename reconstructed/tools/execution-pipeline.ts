/**
 * SCHEMATIC — NOT BEHAVIORALLY EQUIVALENT.
 * Reconstructed per-tool execution pipeline.
 * Provenance: tools.execution-pipeline, hooks.lifecycle,
 * tools.bash-readonly-source.
 * Confidence: observed = coerce/schema, validateInput, PreToolUse, permission,
 * and call ordering in the shared pipeline; derived = readable contracts;
 * hypothesis = hook aggregation, concurrency, and error/result presentation.
 */

export interface Tool<Input = unknown, Output = unknown> {
  name: string;
  inputSchema: { parse(value: unknown): Input };
  coerceInput?(value: unknown): { input: unknown; shapeClass?: string } | null;
  validateInput?(value: Input, context: ToolContext): Promise<string | null>;
  call(value: Input, context: ToolContext): AsyncIterable<ToolProgress<Output>>;
  mapResult?(result: Output, toolUseId: string): unknown;
  isMcp?: boolean;
  mcpInfo?: {
    serverName: string;
    toolName: string;
    effectiveMaxPermission?: string;
  };
}

export interface ToolContext {
  toolUseId: string;
  assistantMessageId: string;
  abortSignal: AbortSignal;
  permissionMode: string;
  queryChainId?: string;
  queryDepth?: number;
}

export type ToolProgress<Output> =
  | { type: "progress"; data: unknown }
  | { type: "result"; data: Output };

export type ToolPipelineEvent =
  | { type: "progress"; toolUseId: string; data: unknown }
  | { type: "hook-message"; event: string; data: unknown }
  | { type: "deferred"; toolUseId: string; data?: unknown }
  | { type: "result"; toolUseId: string; content: unknown; isError: false }
  | { type: "result"; toolUseId: string; content: string; isError: true };

export interface ToolPipelineDependencies {
  authorize(
    tool: Tool,
    input: unknown,
    context: ToolContext,
    preToolPermissionResult?: unknown,
  ): Promise<PermissionDecision>;
  runPreToolUse(payload: unknown): Promise<PreToolHookOutcome>;
  runPostToolHooks(
    event: "PostToolUse" | "PostToolUseFailure",
    payload: unknown,
  ): AsyncIterable<unknown>;
  telemetry(event: string, attributes: Record<string, unknown>): void;
}

export interface PreToolHookOutcome {
  messages: unknown[];
  updatedInput?: unknown;
  permissionResult?: unknown;
  control?: "continue" | "stop" | "defer";
  reason?: string;
}

export type PermissionDecision =
  | { behavior: "allow"; updatedInput?: unknown }
  | { behavior: "deny"; message: string }
  | { behavior: "ask"; message: string };

export async function* executeTool(
  tool: Tool,
  rawInput: unknown,
  context: ToolContext,
  dependencies: ToolPipelineDependencies,
): AsyncGenerator<ToolPipelineEvent> {
  const coerced = tool.coerceInput?.(rawInput);
  const candidate = coerced?.input ?? rawInput;
  let input: unknown;

  try {
    input = tool.inputSchema.parse(candidate);
  } catch (error) {
    dependencies.telemetry("tool_input_validation_failed", {
      tool: tool.name,
      isMcp: tool.isMcp ?? false,
      errorType: error instanceof Error ? error.name : "unknown",
    });
    yield errorResult(context.toolUseId, "InputValidationError", error);
    return;
  }

  const semanticError = await tool.validateInput?.(input, context);
  if (semanticError) {
    yield errorResult(context.toolUseId, "InputValidationError", semanticError);
    return;
  }

  const preTool = await dependencies.runPreToolUse({
    toolName: tool.name,
    toolInput: input,
    toolUseId: context.toolUseId,
  });
  for (const hookMessage of preTool.messages) {
    yield { type: "hook-message", event: "PreToolUse", data: hookMessage };
  }
  input = preTool.updatedInput ?? input;
  if (preTool.control === "defer") {
    yield { type: "deferred", toolUseId: context.toolUseId, data: preTool };
    return;
  }
  if (preTool.control === "stop") {
    yield errorResult(
      context.toolUseId,
      "PreToolUseStopped",
      preTool.reason ?? "Execution stopped by PreToolUse",
    );
    return;
  }

  const decision = await dependencies.authorize(
    tool,
    input,
    context,
    preTool.permissionResult,
  );
  if (decision.behavior !== "allow") {
    yield errorResult(context.toolUseId, "PermissionDenied", decision.message);
    return;
  }
  input = decision.updatedInput ?? input;

  try {
    for await (const frame of tool.call(input, context)) {
      if (context.abortSignal.aborted) throw context.abortSignal.reason;
      if (frame.type === "progress") {
        yield {
          type: "progress",
          toolUseId: context.toolUseId,
          data: frame.data,
        };
      } else {
        const content =
          tool.mapResult?.(frame.data, context.toolUseId) ?? frame.data;
        for await (const hookMessage of dependencies.runPostToolHooks(
          "PostToolUse",
          {
            toolName: tool.name,
            toolInput: input,
            toolResponse: content,
            toolUseId: context.toolUseId,
          },
        )) {
          yield {
            type: "hook-message",
            event: "PostToolUse",
            data: hookMessage,
          };
        }
        yield {
          type: "result",
          toolUseId: context.toolUseId,
          content,
          isError: false,
        };
      }
    }
  } catch (error) {
    for await (const hookMessage of dependencies.runPostToolHooks(
      "PostToolUseFailure",
      {
        toolName: tool.name,
        toolInput: input,
        error: error instanceof Error ? error.message : String(error),
        toolUseId: context.toolUseId,
      },
    )) {
      yield {
        type: "hook-message",
        event: "PostToolUseFailure",
        data: hookMessage,
      };
    }
    yield errorResult(context.toolUseId, "ToolExecutionError", error);
  }
}

function errorResult(
  toolUseId: string,
  kind: string,
  error: unknown,
): ToolPipelineEvent {
  const message = error instanceof Error ? error.message : String(error);
  return {
    type: "result",
    toolUseId,
    content: `<tool_use_error>${kind}: ${message}</tool_use_error>`,
    isError: true,
  };
}
