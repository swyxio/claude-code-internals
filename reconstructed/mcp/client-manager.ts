/**
 * SCHEMATIC — NOT BEHAVIORALLY EQUIVALENT.
 * Reconstructed MCP configuration and client manager.
 * Provenance: mcp.settings, mcp.strict-mode, mcp.transports,
 * mcp.project-approval, tools.execution-pipeline.
 * Confidence: observed = transports, project approval, and the mcp__ naming
 * family; derived = manager interface; hypothesis = encoding, collision policy,
 * reconnection timing, and internal client classes.
 */

export type McpScope =
  | "local"
  | "user"
  | "project"
  | "dynamic"
  | "enterprise"
  | "claudeai"
  | "managed"
  | "agent";

export type McpConfig =
  | {
      type?: "stdio";
      command: string;
      args?: string[];
      env?: Record<string, string>;
    }
  | { type: "sse" | "sse-ide"; url: string; headers?: Record<string, string> }
  | {
      type: "http" | "streamable-http";
      url: string;
      headers?: Record<string, string>;
    }
  | {
      type: "ws" | "ws-ide";
      url: string;
      headers?: Record<string, string>;
      authToken?: string;
    }
  | { type: "sdk"; name: string }
  | { type: "claudeai-proxy"; id: string; url: string; stateless?: boolean };

export interface DiscoveredMcpServer {
  name: string;
  scope: McpScope;
  config: McpConfig;
  sourcePath?: string;
  projectApproval: "not-required" | "approved" | "rejected" | "pending";
}

export interface McpTool {
  name: string;
  description?: string;
  inputSchema: unknown;
  outputSchema?: unknown;
  serverName: string;
  remoteName: string;
  maxPermission: "allow" | "ask" | "blocked" | "unknown";
  deferred: boolean;
}

export interface McpConnection {
  server: DiscoveredMcpServer;
  initialize(): Promise<{
    tools: unknown[];
    resources?: unknown[];
    prompts?: unknown[];
  }>;
  callTool(
    name: string,
    input: unknown,
    signal: AbortSignal,
  ): AsyncIterable<unknown>;
  listResources(cursor?: string): Promise<unknown>;
  readResource(uri: string): Promise<unknown>;
  close(): Promise<void>;
}

export interface McpTransportFactory {
  connect(server: DiscoveredMcpServer): Promise<McpConnection>;
}

export interface ToolNameEncoder {
  encode(serverName: string, remoteToolName: string): string;
}

/** Observed family only; escaping and collision behavior are not asserted. */
export const MCP_TOOL_NAME_FAMILY = "mcp__<server>__<tool>" as const;

export interface McpLoadOptions {
  strict: boolean;
  explicitlySupplied: Set<string>;
  approvedProjectServers: Set<string>;
  rejectedProjectServers: Set<string>;
  deferToolSchemas: boolean;
}

export class McpClientManager {
  readonly #connections = new Map<string, McpConnection>();
  readonly #tools: McpTool[] = [];

  constructor(
    private readonly factory: McpTransportFactory,
    private readonly options: McpLoadOptions,
    private readonly names: ToolNameEncoder,
  ) {}

  async connectAll(discovered: DiscoveredMcpServer[]): Promise<void> {
    for (const server of discovered) {
      if (
        this.options.strict &&
        !this.options.explicitlySupplied.has(server.name)
      )
        continue;
      if (server.scope === "project") {
        if (this.options.rejectedProjectServers.has(server.name)) continue;
        if (!this.options.approvedProjectServers.has(server.name)) continue;
      }
      await this.connectOne(server);
    }
  }

  async connectOne(server: DiscoveredMcpServer): Promise<void> {
    await this.disconnectOne(server.name);
    const connection = await this.factory.connect(server);
    try {
      const initialized = await connection.initialize();
      const discoveredTools = (
        initialized.tools as Array<Record<string, unknown>>
      ).map((remote): McpTool => {
        const remoteName = String(remote.name);
        const localName = this.names.encode(server.name, remoteName);
        return {
          name: localName,
          description:
            typeof remote.description === "string"
              ? remote.description
              : undefined,
          inputSchema: remote.inputSchema ?? { type: "object" },
          outputSchema: remote.outputSchema,
          serverName: server.name,
          remoteName,
          maxPermission: "unknown",
          deferred: this.options.deferToolSchemas,
        };
      });
      this.#connections.set(server.name, connection);
      this.#tools.push(...discoveredTools);
    } catch (error) {
      try {
        await connection.close();
      } catch {
        // Preserve the initialization error; cleanup behavior is schematic.
      }
      throw error;
    }
  }

  tools(): McpTool[] {
    return [...this.#tools];
  }

  async *call(
    tool: McpTool,
    input: unknown,
    signal: AbortSignal,
  ): AsyncIterable<unknown> {
    if (tool.maxPermission === "blocked")
      throw new Error("MCP tool blocked by server policy");
    const connection = this.#connections.get(tool.serverName);
    if (!connection)
      throw new Error(`MCP server ${tool.serverName} is not connected`);
    yield* connection.callTool(tool.remoteName, input, signal);
  }

  async reconnect(name: string): Promise<void> {
    const old = this.#connections.get(name);
    if (!old) throw new Error(`Unknown MCP server ${name}`);
    const server = old.server;
    await this.connectOne(server);
  }

  private async disconnectOne(name: string): Promise<void> {
    const connection = this.#connections.get(name);
    try {
      if (connection) await connection.close();
    } finally {
      this.#connections.delete(name);
      for (let index = this.#tools.length - 1; index >= 0; index -= 1) {
        if (this.#tools[index]?.serverName === name)
          this.#tools.splice(index, 1);
      }
    }
  }

  async close(): Promise<void> {
    await Promise.all(
      [...this.#connections.values()].map((client) => client.close()),
    );
    this.#connections.clear();
    this.#tools.length = 0;
  }
}

/** Project discovery is intentionally separate from trust approval. */
export function attachProjectApproval(
  server: Omit<DiscoveredMcpServer, "projectApproval">,
  options: McpLoadOptions,
): DiscoveredMcpServer {
  if (server.scope !== "project")
    return { ...server, projectApproval: "not-required" };
  if (options.rejectedProjectServers.has(server.name))
    return { ...server, projectApproval: "rejected" };
  if (options.approvedProjectServers.has(server.name))
    return { ...server, projectApproval: "approved" };
  return { ...server, projectApproval: "pending" };
}
