// Validates every recipes/<name>/recipe.config.ts (or only the names passed as
// arguments). Usage: bun run validate-recipes [name ...]
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { RecipeConfig, toManifest } from "./types";

const ROOT = resolve(import.meta.dir, "..");
const RECIPES_DIR = join(ROOT, "recipes");
const HOSTS_DIR = join(ROOT, "hosts");

const listDirs = (dir: string): string[] =>
  existsSync(dir)
    ? readdirSync(dir).filter((entry) =>
        statSync(join(dir, entry)).isDirectory(),
      )
    : [];

const countSentences = (text: string): number =>
  text.split(/[.!?](\s|$)/).filter((part) => part.trim().length > 0).length;

async function validateRecipe(
  name: string,
  allRecipes: Set<string>,
  hosts: Set<string>,
): Promise<string[]> {
  const errors: string[] = [];
  const recipeDir = join(RECIPES_DIR, name);
  const configPath = join(recipeDir, "recipe.config.ts");
  const filesDir = join(recipeDir, "files");

  if (!existsSync(configPath)) return ["missing recipe.config.ts"];
  if (!existsSync(filesDir)) errors.push("missing files/ directory");
  if (existsSync(join(recipeDir, "package.json"))) {
    errors.push("recipes must not have a package.json");
  }

  const mod = await import(pathToFileURL(configPath).href);
  const parsed = RecipeConfig.safeParse(mod.default);
  if (!parsed.success) {
    return [
      ...errors,
      ...parsed.error.issues.map(
        (issue) => `${issue.path.join(".") || "(root)"}: ${issue.message}`,
      ),
    ];
  }
  const config = parsed.data;

  if (config.name !== name) {
    errors.push(`name "${config.name}" must equal folder name "${name}"`);
  }
  for (const host of config.hosts) {
    if (!hosts.has(host)) errors.push(`hosts: unknown host "${host}"`);
  }
  for (const required of config.requires) {
    if (!allRecipes.has(required)) {
      errors.push(`requires: unknown recipe "${required}"`);
    }
  }
  if (config.steps.length < 3 && !config.thin) {
    errors.push(
      `only ${config.steps.length} step(s); mark the recipe \`thin: true\` or split it into 3+ steps`,
    );
  }

  const seenIds = new Set<string>();
  for (const step of config.steps) {
    const where = `step "${step.id}"`;
    if (seenIds.has(step.id)) errors.push(`${where}: duplicate step id`);
    seenIds.add(step.id);

    if (countSentences(step.why) > 3) {
      errors.push(`${where}: \`why\` must be 1-3 sentences`);
    }

    for (const file of step.files) {
      const sourcePath = join(filesDir, file.source);
      if (!existsSync(sourcePath)) {
        errors.push(
          `${where}: source "${file.source}" does not exist in files/`,
        );
        continue;
      }
      if (file.strategy === "append") {
        const contents = readFileSync(sourcePath, "utf8");
        for (const marker of [`>>> cnippet:${name}`, `<<< cnippet:${name}`]) {
          if (!contents.includes(marker)) {
            errors.push(
              `${where}: append source "${file.source}" is missing marker "${marker}"`,
            );
          }
        }
      }
    }
  }

  try {
    toManifest(config);
  } catch (error) {
    errors.push(`does not flatten to a valid RecipeManifest: ${error}`);
  }

  return errors;
}

async function main() {
  const allRecipes = new Set(listDirs(RECIPES_DIR));
  const hosts = new Set(listDirs(HOSTS_DIR));
  const requested = process.argv.slice(2);

  for (const name of requested) {
    if (!allRecipes.has(name)) {
      console.error(`✗ ${name}: no such recipe in recipes/`);
      process.exit(1);
    }
  }

  const names = requested.length > 0 ? requested : [...allRecipes].sort();
  let failed = 0;
  for (const name of names) {
    const errors = await validateRecipe(name, allRecipes, hosts);
    if (errors.length === 0) {
      console.log(`✓ ${name}`);
    } else {
      failed++;
      console.error(`✗ ${name}`);
      for (const error of errors) console.error(`    ${error}`);
    }
  }

  console.log(`\n${names.length - failed}/${names.length} recipe(s) valid`);
  if (failed > 0) process.exit(1);
}

await main();
