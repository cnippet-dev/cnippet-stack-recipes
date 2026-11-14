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
//
// --pro: only recipes that have a Pro add-on (CNIPPET_EXTRA_ROOTS), for the Pro
// repo's CI. A base and its add-on share a name, so a change to either selects it.
import { RecipeManifest } from "@cnippet/recipe-kit";
import { listRecipeDirs, readConfig } from "./lib/roots";

// Paths that can change how every recipe composes or builds.
const SHARED = [
  /^free$/, // the Pro repo's submodule of this repo: every base may have changed
  /^scripts\//,
  /^packages\//,
  /^package\.json$/,
  /^bun\.lock$/,
  /^recipes\/[^/]+$/, // recipes/tsconfig.json and other top-level files
  /^\.github\/workflows\/(ci|recipes)\.yml$/,
];

const pro = process.argv.includes("--pro");
const entries = await listRecipeDirs();
const addons = new Set(
  entries.filter((e) => e.kind === "addon").map((e) => e.name),
);
const bases = entries.filter((e) => e.kind === "recipe");
const listRecipes = (): string[] =>
  bases
    .map((e) => e.name)
    .filter((name) => !pro || addons.has(name))
    .sort();

async function loadConfigs() {
  const configs = new Map<string, RecipeManifest>();
  for (const { dir, name } of bases) {
    configs.set(name, RecipeManifest.parse(await readConfig(dir)));
  }
  return configs;
}

async function select(paths: string[]): Promise<string[]> {
  const all = listRecipes();
  if (paths.some((path) => SHARED.some((re) => re.test(path)))) return all;

  const configs = await loadConfigs();
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
