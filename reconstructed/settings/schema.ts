/**
 * SCHEMATIC — NOT BEHAVIORALLY EQUIVALENT.
 * Reconstructed settings contract.
 * Provenance: sandbox.no-escape, sandbox.auto-allow,
 * sandbox.fail-closed, sandbox.weaker-network, sandbox.weaker-nested,
 * mcp.transports, mcp.project-approval,
 * memory.enable, memory.project-path-hardening.
 * Confidence: observed = keys/unions; derived = grouping; hypothesis = omitted
 * defaults and the exact validation library API.
 */

export type PermissionMode =
  | "default"
  | "acceptEdits"
  | "plan"
  | "dontAsk"
  | "bypassPermissions"
  | "auto";

export interface PermissionSettings {
  defaultMode?: PermissionMode;
  allow?: string[];
  ask?: string[];
  deny?: string[];
  additionalDirectories?: string[];
}

export interface SandboxSettings {
  enabled?: boolean;
  failIfUnavailable?: boolean;
  autoAllowBashIfSandboxed?: boolean;
  excludedCommands?: string[];
  allowUnsandboxedCommands?: boolean;
  enableWeakerNestedSandbox?: boolean;
  enableWeakerNetworkIsolation?: boolean;
  network?: {
    allowedDomains?: string[];
    allowUnixSockets?: string[];
    allowAllUnixSockets?: boolean;
    allowLocalBinding?: boolean;
    httpProxyPort?: number;
    socksProxyPort?: number;
  };
}

export interface McpOAuthSettings {
  clientId?: string;
  callbackPort?: number;
  authServerMetadataUrl?: `https://${string}`;
  scopes?: string;
  xaa?: boolean;
}

export type McpServerConfig =
  | {
      type?: "stdio";
      command: string;
      args?: string[];
      env?: Record<string, string>;
      timeout?: number;
      alwaysLoad?: boolean;
      role?: "comms";
    }
  | {
      type: "sse" | "http" | "streamable-http" | "ws";
      url: string;
      headers?: Record<string, string>;
      headersHelper?: string;
      oauth?: McpOAuthSettings;
      timeout?: number;
      alwaysLoad?: boolean;
      role?: "comms";
      toolPermissions?: Record<string, "allow" | "ask" | "blocked">;
    }
  | {
      type: "sse-ide" | "ws-ide";
      url: string;
      ideName: string;
      authToken?: string;
      ideRunningInWindows?: boolean;
      timeout?: number;
    }
  | { type: "sdk"; name: string; timeout?: number; alwaysLoad?: boolean }
  | {
      type: "claudeai-proxy";
      id: string;
      url: string;
      displayName?: string;
      stateless?: boolean;
      timeout?: number;
      toolPermissions?: Record<string, "allow" | "ask" | "blocked">;
    };

export interface ClaudeSettings {
  permissions?: PermissionSettings;
  sandbox?: SandboxSettings;
  mcpServers?: Record<string, McpServerConfig>;
  hooks?: Partial<Record<string, HookMatcher[]>>;
  apiKeyHelper?: string;
  awsAuthRefresh?: string;
  awsCredentialExport?: string;
  cleanupPeriodDays?: number;
  autoMemoryEnabled?: boolean;
  autoMemoryDirectory?: string;
  enabledMcpjsonServers?: string[];
  disabledMcpjsonServers?: string[];
  enableAllProjectMcpServers?: boolean;
  enabledPlugins?: Record<string, boolean>;
  extraKnownMarketplaces?: Record<string, unknown>;
  autoUpdates?: boolean;
  autoUpdatesChannel?: "latest" | "stable" | "rc";
}

export interface HookMatcher {
  matcher?: string;
  hooks: Array<
    | { type?: "command"; command: string; timeout?: number }
    | { type: "prompt"; prompt: string; timeout?: number }
    | { type: "agent"; prompt: string; timeout?: number }
    | { type: "http"; url: string; timeout?: number }
    | { type: "mcp"; server: string; tool: string; arguments?: unknown }
  >;
}

export const SETTINGS_SECURITY_RULES = {
  cleanupPeriodDaysMinimum: 1,
  projectAutoMemoryDirectoryIgnored: true,
  mcpAuthMetadataRequiresHttps: true,
  projectMcpNeedsApproval: true,
} as const;
