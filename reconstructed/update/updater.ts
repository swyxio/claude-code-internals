/**
 * SCHEMATIC — NOT BEHAVIORALLY EQUIVALENT.
 * Reconstructed update planner for native and package-manager installs.
 * Provenance: updates.release-origin, telemetry.nonessential-off,
 * build.git-sha.
 * Confidence: observed = origin/version manifest/platform checksum/native and
 * package paths; derived = state machine; hypothesis = channel/version policy,
 * locking, staging, and replacement details, all delegated to the runtime.
 */

export type UpdateChannel = "latest" | "stable" | "rc";
export type InstallMethod = "native" | "npm" | "homebrew" | "unknown";
export type UpdateInvocation = "automatic" | "explicit";

export interface UpdatePolicy {
  invocation: UpdateInvocation;
  automaticUpdatesDisabled: boolean;
  nonessentialTrafficDisabled: boolean;
  channel: UpdateChannel;
  installMethod: InstallMethod;
  allowDowngrade: boolean;
}

export interface ReleaseManifest {
  platforms: Record<string, { checksum: string }>;
}

export interface UpdateRuntime {
  acquireUpdateLock(): Promise<AsyncDisposable | null>;
  createStagingLocation(version: string): Promise<unknown>;
  resolveTargetVersion(channel: UpdateChannel): Promise<string>;
  compareVersions(left: string, right: string): number;
  fetchManifest(url: string): Promise<ReleaseManifest>;
  download(url: string, destination: unknown): Promise<void>;
  sha256(location: unknown): Promise<string>;
  replaceExecutableAtomically(location: unknown): Promise<void>;
  runPackageManagerUpgrade(
    method: Exclude<InstallMethod, "native" | "unknown">,
  ): Promise<void>;
}

export type UpdateResult =
  | { status: "disabled"; reason: string }
  | { status: "up-to-date"; currentVersion: string }
  | { status: "updated"; from: string; to: string }
  | { status: "locked" }
  | { status: "failed"; error: string };

export const RELEASE_ORIGIN =
  "https://downloads.claude.ai/claude-code-releases";

export async function checkAndInstallUpdate(
  currentVersion: string,
  platformId: string,
  binaryName: string,
  policy: UpdatePolicy,
  runtime: UpdateRuntime,
): Promise<UpdateResult> {
  if (policy.invocation === "automatic" && policy.automaticUpdatesDisabled)
    return { status: "disabled", reason: "auto-updater disabled" };
  if (policy.invocation === "automatic" && policy.nonessentialTrafficDisabled)
    return { status: "disabled", reason: "nonessential traffic disabled" };

  const lock = await runtime.acquireUpdateLock();
  if (!lock) return { status: "locked" };
  await using _guard = lock;

  try {
    if (
      policy.installMethod !== "native" &&
      policy.installMethod !== "unknown"
    ) {
      await runtime.runPackageManagerUpgrade(policy.installMethod);
      return {
        status: "updated",
        from: currentVersion,
        to: "package-manager-selected",
      };
    }

    // Channel resolution and version-addressed artifact retrieval are separate.
    const targetVersion = await runtime.resolveTargetVersion(policy.channel);
    const manifest = await runtime.fetchManifest(
      `${RELEASE_ORIGIN}/${targetVersion}/manifest.json`,
    );
    const comparison = runtime.compareVersions(targetVersion, currentVersion);
    if (comparison === 0 || (comparison < 0 && !policy.allowDowngrade))
      return { status: "up-to-date", currentVersion };

    const platform = manifest.platforms[platformId];
    if (!platform) throw new Error(`No artifact for ${platformId}`);
    const artifactUrl = `${RELEASE_ORIGIN}/${targetVersion}/${platformId}/${binaryName}`;

    const staging = await runtime.createStagingLocation(targetVersion);
    await runtime.download(artifactUrl, staging);
    if ((await runtime.sha256(staging)) !== platform.checksum)
      throw new Error("Downloaded release checksum mismatch");
    await runtime.replaceExecutableAtomically(staging);
    return { status: "updated", from: currentVersion, to: targetVersion };
  } catch (error) {
    return {
      status: "failed",
      error: error instanceof Error ? error.message : String(error),
    };
  }
}
