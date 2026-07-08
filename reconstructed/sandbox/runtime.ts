/**
 * SCHEMATIC — NOT BEHAVIORALLY EQUIVALENT.
 * Cross-platform sandbox orchestration reconstruction.
 * Provenance: sandbox.fail-closed, sandbox.no-escape, sandbox.auto-allow,
 * sandbox.weaker-network, sandbox.weaker-nested.
 * Confidence: observed = configuration controls and fail-closed/no-escape
 * concepts; derived = backend adapter boundary; hypothesis = platform
 * selection, launch specifications, availability probes, and fallback details.
 */

export interface SandboxPolicy {
  enabled: boolean;
  failIfUnavailable: boolean;
  excludedCommands: string[];
  allowUnsandboxedCommands: boolean;
  autoAllowBashIfSandboxed: boolean;
  enableWeakerNestedSandbox: boolean;
  enableWeakerNetworkIsolation: boolean;
  network: {
    allowedDomains: string[];
    allowUnixSockets: string[];
    allowAllUnixSockets: boolean;
    allowLocalBinding: boolean;
    httpProxyPort?: number;
    socksProxyPort?: number;
  };
}

export type SandboxBackend = "seatbelt" | "bubblewrap" | "windows-srt" | "none";

export interface SandboxProbe {
  platform: "darwin" | "linux" | "win32";
  isNested: boolean;
  capabilities: unknown;
}

export interface SandboxLaunch {
  backend: SandboxBackend;
  launchSpec: unknown;
  warnings: string[];
}

/** Exact backend command lines and profiles are intentionally opaque. */
export interface SandboxBackendAdapter {
  backend: Exclude<SandboxBackend, "none">;
  isAvailable(probe: SandboxProbe, policy: SandboxPolicy): Promise<boolean>;
  plan(
    command: string,
    args: string[],
    probe: SandboxProbe,
    policy: SandboxPolicy,
  ): Promise<SandboxLaunch>;
}

export class SandboxPlanner {
  constructor(private readonly backends: SandboxBackendAdapter[]) {}

  async plan(
    command: string,
    args: string[],
    policy: SandboxPolicy,
    probe: SandboxProbe,
  ): Promise<SandboxLaunch> {
    if (!policy.enabled) return unsandboxed(command, args, []);

    if (policy.excludedCommands.includes(command)) {
      if (!policy.allowUnsandboxedCommands)
        throw new Error("Configuration disallows a per-command sandbox escape");
      return unsandboxed(command, args, [
        "Command is excluded from sandboxing",
      ]);
    }

    for (const backend of this.backends) {
      if (await backend.isAvailable(probe, policy))
        return backend.plan(command, args, probe, policy);
    }

    if (policy.failIfUnavailable)
      throw new Error("Required sandbox backend is unavailable");
    return unsandboxed(command, args, ["Sandbox backend unavailable"]);
  }
}

function unsandboxed(
  command: string,
  args: string[],
  warnings: string[],
): SandboxLaunch {
  return {
    backend: "none",
    launchSpec: { command, args },
    warnings,
  };
}
