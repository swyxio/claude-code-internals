/**
 * SCHEMATIC — NOT BEHAVIORALLY EQUIVALENT.
 * Reconstructed plugin discovery and component loader.
 * Provenance: plugins.cli-loader, plugins.monitor-trust,
 * plugins.component-inventory, mcp.project-approval.
 * Confidence: observed = component inventory, no-MCP switch, and monitor trust
 * warning; derived = loader/data contracts; hypothesis = manifest field names,
 * precedence, default paths, cache layout, and sanitization algorithm.
 */

export type PluginComponentKind =
  | "skills"
  | "agents"
  | "hooks"
  | "mcp"
  | "lsp"
  | "output-style"
  | "channel"
  | "workflows"
  | "themes"
  | "commands";

export interface PluginManifest {
  name: string;
  version?: string;
  description?: string;
  commands?: string | string[];
  skills?: string | string[];
  agents?: string | string[];
  hooks?: string | string[] | Record<string, unknown>;
  mcpServers?: string | string[] | Record<string, unknown>;
  lspServers?: Record<string, unknown>;
  outputStyles?: string | string[];
  workflows?: string | string[];
  themes?: string | string[];
  channel?: string | string[];
  monitors?: Array<{ command: string; description?: string }>;
  dependencies?: Record<string, string>;
}

export interface LoadedPlugin {
  id: string;
  root: string;
  dataDirectory: string;
  manifest: PluginManifest;
  enabled: boolean;
  components: Partial<Record<PluginComponentKind, string[]>>;
  warnings: string[];
}

export interface PluginLoadPolicy {
  workspaceTrusted: boolean;
  skipMcp: boolean;
  safeMode: boolean;
  allowedRoots: string[];
  blockedMarketplaces: Set<string>;
}

export interface PluginOrigin {
  marketplace?: string;
}

export interface PluginFilesystem {
  realpath(path: string): Promise<string>;
  readJson(path: string): Promise<unknown>;
  exists(path: string): Promise<boolean>;
  list(path: string): Promise<string[]>;
}

export async function loadPlugin(
  root: string,
  policy: PluginLoadPolicy,
  fs: PluginFilesystem,
  origin: PluginOrigin = {},
): Promise<LoadedPlugin> {
  if (origin.marketplace && policy.blockedMarketplaces.has(origin.marketplace))
    throw new Error(`Plugin marketplace is blocked: ${origin.marketplace}`);
  if (!(await fs.exists(root)))
    throw new Error(`Plugin root does not exist: ${root}`);
  const canonicalRoot = await fs.realpath(root);
  assertAllowedRoot(canonicalRoot, policy.allowedRoots);
  const manifestPath = `${canonicalRoot}/.claude-plugin/plugin.json`;
  if (!(await fs.exists(manifestPath)))
    throw new Error(`Plugin manifest does not exist: ${manifestPath}`);
  const manifest = (await fs.readJson(manifestPath)) as PluginManifest;
  if (!manifest.name)
    throw new Error(`Plugin manifest at ${manifestPath} has no name`);

  const warnings: string[] = [];
  if (!policy.workspaceTrusted)
    warnings.push(
      "Project plugin components are deferred until workspace trust is accepted",
    );
  if (manifest.monitors?.length)
    warnings.push(
      "Plugin monitor scripts execute unsandboxed at the same trust tier as hooks",
    );

  const components: LoadedPlugin["components"] = {};
  if (!policy.safeMode && policy.workspaceTrusted) {
    components.skills = await resolveComponentPaths(
      canonicalRoot,
      manifest.skills,
      "skills",
      fs,
    );
    components.agents = await resolveComponentPaths(
      canonicalRoot,
      manifest.agents,
      "agents",
      fs,
    );
    components.hooks = await resolveComponentPaths(
      canonicalRoot,
      manifest.hooks,
      "hooks/hooks.json",
      fs,
    );
    components.lsp = manifest.lspServers ? [manifestPath] : [];
    components["output-style"] = await resolveComponentPaths(
      canonicalRoot,
      manifest.outputStyles,
      "output-styles",
      fs,
    );
    components.workflows = await resolveComponentPaths(
      canonicalRoot,
      manifest.workflows,
      "workflows",
      fs,
    );
    components.themes = await resolveComponentPaths(
      canonicalRoot,
      manifest.themes,
      "themes",
      fs,
    );
    components.commands = await resolveComponentPaths(
      canonicalRoot,
      manifest.commands,
      "commands",
      fs,
    );
    components.channel = await resolveComponentPaths(
      canonicalRoot,
      manifest.channel,
      "channel",
      fs,
    );
    if (!policy.skipMcp)
      components.mcp = await resolveComponentPaths(
        canonicalRoot,
        manifest.mcpServers,
        ".mcp.json",
        fs,
      );
  }

  return {
    id: `${manifest.name}@local`,
    root: canonicalRoot,
    dataDirectory: pluginDataDirectory(manifest.name),
    manifest,
    enabled: !policy.safeMode && policy.workspaceTrusted,
    components,
    warnings,
  };
}

async function resolveComponentPaths(
  root: string,
  declaration: unknown,
  defaultRelativePath: string,
  fs: PluginFilesystem,
): Promise<string[]> {
  if (
    declaration &&
    typeof declaration === "object" &&
    !Array.isArray(declaration)
  )
    return [root];
  const entries =
    declaration === undefined
      ? [defaultRelativePath]
      : Array.isArray(declaration)
        ? declaration.map(String)
        : [String(declaration)];
  const paths: string[] = [];
  for (const entry of entries) {
    const unresolved = `${root}/${entry}`;
    if (!(await fs.exists(unresolved))) continue;
    const candidate = await fs.realpath(unresolved);
    assertContained(candidate, root);
    paths.push(candidate);
  }
  return paths;
}

function assertAllowedRoot(root: string, allowedRoots: string[]): void {
  if (
    !allowedRoots.some(
      (allowed) => root === allowed || root.startsWith(`${allowed}/`),
    )
  )
    throw new Error(`Plugin root is outside configured roots: ${root}`);
}

function assertContained(path: string, root: string): void {
  if (path !== root && !path.startsWith(`${root}/`))
    throw new Error(`Plugin component escapes plugin root: ${path}`);
}

function pluginDataDirectory(name: string): string {
  let segment = name.replace(/[^A-Za-z0-9._-]/g, "_");
  if (!segment || segment === "." || segment === "..") segment = "_plugin";
  return `~/.claude/plugins/data/${segment}`;
}
