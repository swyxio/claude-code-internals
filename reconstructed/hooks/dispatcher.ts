/**
 * SCHEMATIC — NOT BEHAVIORALLY EQUIVALENT.
 * Reconstructed hook registry, matcher, and execution semantics.
 * Provenance: hooks.lifecycle, plugins.component-inventory.
 * Confidence: observed = event vocabulary; derived = dispatcher interface;
 * hypothesis = payload/result shapes, matcher syntax, precedence, ordering,
 * and concurrency. Unknown contracts remain opaque or injected.
 */

export const HOOK_EVENTS = [
  "PreToolUse",
  "PostToolUse",
  "PostToolUseFailure",
  "PostToolBatch",
  "Notification",
  "UserPromptSubmit",
  "UserPromptExpansion",
  "SessionStart",
  "SessionEnd",
  "Stop",
  "StopFailure",
  "SubagentStart",
  "SubagentStop",
  "PreCompact",
  "PostCompact",
  "PermissionRequest",
  "PermissionDenied",
  "Setup",
  "TeammateIdle",
  "TaskCreated",
  "TaskCompleted",
  "Elicitation",
  "ElicitationResult",
  "ConfigChange",
  "WorktreeCreate",
  "WorktreeRemove",
  "InstructionsLoaded",
  "CwdChanged",
  "FileChanged",
  "MessageDisplay",
] as const;

export type HookEvent = (typeof HOOK_EVENTS)[number];

export interface HookDefinition {
  source: "settings" | "plugin" | "skill" | "sdk";
  matcher?: string;
  type: "command" | "prompt" | "agent" | "http" | "mcp";
  command?: string;
  prompt?: string;
  url?: string;
  timeoutMs?: number;
  pluginRoot?: string;
  pluginData?: string;
}

export interface HookInput<TPayload = unknown> {
  hookEventName: HookEvent;
  payload: TPayload;
}

/** Result contracts vary by event and are not asserted by this schematic. */
export type HookOutput = unknown;

export interface HookRunner {
  run(
    hook: HookDefinition,
    input: HookInput,
    signal: AbortSignal,
  ): Promise<HookOutput>;
}

export interface HookMatcher {
  matches(hook: HookDefinition, input: HookInput): boolean;
}

export interface HookOrderingPolicy {
  execute(
    hooks: HookDefinition[],
    run: (hook: HookDefinition) => Promise<HookOutput>,
    signal: AbortSignal,
  ): Promise<HookOutput[]>;
}

export async function dispatchHooks(
  hooks: HookDefinition[],
  input: HookInput,
  runner: HookRunner,
  matcher: HookMatcher,
  ordering: HookOrderingPolicy,
  signal: AbortSignal,
): Promise<HookOutput[]> {
  const matching = hooks.filter((hook) => matcher.matches(hook, input));
  return ordering.execute(
    matching,
    (hook) => runner.run(hook, input, signal),
    signal,
  );
}
