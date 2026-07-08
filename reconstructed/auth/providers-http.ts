/**
 * SCHEMATIC — NOT BEHAVIORALLY EQUIVALENT.
 * Reconstructed provider routing and first-party HTTP boundary.
 * Provenance: providers.bedrock, providers.vertex, providers.foundry,
 * network.first-party-boundary, telemetry.nonessential-off.
 * Confidence: observed = provider switches/domain separation/residency gate;
 * derived = adapters; hypothesis = request middleware composition.
 */

export type Provider = "anthropic" | "bedrock" | "vertex" | "foundry";

export interface ProviderEnvironment {
  CLAUDE_CODE_USE_BEDROCK?: string;
  CLAUDE_CODE_USE_VERTEX?: string;
  CLAUDE_CODE_USE_FOUNDRY?: string;
  ANTHROPIC_BASE_URL?: string;
}

export function selectProvider(env: ProviderEnvironment): Provider {
  const enabled = [
    truthy(env.CLAUDE_CODE_USE_BEDROCK) && "bedrock",
    truthy(env.CLAUDE_CODE_USE_VERTEX) && "vertex",
    truthy(env.CLAUDE_CODE_USE_FOUNDRY) && "foundry",
  ].filter(Boolean) as Provider[];
  if (enabled.length > 1)
    throw new Error(`Conflicting provider switches: ${enabled.join(", ")}`);
  return enabled[0] ?? "anthropic";
}

export interface HttpPolicy {
  dataResidency: "firstParty" | "thirdParty";
  essentialTrafficOnly: boolean;
  nonessentialTrafficDisabled: boolean;
}

export interface HttpRequest {
  method: string;
  url: string;
  headers?: Record<string, string>;
  body?: unknown;
  essential?: boolean;
  signal?: AbortSignal;
}

export interface HttpTransport {
  send(request: HttpRequest): Promise<unknown>;
}

const ANTHROPIC_HOST = /(^|\.)(anthropic\.com|claude\.ai|claude\.com)$/i;
const RELEASE_HOST = /(^|\.)downloads\.claude\.ai$/i;

export class PartitionedHttpClient {
  constructor(
    private readonly transport: HttpTransport,
    private readonly policy: HttpPolicy,
  ) {}

  async firstParty(request: HttpRequest): Promise<unknown> {
    const host = new URL(request.url).hostname;
    if (!ANTHROPIC_HOST.test(host) && !RELEASE_HOST.test(host))
      throw new Error("firstParty client refuses non-Anthropic destination");
    if (this.policy.dataResidency !== "firstParty")
      throw new Error("data-residency");
    if (this.policy.essentialTrafficOnly && !request.essential)
      throw new Error("essential-traffic-only");
    if (this.policy.nonessentialTrafficDisabled && !request.essential)
      throw new Error("nonessential-traffic-disabled");
    return this.transport.send(request);
  }

  async external(request: HttpRequest): Promise<unknown> {
    const host = new URL(request.url).hostname;
    if (ANTHROPIC_HOST.test(host) || RELEASE_HOST.test(host)) {
      throw new Error(
        "externalHttp destination is Anthropic-operated; use firstParty client so residency checks apply",
      );
    }
    return this.transport.send(request);
  }
}

export interface ProviderAdapter {
  provider: Provider;
  createMessage(request: unknown, signal: AbortSignal): AsyncIterable<unknown>;
  refreshCredentials?(): Promise<void>;
}

function truthy(value: string | undefined): boolean {
  return value === "1" || value === "true" || value === "yes";
}
