// Fails if any file under recipes/<name>/files/ is not claimed by exactly one
// step. `next build` catches broken imports; it does not catch a component
// that was dropped from the config but is only reached at runtime.
// Usage: bun run check-coverage [name ...]
//
// Context-only files (present so a reader or an append has something to work
// against) go in recipes/<name>/.coverageignore, one path per line, relative
// to files/. Lines starting with # are comments.
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, resolve, sep } from "node:path";
import { pathToFileURL } from "node:url";
import { RecipeConfig } from "./types";

const ROOT = resolve(import.meta.dir, "..");
const RECIPES_DIR = join(ROOT, "recipes");

const listDirs = (dir: string): string[] =>
  existsSync(dir)
    ? readdirSync(dir).filter((entry) =>
        statSync(join(dir, entry)).isDirectory(),
      )
    : [];

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const path = join(dir, entry);
    return statSync(path).isDirectory() ? walk(path) : [path];
  });
}

function readIgnore(recipeDir: string): Set<string> {
  const path = join(recipeDir, ".coverageignore");
  if (!existsSync(path)) return new Set();
  return new Set(
    readFileSync(path, "utf8")
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith("#")),
  );
}

async function checkRecipe(name: string): Promise<string[]> {
  const recipeDir = join(RECIPES_DIR, name);
  const filesDir = join(recipeDir, "files");
  if (!existsSync(filesDir)) return ["missing files/ directory"];

  const mod = await import(
    pathToFileURL(join(recipeDir, "recipe.config.ts")).href
  );
  const parsed = RecipeConfig.safeParse(mod.default);
  if (!parsed.success)
    return ["invalid recipe.config.ts — run validate-recipes"];

  const claims = new Map<string, string[]>();
  for (const step of parsed.data.steps) {
    for (const file of step.files) {
      claims.set(file.source, [...(claims.get(file.source) ?? []), step.id]);
    }
  }

  const ignored = readIgnore(recipeDir);
  const errors: string[] = [];

  for (const path of walk(filesDir).sort()) {
    const rel = relative(filesDir, path).split(sep).join("/");
    const steps = claims.get(rel) ?? [];
    if (ignored.has(rel)) {
      if (steps.length > 0) {
        errors.push(
          `${rel} is in .coverageignore but claimed by ${steps.join(", ")}`,
        );
      }
      continue;
    }
    if (steps.length === 0) errors.push(`unclaimed: ${rel}`);
    if (steps.length > 1) {
      errors.push(
        `${rel} is claimed by ${steps.length} steps: ${steps.join(", ")}`,
      );
    }
  }

  for (const entry of ignored) {
    if (!existsSync(join(filesDir, entry))) {
      errors.push(`.coverageignore lists ${entry}, which does not exist`);
    }
  }

  return errors;
}

async function main() {
  const allRecipes = listDirs(RECIPES_DIR);
  const requested = process.argv.slice(2);
  for (const name of requested) {
    if (!allRecipes.includes(name)) {
      console.error(`✗ ${name}: no such recipe in recipes/`);
      process.exit(1);
    }
  }

  const names = requested.length > 0 ? requested : allRecipes.sort();
  let failed = 0;
  for (const name of names) {
    const errors = await checkRecipe(name);
    if (errors.length === 0) {
      console.log(`✓ ${name}`);
    } else {
      failed++;
      console.error(`✗ ${name}`);
      for (const error of errors) console.error(`    ${error}`);
    }
  }

  console.log(
    `\n${names.length - failed}/${names.length} recipe(s) fully covered`,
  );
  if (failed > 0) process.exit(1);
}

await main();
