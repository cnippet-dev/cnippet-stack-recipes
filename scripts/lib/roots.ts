// Where recipes live. This repo, plus every dir in CNIPPET_EXTRA_ROOTS (split
// on the OS path delimiter), e.g. the Pro repo, which runs these scripts from
// its free/ submodule. A folder is a base or an add-on by its config (has
// `extends`), not by which root it's in. Hosts only come from this repo.
import { existsSync, readdirSync, statSync } from "node:fs";
import { delimiter, join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import {
  mergeAddon,
  type ProRecipe,
  proStepSource,
  RecipeAddon,
  RecipeManifest,
  type Step,
  type StepSource,
} from "@cnippet/recipe-kit";

export const ROOT = resolve(import.meta.dir, "../..");

export const ROOTS: string[] = [
  ROOT,
  ...(process.env.CNIPPET_EXTRA_ROOTS ?? "")
    .split(delimiter)
    .filter(Boolean)
    .map((dir) => resolve(dir)),
];

export type RecipeKind = "recipe" | "addon";

export interface RecipeDir {
  dir: string;
  kind: RecipeKind;
  name: string;
  root: string;
}

export const hostDir = (host: string): string => join(ROOT, "hosts", host);

export const listHosts = (): string[] => listDirs(join(ROOT, "hosts"));

function listDirs(dir: string): string[] {
  return existsSync(dir)
    ? readdirSync(dir).filter((entry) =>
        statSync(join(dir, entry)).isDirectory(),
      )
    : [];
}

/** The config's default export, unparsed. */
export async function readConfig(dir: string): Promise<unknown> {
  const mod = await import(pathToFileURL(join(dir, "recipe.config.ts")).href);
  return mod.default;
}

// Same rule as recipe-kit's parseRecipeConfig, without parsing.
export const isAddonConfig = (raw: unknown): boolean =>
  typeof raw === "object" && raw !== null && "extends" in raw;

/** Every recipe folder (with a recipe.config.ts) in every root, bases and add-ons. */
export async function listRecipeDirs(kind?: RecipeKind): Promise<RecipeDir[]> {
  const found: RecipeDir[] = [];
  for (const root of ROOTS) {
    const recipesDir = join(root, "recipes");
    for (const name of listDirs(recipesDir).sort()) {
      const dir = join(recipesDir, name);
      if (!existsSync(join(dir, "recipe.config.ts"))) continue;
      const entryKind = isAddonConfig(await readConfig(dir))
        ? "addon"
        : "recipe";
      if (!kind || kind === entryKind)
        found.push({ dir, kind: entryKind, name, root });
    }
  }
  return found;
}

/** The folder of the base (`recipe`) or add-on (`addon`) called `name`, or undefined. */
export async function findRecipeDir(
  name: string,
  kind: RecipeKind,
): Promise<string | undefined> {
  return (await listRecipeDirs(kind)).find((r) => r.name === name)?.dir;
}

export async function loadBase(
  name: string,
): Promise<{ dir: string; manifest: RecipeManifest }> {
  const dir = await findRecipeDir(name, "recipe");
  if (!dir) throw new Error(`no such recipe: ${name}`);
  return { dir, manifest: RecipeManifest.parse(await readConfig(dir)) };
}

export interface LoadedPro {
  addonDir: string;
  baseDir: string;
  pro: ProRecipe;
  source: (step: Step) => StepSource;
}

/** Base + add-on merged, with the step source renderFiles needs. */
export async function loadPro(name: string): Promise<LoadedPro> {
  const base = await loadBase(name);
  const addonDir = await findRecipeDir(name, "addon");
  if (!addonDir) {
    throw new Error(
      `no Pro add-on for ${name} (looked in ${ROOTS.join(", ")}; set CNIPPET_EXTRA_ROOTS)`,
    );
  }
  const pro = mergeAddon(
    base.manifest,
    RecipeAddon.parse(await readConfig(addonDir)),
  );
  return {
    addonDir,
    baseDir: base.dir,
    pro,
    source: proStepSource(pro, base.dir, addonDir),
  };
}
