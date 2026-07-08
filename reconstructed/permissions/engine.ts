/**
 * SCHEMATIC — NOT BEHAVIORALLY EQUIVALENT.
 * Reconstructed permission decision engine.
 * Provenance: permissions.managed-only, permissions.disable-bypass,
 * permissions.subprocess-scrub, sandbox.auto-allow,
 * auto-mode.anti-bypass.
 * Confidence: observed = named controls and modes; derived = normalized policy
 * evidence; hypothesis = rule grammar, matching, decision precedence, and
 * classifier implementation, all delegated to injected contracts.
 */

export type PermissionBehavior = "allow" | "ask" | "deny" | "passthrough";
export type PermissionMode =
  | "default"
  | "acceptEdits"
  | "plan"
  | "dontAsk"
  | "bypassPermissions"
  | "auto";

export interface PermissionRule {
  source:
    | "policySettings"
    | "flagSettings"
    | "command"
    | "localSettings"
    | "projectSettings"
    | "userSettings"
    | "cliArg"
    | "session";
  behavior: Exclude<PermissionBehavior, "passthrough">;
  toolName: string;
  ruleContent?: string;
}

export interface DecisionReason {
  type:
    | "rule"
    | "hook"
    | "mode"
    | "classifier"
    | "safetyCheck"
    | "sandboxOverride"
    | "workingDir"
    | "orgCeiling"
    | "other";
  detail: string;
}

export interface PermissionDecision {
  behavior: Exclude<PermissionBehavior, "passthrough">;
  reason: DecisionReason;
  message?: string;
  updatedInput?: unknown;
}

export interface PermissionRequest {
  toolName: string;
  input: unknown;
  mode: PermissionMode;
  rules: PermissionRule[];
  constraints: PermissionConstraints;
  sandboxed: boolean;
  toolCheck(): Promise<PermissionDecision | { behavior: "passthrough" }>;
  permissionHook(): Promise<PermissionDecision | null>;
  classify(): Promise<{
    shouldBlock: boolean;
    attemptedBypass?: boolean;
    unavailable?: boolean;
    reason?: string;
  }>;
}

export interface PermissionConstraints {
  allowManagedPermissionRulesOnly: boolean;
  disableBypassPermissionsMode: boolean;
  autoAllowBashIfSandboxed: boolean;
  subprocessEnvironmentScrub: boolean;
}

export interface RuleMatcher {
  isManaged(rule: PermissionRule): boolean;
  matches(rule: PermissionRule, request: PermissionRequest): boolean;
}

export interface PermissionEvaluation {
  request: PermissionRequest;
  applicableRules: PermissionRule[];
  bypassPermissionsAvailable: boolean;
  sandboxAutoAllowEligible: boolean;
  subprocessRequiresExplicitToolAllow: boolean;
  toolCheck(): Promise<PermissionDecision | { behavior: "passthrough" }>;
  permissionHook(): Promise<PermissionDecision | null>;
  classify(): Promise<{
    shouldBlock: boolean;
    attemptedBypass?: boolean;
    unavailable?: boolean;
    reason?: string;
  }>;
}

/** Exact rule precedence and policy composition remain intentionally opaque. */
export interface DecisionPrecedencePolicy {
  decide(evaluation: PermissionEvaluation): Promise<PermissionDecision>;
}

export async function decidePermission(
  request: PermissionRequest,
  matcher: RuleMatcher,
  policy: DecisionPrecedencePolicy,
): Promise<PermissionDecision> {
  const rules = request.constraints.allowManagedPermissionRulesOnly
    ? request.rules.filter((rule) => matcher.isManaged(rule))
    : request.rules;
  const applicableRules = rules.filter((rule) =>
    matcher.matches(rule, request),
  );

  return policy.decide({
    request,
    applicableRules,
    bypassPermissionsAvailable:
      !request.constraints.disableBypassPermissionsMode,
    sandboxAutoAllowEligible:
      request.constraints.autoAllowBashIfSandboxed &&
      request.sandboxed &&
      request.toolName === "Bash",
    subprocessRequiresExplicitToolAllow:
      request.constraints.subprocessEnvironmentScrub,
    toolCheck: () => request.toolCheck(),
    permissionHook: () => request.permissionHook(),
    classify: async () => {
      const result = await request.classify();
      // Anchored invariant: tunneling around a prior denial is classified as
      // bypass behavior. The surrounding policy chooses where it participates.
      return result.attemptedBypass
        ? {
            ...result,
            shouldBlock: true,
            reason: result.reason ?? "Auto-mode bypass attempt",
          }
        : result;
    },
  });
}
