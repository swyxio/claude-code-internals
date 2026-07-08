/**
 * SCHEMATIC — NOT BEHAVIORALLY EQUIVALENT.
 * Reconstructed SKILL.md discovery and dynamic refresh boundaries.
 * Provenance: skills.dynamic-refresh, plugins.component-inventory,
 * workspace-trust.proxy-helper.
 * Confidence: observed = dynamic command replacement and plugin skill
 * component; derived = discovery contracts; hypothesis = SKILL.md parser,
 * source precedence, duplicate handling, trust routing, and cache behavior.
 */

export type SkillSource =
  | "managed"
  | "flag"
  | "local"
  | "project"
  | "user"
  | "plugin"
  | "bundled";

export interface SkillDefinition {
  name: string;
  description: string;
  source: SkillSource;
  directory: string;
  entrypoint: string;
  body: string;
  frontmatter: Record<string, unknown>;
  referencesDirectory?: string;
  scriptsDirectory?: string;
  assetsDirectory?: string;
}

export interface SkillScanRoot {
  path: string;
  source: SkillSource;
  trusted: boolean;
  pluginName?: string;
}

export interface SkillFilesystem {
  listDirectories(path: string): Promise<string[]>;
  exists(path: string): Promise<boolean>;
  readText(path: string): Promise<string>;
}

export interface SkillParser {
  parse(text: string, entrypoint: string, source: SkillSource): SkillDefinition;
}

export interface SkillPrecedencePolicy {
  resolve(found: SkillDefinition[]): {
    active: SkillDefinition[];
    shadowed: SkillDefinition[];
  };
}

export interface SkillTrustPolicy {
  mayScan(root: SkillScanRoot): boolean;
}

export async function discoverSkills(
  roots: SkillScanRoot[],
  fs: SkillFilesystem,
  parser: SkillParser,
  precedence: SkillPrecedencePolicy,
  trust: SkillTrustPolicy,
): Promise<{ active: SkillDefinition[]; shadowed: SkillDefinition[] }> {
  const found: SkillDefinition[] = [];
  for (const root of roots) {
    if (!trust.mayScan(root)) continue;
    for (const directory of await fs.listDirectories(root.path)) {
      const entrypoint = `${directory}/SKILL.md`;
      if (!(await fs.exists(entrypoint))) continue;
      found.push(
        parser.parse(await fs.readText(entrypoint), entrypoint, root.source),
      );
    }
  }
  return precedence.resolve(found);
}

/** Observed control message when skills appear after session initialization. */
export function dynamicSkillRefresh(skills: SkillDefinition[]): {
  type: "control_request";
  request: { subtype: "commands_changed"; commands: unknown[] };
} {
  return {
    type: "control_request",
    request: {
      subtype: "commands_changed",
      commands: skills.map((skill) => ({
        name: skill.name,
        description: skill.description,
        source: skill.source,
      })),
    },
  };
}
