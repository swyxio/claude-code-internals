/**
 * SCHEMATIC — NOT BEHAVIORALLY EQUIVALENT.
 * Reconstructed telemetry control and batching boundary.
 * Provenance: telemetry.batch-endpoint, telemetry.disable,
 * telemetry.nonessential-off.
 * Confidence: observed = disable switches and first-party batch path; derived =
 * queue/facade contracts; hypothesis = effective event payload, redaction,
 * encoding, retry, and failure policy, all injected as unknown behavior.
 */

export interface TelemetryPolicy {
  disableTelemetry: boolean;
  disableNonessentialTraffic: boolean;
}

export interface RawTelemetryEvent {
  name: string;
  occurredAt: Date;
  attributes: Record<string, unknown>;
}

/**
 * The anchored evidence does not establish what is removed, transformed, or
 * hashed. Implementations must supply that behavior explicitly.
 */
export interface TelemetryRedactor {
  redact(event: RawTelemetryEvent): unknown | null;
}

/** The final batch envelope is likewise intentionally opaque. */
export interface TelemetryBatchEncoder {
  encode(events: unknown[]): unknown;
}

export interface EventTransport {
  post(path: string, payload: unknown, signal?: AbortSignal): Promise<void>;
}

export class TelemetryClient {
  static readonly FIRST_PARTY_BATCH_PATH = "/api/event_logging/v2/batch";
  readonly #queue: unknown[] = [];

  constructor(
    private readonly policy: TelemetryPolicy,
    private readonly redactor: TelemetryRedactor,
    private readonly encoder: TelemetryBatchEncoder,
    private readonly transport: EventTransport,
  ) {}

  event(name: string, attributes: Record<string, unknown> = {}): void {
    if (this.policy.disableTelemetry || this.policy.disableNonessentialTraffic)
      return;
    const redacted = this.redactor.redact({
      name,
      occurredAt: new Date(),
      attributes,
    });
    if (redacted !== null) this.#queue.push(redacted);
  }

  async flush(signal?: AbortSignal): Promise<void> {
    if (this.policy.disableTelemetry || this.#queue.length === 0) return;
    const events = this.#queue.splice(0);
    const payload = this.encoder.encode(events);
    // Retry, requeue, and drop behavior belongs to the injected transport; the
    // public anchors do not establish a concrete failure policy.
    await this.transport.post(
      TelemetryClient.FIRST_PARTY_BATCH_PATH,
      payload,
      signal,
    );
  }
}

export function telemetryPolicyFromEnvironment(
  env: Record<string, string | undefined>,
): TelemetryPolicy {
  return {
    disableTelemetry: truthy(env.DISABLE_TELEMETRY),
    disableNonessentialTraffic: truthy(
      env.CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC,
    ),
  };
}

function truthy(value: string | undefined): boolean {
  return value === "1" || value === "true" || value === "yes";
}
