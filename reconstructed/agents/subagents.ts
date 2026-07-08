/**
 * SCHEMATIC — NOT BEHAVIORALLY EQUIVALENT.
 * Reconstructed subagent definitions, spawning, worktrees, and lifecycle.
 * Provenance: agents.append-prompt, agents.lifecycle-hook,
 * agents.pending-turn-state, agent-loop.idle-boundary, hooks.lifecycle.
 * Confidence: observed = definition sources/tool limits/hooks/pending counters;
 * derived = supervisor API; hypothesis = worker scheduling fairness.
 */

export type AgentSource =
  | "userSettings"
  | "projectSettings"
  | "localSettings"
  | "policySettings"
  | "plugin"
  | "flagSettings"
  | "built-in";

export interface AgentDefinition {
  agentType: string;
  description: string;
  prompt: string;
  source: AgentSource;
  model?: string | "inherit";
  effort?: string;
  tools?: string[];
  disallowedTools?: string[];
  maxTurns?: number;
  permissionMode?: string;
  memory?: "user" | "project" | "local";
  background?: boolean;
  isolation?: "none" | "worktree";
}

export interface SpawnRequest {
  definition: AgentDefinition;
  directive: string;
  parentSessionId: string;
  parentToolUseId: string;
  inheritedMessages?: unknown[];
  appendSubagentSystemPrompt?: string;
  cwd: string;
}

export interface RunningAgent {
  id: string;
  name: string;
  definition: AgentDefinition;
  status:
    | "starting"
    | "running"
    | "waiting"
    | "completed"
    | "failed"
    | "stopped";
  cwd: string;
  worktreePath?: string;
  messages: unknown[];
  startedAt: number;
  completedAt?: number;
}

export interface AgentRuntime {
  createWorktree?(request: SpawnRequest): Promise<string>;
  removeWorktree?(path: string): Promise<void>;
  pendingWorkflowCount(): number;
  run(
    request: SpawnRequest,
    cwd: string,
    signal: AbortSignal,
  ): AsyncIterable<unknown>;
  hook(
    event: "SubagentStart" | "SubagentStop",
    payload: unknown,
  ): Promise<void>;
}

export class AgentSupervisor {
  readonly #agents = new Map<string, RunningAgent>();

  constructor(private readonly runtime: AgentRuntime) {}

  list(): RunningAgent[] {
    return [...this.#agents.values()];
  }

  pendingCounts(): { backgroundAgents: number; workflows: number } {
    return {
      backgroundAgents: this.list().filter((agent) =>
        ["starting", "running", "waiting"].includes(agent.status),
      ).length,
      workflows: this.runtime.pendingWorkflowCount(),
    };
  }

  async spawn(
    request: SpawnRequest,
    signal: AbortSignal,
  ): Promise<RunningAgent> {
    const id = crypto.randomUUID();
    const worktreePath =
      request.definition.isolation === "worktree" && this.runtime.createWorktree
        ? await this.runtime.createWorktree(request)
        : undefined;
    const cwd = worktreePath ?? request.cwd;
    const agent: RunningAgent = {
      id,
      name: request.definition.agentType,
      definition: request.definition,
      status: "starting",
      cwd,
      worktreePath,
      messages: [],
      startedAt: Date.now(),
    };
    this.#agents.set(id, agent);
    let handedToConsumer = false;
    try {
      await this.runtime.hook("SubagentStart", {
        agentId: id,
        agentType: agent.name,
      });
      agent.status = "running";

      void this.consume(agent, request, signal);
      handedToConsumer = true;
      return agent;
    } catch (error) {
      agent.status = "failed";
      agent.completedAt = Date.now();
      agent.messages.push({ type: "error", message: String(error) });
      throw error;
    } finally {
      if (
        !handedToConsumer &&
        agent.worktreePath &&
        this.runtime.removeWorktree
      ) {
        try {
          await this.runtime.removeWorktree(agent.worktreePath);
        } catch (error) {
          agent.messages.push({
            type: "lifecycle-error",
            stage: "removeWorktree",
            message: String(error),
          });
        }
      }
    }
  }

  private async consume(
    agent: RunningAgent,
    request: SpawnRequest,
    signal: AbortSignal,
  ): Promise<void> {
    try {
      const enriched: SpawnRequest = {
        ...request,
        definition: {
          ...request.definition,
          prompt: [
            request.definition.prompt,
            request.appendSubagentSystemPrompt,
          ]
            .filter(Boolean)
            .join("\n\n"),
        },
      };
      for await (const message of this.runtime.run(enriched, agent.cwd, signal))
        agent.messages.push(message);
      agent.status = signal.aborted ? "stopped" : "completed";
    } catch (error) {
      agent.status = "failed";
      agent.messages.push({ type: "error", message: String(error) });
    } finally {
      agent.completedAt = Date.now();
      try {
        await this.runtime.hook("SubagentStop", {
          agentId: agent.id,
          agentType: agent.name,
          status: agent.status,
        });
      } catch (error) {
        agent.messages.push({
          type: "lifecycle-error",
          stage: "SubagentStop",
          message: String(error),
        });
      } finally {
        if (agent.worktreePath && this.runtime.removeWorktree) {
          try {
            await this.runtime.removeWorktree(agent.worktreePath);
          } catch (error) {
            agent.messages.push({
              type: "lifecycle-error",
              stage: "removeWorktree",
              message: String(error),
            });
          }
        }
      }
    }
  }

  /** Idle may be emitted only after pending results and background work drain. */
  canEmitSessionIdle(heldBackResults: number): boolean {
    const pending = this.pendingCounts();
    return (
      heldBackResults === 0 &&
      pending.backgroundAgents === 0 &&
      pending.workflows === 0
    );
  }
}
