/**
 * SCHEMATIC — NOT BEHAVIORALLY EQUIVALENT.
 * Reconstructed built-in tool catalog and filtering stages.
 * Provenance: tools.registry, tools.bash-readonly-source, tools.aliases.
 * Confidence: observed = names and candidate registry membership; derived =
 * categories; hypothesis = feature gates, narrowing, collision handling, and
 * final ordering, all delegated to the injected policy.
 */

export type ToolCategory =
  | "filesystem"
  | "shell"
  | "web"
  | "planning"
  | "agent"
  | "task"
  | "automation"
  | "integration"
  | "communication"
  | "internal";

export interface ToolDescriptor {
  name: string;
  category: ToolCategory;
  conditional?: string;
  deferredByDefault?: boolean;
}

/** Core tools returned by the observed OAH() helper. */
export const CORE_LOCAL_TOOLS: ToolDescriptor[] = [
  { name: "Read", category: "filesystem" },
  { name: "Write", category: "filesystem" },
  { name: "Edit", category: "filesystem" },
  { name: "Glob", category: "filesystem" },
  { name: "Grep", category: "filesystem" },
  { name: "Bash", category: "shell" },
  {
    name: "PowerShell",
    category: "shell",
    conditional: "Windows or explicit PowerShell mode",
  },
  { name: "NotebookEdit", category: "filesystem" },
];

/**
 * Directly observed c9 tool objects. This is a candidate inventory, not a
 * promise that every tool is enabled in every session.
 */
export const CANDIDATE_BUILTINS: ToolDescriptor[] = [
  ...CORE_LOCAL_TOOLS,
  { name: "WebFetch", category: "web" },
  { name: "WebSearch", category: "web" },
  { name: "AskUserQuestion", category: "planning" },
  { name: "EnterPlanMode", category: "planning" },
  { name: "ExitPlanMode", category: "planning" },
  { name: "Agent", category: "agent" },
  { name: "ToolSearch", category: "integration" },
  { name: "Skill", category: "integration" },
  { name: "TaskCreate", category: "task", conditional: "task system enabled" },
  { name: "TaskGet", category: "task", conditional: "task system enabled" },
  { name: "TaskUpdate", category: "task", conditional: "task system enabled" },
  { name: "TaskList", category: "task", conditional: "task system enabled" },
  { name: "TaskOutput", category: "task" },
  { name: "TaskStop", category: "task" },
  { name: "TodoWrite", category: "task" },
  { name: "LSP", category: "integration", conditional: "LSP enabled" },
  { name: "REPL", category: "shell", conditional: "code terminal enabled" },
  {
    name: "Workflow",
    category: "automation",
    conditional: "workflows enabled",
  },
  { name: "Monitor", category: "automation" },
  { name: "CronCreate", category: "automation" },
  { name: "CronDelete", category: "automation" },
  { name: "CronList", category: "automation" },
  { name: "ScheduleWakeup", category: "automation" },
  { name: "RemoteTrigger", category: "automation" },
  { name: "EnterWorktree", category: "agent", conditional: "worktree support" },
  { name: "ExitWorktree", category: "agent", conditional: "worktree support" },
  { name: "TeamCreate", category: "agent", conditional: "agent teams enabled" },
  { name: "TeamDelete", category: "agent", conditional: "agent teams enabled" },
  {
    name: "SendMessage",
    category: "communication",
    conditional: "agent teams enabled",
  },
  { name: "ListMcpResourcesTool", category: "integration" },
  { name: "ReadMcpResourceTool", category: "integration" },
  { name: "WaitForMcpServers", category: "integration" },
  { name: "Artifact", category: "integration" },
  {
    name: "Projects",
    category: "integration",
    conditional: "project tool enabled",
  },
  { name: "DesignSync", category: "integration" },
  {
    name: "SendUserMessage",
    category: "communication",
    conditional: "brief mode",
  },
  { name: "SendUserFile", category: "communication" },
  { name: "PushNotification", category: "communication" },
  { name: "ShareOnboardingGuide", category: "internal" },
  { name: "ShowOnboardingRolePicker", category: "internal" },
  { name: "StructuredOutput", category: "internal" },
  { name: "TestingPermission", category: "internal" },
];

export interface CatalogPolicy {
  enabled(name: string): boolean;
  denied(name: string): boolean;
  finalize(tools: ToolDescriptor[]): ToolDescriptor[];
  simpleMode: boolean;
  coordinatorMode: boolean;
  requestedTools?: string[];
}

export function buildToolCatalog(
  dynamicTools: ToolDescriptor[],
  skillTools: ToolDescriptor[],
  policy: CatalogPolicy,
): ToolDescriptor[] {
  const candidates = policy.simpleMode
    ? CORE_LOCAL_TOOLS.filter((tool) =>
        ["Read", "Edit", "Write", "Bash"].includes(tool.name),
      )
    : [...CANDIDATE_BUILTINS, ...dynamicTools, ...skillTools];

  const narrowed = policy.requestedTools?.length
    ? candidates.filter((tool) => policy.requestedTools!.includes(tool.name))
    : candidates;

  return policy.finalize(
    narrowed.filter(
      (tool) => !policy.denied(tool.name) && policy.enabled(tool.name),
    ),
  );
}
