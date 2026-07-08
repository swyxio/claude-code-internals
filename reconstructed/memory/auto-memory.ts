/**
 * SCHEMATIC — NOT BEHAVIORALLY EQUIVALENT.
 * Reconstructed automatic-memory boundary and path-hardening rule.
 * Provenance: memory.enable, memory.project-path-hardening,
 * sessions.local-transcript.
 * Confidence: observed = enable control and rejection of a project-supplied
 * custom memory directory; derived = store contracts; hypothesis = default and
 * agent paths, manifest/record format, parsing, rendering, and ranking.
 */

export type MemoryScope =
  | "auto"
  | "agent-user"
  | "agent-project"
  | "agent-local";

export interface MemorySettings {
  enabled: boolean;
  configuredDirectory?: string;
  configuredDirectorySource?:
    | "userSettings"
    | "localSettings"
    | "projectSettings";
}

export interface MemoryLocation {
  scope: MemoryScope;
  root: unknown;
  manifest?: unknown;
}

export interface MemoryPathPolicy {
  defaultAutoMemory(context: {
    configDir: string;
    cwd: string;
  }): MemoryLocation;
  customAutoMemory(path: string): MemoryLocation;
  agentMemory(
    scope: Exclude<MemoryScope, "auto">,
    context: { agentType: string; configDir: string; cwd: string },
  ): MemoryLocation;
}

export function resolveAutoMemoryLocation(
  configDir: string,
  cwd: string,
  settings: MemorySettings,
  paths: MemoryPathPolicy,
): MemoryLocation | null {
  if (!settings.enabled) return null;

  // Directly supported hardening rule: checked-in project settings cannot
  // redirect memory to a custom filesystem directory.
  if (
    settings.configuredDirectory !== undefined &&
    settings.configuredDirectorySource !== "projectSettings"
  )
    return paths.customAutoMemory(settings.configuredDirectory);
  return paths.defaultAutoMemory({ configDir, cwd });
}

export interface MemoryRecord {
  value: unknown;
}

export interface MemoryFilesystem {
  list(location: MemoryLocation): Promise<unknown[]>;
  read(entry: unknown): Promise<unknown>;
  write(entry: unknown, value: unknown): Promise<void>;
}

export interface MemoryCodec {
  decode(entry: unknown, stored: unknown): MemoryRecord;
  encode(record: MemoryRecord): unknown;
  buildManifest(records: MemoryRecord[]): unknown;
  order(records: MemoryRecord[]): MemoryRecord[];
}

export async function loadMemories(
  location: MemoryLocation,
  fs: MemoryFilesystem,
  codec: MemoryCodec,
): Promise<MemoryRecord[]> {
  const records: MemoryRecord[] = [];
  for (const entry of await fs.list(location))
    records.push(codec.decode(entry, await fs.read(entry)));
  return codec.order(records);
}
