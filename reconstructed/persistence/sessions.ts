/**
 * SCHEMATIC — NOT BEHAVIORALLY EQUIVALENT.
 * Reconstructed transcript and external SessionStore boundaries.
 * Provenance: sessions.local-transcript, sessions.external-store,
 * agent-loop.idle-boundary.
 * Confidence: observed = a local session-transcript concept and a bounded
 * external load path; derived = adapter separation; hypothesis = local path,
 * encoding, file mode, timeout duration, write/mirroring, and batching policy,
 * all intentionally delegated to injected contracts.
 */

export interface SessionReference {
  sessionId: string;
  project?: unknown;
  subpath?: string;
}

export interface TranscriptRecord {
  value: unknown;
}

/** Exact on-disk location and naming are not asserted by this reconstruction. */
export interface SessionPathResolver {
  resolve(reference: SessionReference): Promise<unknown>;
}

/** Encoding, permissions, atomicity, and retention remain implementation-owned. */
export interface LocalTranscriptStore {
  read(location: unknown): Promise<TranscriptRecord[]>;
  append(location: unknown, records: TranscriptRecord[]): Promise<void>;
  remove(location: unknown): Promise<void>;
}

/** Only the bounded external load seam is claimed from the public anchor. */
export interface ExternalSessionStore {
  load(reference: SessionReference): Promise<TranscriptRecord[]>;
}

export interface BoundedOperation {
  run<T>(label: string, operation: () => Promise<T>): Promise<T>;
}

export class SessionPersistence {
  constructor(
    private readonly paths: SessionPathResolver,
    private readonly local: LocalTranscriptStore,
    private readonly bounded: BoundedOperation,
    private readonly external?: ExternalSessionStore,
  ) {}

  async loadLocal(reference: SessionReference): Promise<TranscriptRecord[]> {
    const location = await this.paths.resolve(reference);
    return this.local.read(location);
  }

  async appendLocal(
    reference: SessionReference,
    records: TranscriptRecord[],
  ): Promise<void> {
    const location = await this.paths.resolve(reference);
    await this.local.append(location, records);
  }

  async removeLocal(reference: SessionReference): Promise<void> {
    const location = await this.paths.resolve(reference);
    await this.local.remove(location);
  }

  async loadExternal(reference: SessionReference): Promise<TranscriptRecord[]> {
    if (!this.external)
      throw new Error("External SessionStore is not configured");
    return this.bounded.run("SessionStore.load", () =>
      this.external!.load(reference),
    );
  }
}
