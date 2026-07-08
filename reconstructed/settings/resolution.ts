/**
 * SCHEMATIC — NOT BEHAVIORALLY EQUIVALENT.
 * Layering/provenance reconstruction for effective settings.
 * Provenance: permissions.managed-only, permissions.disable-bypass,
 * mcp.project-approval, mcp.strict-mode.
 * Confidence: observed = source names, provenance, managed-policy controls, and
 * project MCP approval; derived = resolver contracts; hypothesis = per-key
 * precedence and merge behavior, which are intentionally injected.
 */

import type { ClaudeSettings, PermissionMode } from "./schema";

export type SettingsSource =
  | "userSettings"
  | "projectSettings"
  | "localSettings"
  | "flagSettings"
  | "policySettings"
  | "remoteSettings";

export interface SettingsLayer {
  source: SettingsSource;
  path?: string;
  settings: ClaudeSettings;
  policyOrigin?: string;
}

export interface SettingContribution {
  layer: SettingsLayer;
  value: unknown;
}

export interface SettingsPrecedence {
  order(
    key: keyof ClaudeSettings,
    contributions: SettingContribution[],
  ): SettingContribution[];
}

export interface SettingsMergePolicy {
  resolve(
    key: keyof ClaudeSettings,
    ordered: SettingContribution[],
  ): { value: unknown; owner?: SettingsLayer } | undefined;
}

export interface ResolvedSettings {
  effective: ClaudeSettings;
  layers: SettingsLayer[];
  provenance: Partial<Record<keyof ClaudeSettings, SettingsLayer>>;
}

export function resolveSettings(
  layers: SettingsLayer[],
  precedence: SettingsPrecedence,
  merge: SettingsMergePolicy,
): ResolvedSettings {
  const effective: ClaudeSettings = {};
  const provenance: ResolvedSettings["provenance"] = {};
  const keys = new Set<keyof ClaudeSettings>();
  for (const layer of layers)
    for (const key of Object.keys(layer.settings))
      keys.add(key as keyof ClaudeSettings);

  for (const key of keys) {
    const contributions = layers.flatMap((layer) => {
      const value = layer.settings[key];
      return value === undefined ? [] : [{ layer, value }];
    });
    const resolved = merge.resolve(key, precedence.order(key, contributions));
    if (!resolved) continue;
    (effective as Record<string, unknown>)[key] = resolved.value;
    if (resolved.owner) provenance[key] = resolved.owner;
  }
  return { effective, layers: [...layers], provenance };
}

export interface ManagedPermissionConstraints {
  allowManagedPermissionRulesOnly: boolean;
  disableBypassPermissionsMode: boolean;
}

export function isPermissionRuleSourceEffective(
  source: SettingsSource,
  constraints: ManagedPermissionConstraints,
): boolean {
  return (
    !constraints.allowManagedPermissionRulesOnly || source === "policySettings"
  );
}

export function isPermissionModeAvailable(
  mode: PermissionMode,
  constraints: ManagedPermissionConstraints,
): boolean {
  return !(
    mode === "bypassPermissions" && constraints.disableBypassPermissionsMode
  );
}

export function projectMcpApproval(
  name: string,
  settings: ClaudeSettings,
): "approved" | "rejected" | "pending" {
  if (settings.disabledMcpjsonServers?.includes(name)) return "rejected";
  if (
    settings.enableAllProjectMcpServers ||
    settings.enabledMcpjsonServers?.includes(name)
  )
    return "approved";
  return "pending";
}
