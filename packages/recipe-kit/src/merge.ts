// Base (free recipe) + add-on (its Pro part) → one manifest, the "Pro recipe".
// compose (CI), the cnippet-stack registry and next.cnippet.dev all merge with
// this, so they agree on what a Pro install is.
import type { RecipeAddon, RecipeManifest, Step } from "./schema.js";

export interface ProRecipe {
  addon: RecipeAddon;
  /** Ids of the steps that came from the add-on (rendered from the add-on's folder). */
  addonStepIds: Set<string>;
  /** Base + add-on, `tier: "pro"`. `version` is the base's; the add-on's is `addon.version`. */
  manifest: RecipeManifest;
}

/** Where a step's files live, and the marker its `append` blocks use. */
export interface StepSource {
  dir: string;
  marker: string;
}

/** The append marker of an add-on's files: `cnippet:<name>-pro`, so they never collide with the base's. */
export function addonMarker(name: string): string {
  return `${name}-pro`;
}

function parseVersion(version: string): [number, number, number] {
  const match = /^(\d+)\.(\d+)\.(\d+)$/.exec(version.trim());
  if (!match) throw new Error(`"${version}" is not a plain x.y.z version`);
  return [Number(match[1]), Number(match[2]), Number(match[3])];
}

function compare(a: number[], b: number[]): number {
  for (let i = 0; i < 3; i++) {
    const diff = (a[i] ?? 0) - (b[i] ?? 0);
    if (diff !== 0) return diff;
  }
  return 0;
}

/**
 * Whether `version` is in `range`. Supports exact "1.2.3", "^1.2.3" and ">=1.2.3".
 * shortcut: no pre-release tags or `||` ranges; add the `semver` package if a recipe ever needs them.
 */
export function satisfiesRange(version: string, range: string): boolean {
  const v = parseVersion(version);
  const trimmed = range.trim();
  if (trimmed.startsWith(">="))
    return compare(v, parseVersion(trimmed.slice(2))) >= 0;
  if (!trimmed.startsWith("^")) return compare(v, parseVersion(trimmed)) === 0;

  const min = parseVersion(trimmed.slice(1));
  if (compare(v, min) < 0) return false;
  // ^1.2.3 → same major; ^0.3.0 → same 0.minor; ^0.0.3 → exactly 0.0.3.
  if (min[0] > 0) return v[0] === min[0];
  if (min[1] > 0) return v[0] === 0 && v[1] === min[1];
  return compare(v, min) === 0;
}

// "@prisma/client@^7.9.1" → "@prisma/client"
function packageName(spec: string): string {
  const at = spec.lastIndexOf("@");
  return at > 0 ? spec.slice(0, at) : spec;
}

function unionDeps(field: string, base: string[], addon: string[]): string[] {
  const byName = new Map(base.map((spec) => [packageName(spec), spec]));
  for (const spec of addon) {
    const existing = byName.get(packageName(spec));
    if (existing !== undefined && existing !== spec) {
      throw new Error(
        `${field}: the add-on wants "${spec}" but the base has "${existing}" — change the version in the base instead`,
      );
    }
    byName.set(packageName(spec), spec);
  }
  return [...byName.values()];
}

function assertUnique(what: string, ids: string[]): void {
  const seen = new Set<string>();
  for (const id of ids) {
    if (seen.has(id))
      throw new Error(`duplicate ${what} "${id}" in base + add-on`);
    seen.add(id);
  }
}

function union<T>(base: T[] = [], addon: T[] = []): T[] {
  return [...new Set([...base, ...addon])];
}

/** Merges a base recipe and its add-on into the Pro recipe. Throws with a plain message on any conflict. */
export function mergeAddon(
  base: RecipeManifest,
  addon: RecipeAddon,
): ProRecipe {
  const where = `${addon.name} (pro add-on)`;
  try {
    if (addon.extends !== base.name || addon.name !== base.name) {
      throw new Error(
        `name "${addon.name}" and extends "${addon.extends}" must both be "${base.name}"`,
      );
    }
    if (!satisfiesRange(base.version, addon.baseVersion)) {
      throw new Error(
        `built for base ${addon.baseVersion}, but the base is ${base.version} — update the add-on and its baseVersion`,
      );
    }

    const steps = [...base.steps, ...addon.steps];
    assertUnique(
      "step id",
      steps.map((s) => s.id),
    );
    const prompts = [...base.prompts, ...addon.prompts];
    assertUnique(
      "prompt id",
      prompts.map((p) => p.id),
    );
    const envVars = [...base.envVars, ...addon.envVars];
    assertUnique(
      "env var",
      envVars.map((v) => v.name),
    );

    const manifest: RecipeManifest = {
      ...base,
      checks: [...base.checks, ...addon.checks],
      cnippetUiComponents: union(
        base.cnippetUiComponents,
        addon.cnippetUiComponents,
      ),
      dependencies: unionDeps(
        "dependencies",
        base.dependencies,
        addon.dependencies,
      ),
      description: addon.description,
      devDependencies: unionDeps(
        "devDependencies",
        base.devDependencies,
        addon.devDependencies,
      ),
      envVars,
      gitignore: union(base.gitignore, addon.gitignore),
      prompts,
      requires: union(base.requires, addon.requires),
      steps,
      tier: "pro",
      title: addon.title,
      trustedBuildScripts: union(
        base.trustedBuildScripts,
        addon.trustedBuildScripts,
      ),
    };
    return {
      addon,
      addonStepIds: new Set(addon.steps.map((s) => s.id)),
      manifest,
    };
  } catch (error) {
    throw new Error(`${where}: ${(error as Error).message}`);
  }
}

/** For `renderFiles`: base steps read from `baseDir`, add-on steps from `addonDir` with the add-on marker. */
export function proStepSource(
  pro: ProRecipe,
  baseDir: string,
  addonDir: string,
): (step: Step) => StepSource {
  const name = pro.manifest.name;
  return (step) =>
    pro.addonStepIds.has(step.id)
      ? { dir: addonDir, marker: addonMarker(name) }
      : { dir: baseDir, marker: name };
}
