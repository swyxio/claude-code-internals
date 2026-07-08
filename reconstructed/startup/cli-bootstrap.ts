/**
 * SCHEMATIC — NOT BEHAVIORALLY EQUIVALENT.
 * Independently authored, non-verbatim reconstruction of Claude Code 2.1.177 startup.
 * Provenance: build.git-sha, entrypoint.routing,
 * deeplink.argument-injection, workspace-trust.proxy-helper,
 * mcp.strict-mode.
 * Confidence: observed = command/options and warnings; derived = phase ordering;
 * hypothesis = exact internal object ownership and names.
 */

export type CliMode =
  | "interactive"
  | "print"
  | "agent-view"
  | "remote-control"
  | "mcp-server"
  | "maintenance";

export type CliCommand =
  | "default"
  | "agents"
  | "remote-control"
  | "mcp-serve"
  | "auth"
  | "setup-token"
  | "doctor"
  | "install"
  | "update"
  | "upgrade"
  | "mcp"
  | "plugin"
  | "project"
  | "ultrareview";

export interface StartupFlags {
  command: CliCommand;
  prompt?: string;
  print: boolean;
  inputFormat: "text" | "stream-json";
  outputFormat: "text" | "json" | "stream-json";
  safeMode: boolean;
  bareMode: boolean;
  strictMcpConfig: boolean;
  settingSources: Array<"user" | "project" | "local">;
  settingsOverride?: string;
  mcpConfigs: string[];
  pluginDirectories: string[];
  pluginUrls: string[];
  permissionMode?: string;
  allowedTools: string[];
  disallowedTools: string[];
  additionalDirectories: string[];
  sessionId?: string;
  resume?: string | true;
  continueMostRecent: boolean;
  forkSession: boolean;
  noSessionPersistence: boolean;
}

export interface StartupPlan {
  mode: CliMode;
  cwd: string;
  trustRequired: boolean;
  loadCustomizations: boolean;
  readOAuthOrKeychain: boolean;
  persistTranscript: boolean;
  features: StartupFeatures;
  phases: StartupPhase[];
}

export interface CommandTrustPolicy {
  requiresWorkspaceTrust(context: {
    command: CliCommand;
    mode: CliMode;
    entrypoint?: string;
  }): boolean;
}

export interface StartupFeatures {
  simpleMode: boolean;
  discoverClaudeMd: boolean;
  loadHooks: boolean;
  enableLsp: boolean;
  syncPlugins: boolean;
  enableAutoMemory: boolean;
  runBackgroundPrefetch: boolean;
  writeAttribution: boolean;
  loadSkills: boolean;
  loadExplicitPlugins: boolean;
}

export type StartupPhase =
  | "parse-arguments"
  | "select-mode"
  | "resolve-settings"
  | "check-workspace-trust"
  | "resolve-auth"
  | "load-plugins-skills-agents-hooks"
  | "connect-mcp"
  | "restore-session"
  | "construct-tool-catalog"
  | "start-runtime";

/**
 * Observed command families. Most subcommands short-circuit before the REPL.
 */
export const COMMAND_FAMILIES = {
  conversational: ["default", "print", "agents", "remote-control"],
  integration: ["mcp-serve", "mcp", "plugin", "project"],
  authentication: ["auth", "setup-token"],
  maintenance: ["doctor", "install", "update", "upgrade"],
  hosted: ["ultrareview"],
} as const;

export function buildStartupPlan(
  flags: StartupFlags,
  env: Record<string, string | undefined>,
  cwd: string,
  trustPolicy: CommandTrustPolicy,
): StartupPlan {
  const mode = selectMode(flags, env);

  // Only print/SDK and doctor exemptions were directly observed. Whether any
  // other command requires trust is delegated instead of inferred from the
  // broad internal mode label.
  const trustRequired = trustPolicy.requiresWorkspaceTrust({
    command: flags.command,
    mode,
    entrypoint: env.CLAUDE_CODE_ENTRYPOINT,
  });

  // Observed `--safe-mode`: customizations are suppressed but managed policy,
  // auth, model selection, built-in tools, and permissions remain.
  const loadCustomizations = !flags.safeMode;

  // Observed `--bare`: no OAuth/keychain reads; API-key/apiKeyHelper only for
  // first-party auth, while third-party providers retain their own chains.
  const readOAuthOrKeychain = !flags.bareMode;
  const features: StartupFeatures = {
    simpleMode: flags.bareMode,
    discoverClaudeMd: loadCustomizations && !flags.bareMode,
    loadHooks: loadCustomizations && !flags.bareMode,
    enableLsp: loadCustomizations && !flags.bareMode,
    syncPlugins: loadCustomizations && !flags.bareMode,
    enableAutoMemory: loadCustomizations && !flags.bareMode,
    runBackgroundPrefetch: loadCustomizations && !flags.bareMode,
    writeAttribution: loadCustomizations && !flags.bareMode,
    // Observed help: bare mode keeps skills and permits explicitly supplied
    // plugin directories even while suppressing plugin synchronization.
    loadSkills: loadCustomizations,
    loadExplicitPlugins: loadCustomizations,
  };

  return {
    mode,
    cwd,
    trustRequired,
    loadCustomizations,
    readOAuthOrKeychain,
    persistTranscript: !flags.noSessionPersistence,
    features,
    phases: [
      "parse-arguments",
      "select-mode",
      "resolve-settings",
      "check-workspace-trust",
      "resolve-auth",
      "load-plugins-skills-agents-hooks",
      "connect-mcp",
      "restore-session",
      "construct-tool-catalog",
      "start-runtime",
    ],
  };
}

function selectMode(
  flags: StartupFlags,
  env: Record<string, string | undefined>,
): CliMode {
  if (env.CLAUDE_CODE_ENTRYPOINT === "sdk-ts" || flags.print) return "print";
  if (flags.command === "remote-control") return "remote-control";
  if (flags.command === "mcp-serve") return "mcp-server";
  if (flags.command === "agents" || env.CLAUDE_CODE_AGENT_VIEW_RELAUNCH)
    return "agent-view";
  if (flags.command !== "default") return "maintenance";
  return "interactive";
}

/**
 * Security invariant observed in the deep-link parser: `--handle-uri` is a
 * terminal argument pair. Extra arguments after the URI are rejected as an
 * argument-injection attempt.
 */
export function validateDeepLinkInvocation(argv: string[]): void {
  const index = argv.indexOf("--handle-uri");
  if (index < 0) return;
  if (index + 2 !== argv.length) {
    throw new Error(
      "Rejected deep-link invocation: unexpected trailing arguments",
    );
  }
}
