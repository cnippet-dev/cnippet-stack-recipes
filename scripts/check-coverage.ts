// Fails if any file under recipes/<name>/files/ is not claimed by exactly one
// step. `next build` catches broken imports; it does not catch a component
// that was dropped from the config but is only reached at runtime.
// Usage: bun run check-coverage [name ...]
//
// Context-only files (present so a reader or an append has something to work
// against) go in recipes/<name>/.coverageignore, one path per line, relative
// to files/. Lines starting with # are comments.
// Pro add-ons (CNIPPET_EXTRA_ROOTS) are checked too: their files/ against
// their own steps.
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { RecipeAddon, RecipeManifest } from "@cnippet/recipe-kit";
import { listRecipeDirs, type RecipeDir, readConfig } from "./lib/roots";

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

async function checkRecipe({
  dir: recipeDir,
  kind,
}: RecipeDir): Promise<string[]> {
  const filesDir = join(recipeDir, "files");
  if (!existsSync(filesDir)) return ["missing files/ directory"];

  const raw = await readConfig(recipeDir);
  const parsed =
    kind === "addon"
      ? RecipeAddon.safeParse(raw)
      : RecipeManifest.safeParse(raw);
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
  const entries = await listRecipeDirs();
  const requested = process.argv.slice(2);
  for (const name of requested) {
    if (!entries.some((e) => e.name === name)) {
      console.error(`✗ ${name}: no such recipe in recipes/`);
      process.exit(1);
    }
  }

  const selected = requested.length
    ? entries.filter((e) => requested.includes(e.name))
    : entries;
  let failed = 0;
  for (const entry of selected) {
    const label = entry.kind === "addon" ? `${entry.name} (pro)` : entry.name;
    const errors = await checkRecipe(entry);
    if (errors.length === 0) {
      console.log(`✓ ${label}`);
    } else {
      failed++;
      console.error(`✗ ${label}`);
      for (const error of errors) console.error(`    ${error}`);
    }
  }

  console.log(
    `\n${selected.length - failed}/${selected.length} recipe(s) fully covered`,
  );
  if (failed > 0) process.exit(1);
}

await main();
