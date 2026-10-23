// Picks which recipes CI composes, from a list of changed paths. Prints a JSON
// array for the recipes.yml matrix. Usage:
//   git diff --name-only <base> HEAD | bun scripts/changed-recipes.ts
//   bun scripts/changed-recipes.ts --all
//
// recipes/<name>/**  → that recipe, plus every recipe that (transitively)
//                      requires it, since compose applies it underneath them
// hosts/<host>/**    → every recipe that declares that host (no dependents)
// anything shared    → every recipe (see SHARED)
// anything else      → nothing (demos, docs, other workflows)
import { existsSync, readdirSync, statSync } from "node:fs";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { RecipeManifest } from "@cnippet/recipe-kit";

const ROOT = resolve(import.meta.dir, "..");
const RECIPES_DIR = join(ROOT, "recipes");

// Paths that can change how every recipe composes or builds.
const SHARED = [
  /^scripts\//,
  /^packages\//,
  /^package\.json$/,
  /^bun\.lock$/,
  /^recipes\/[^/]+$/, // recipes/tsconfig.json and other top-level files
  /^\.github\/workflows\/(ci|recipes)\.yml$/,
];

const listRecipes = (): string[] =>
  readdirSync(RECIPES_DIR)
    .filter((entry) => statSync(join(RECIPES_DIR, entry)).isDirectory())
    .filter((entry) => existsSync(join(RECIPES_DIR, entry, "recipe.config.ts")))
    .sort();

async function loadConfigs(names: string[]) {
  const configs = new Map<string, RecipeManifest>();
  for (const name of names) {
    const path = join(RECIPES_DIR, name, "recipe.config.ts");
    const mod = await import(pathToFileURL(path).href);
    configs.set(name, RecipeManifest.parse(mod.default));
  }
  return configs;
}

async function select(paths: string[]): Promise<string[]> {
  const all = listRecipes();
  if (paths.some((path) => SHARED.some((re) => re.test(path)))) return all;

  const configs = await loadConfigs(all);
  const selected = new Set<string>();

  for (const path of paths) {
    const [top, name] = path.split("/");
    if (top === "recipes" && name && configs.has(name)) selected.add(name);
  }

  // Add dependents until nothing changes: a change to `prisma` must re-run
  // every recipe that composes on top of it. Host changes are added after
  // this, since a dependent never builds in a host it doesn't declare.
  let grew = true;
  while (grew) {
    grew = false;
    for (const [recipe, config] of configs) {
      if (selected.has(recipe)) continue;
      if (config.requires.some((required) => selected.has(required))) {
        selected.add(recipe);
        grew = true;
      }
    }
  }

  for (const path of paths) {
    const [top, name] = path.split("/");
    if (top !== "hosts" || !name) continue;
    for (const [recipe, config] of configs) {
      if (config.hosts.includes(name)) selected.add(recipe);
    }
  }

  return all.filter((name) => selected.has(name));
}

const paths = process.argv.includes("--all")
  ? null
  : (await Bun.stdin.text())
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);

const recipes = paths ? await select(paths) : listRecipes();
console.log(JSON.stringify(recipes));
