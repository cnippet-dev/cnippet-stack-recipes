// Validates every recipes/<name>/recipe.config.ts (or only the names passed as
// arguments). Usage: bun run validate-recipes [name ...]
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join, posix, relative, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { RecipeManifest, resolveTarget } from "@cnippet/recipe-kit";

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

const listFiles = (dir: string): string[] =>
  readdirSync(dir).flatMap((entry) => {
    const path = join(dir, entry);
    return statSync(path).isDirectory() ? listFiles(path) : [path];
  });

const UI_IMPORT = /\bfrom\s+["']([^"']+)["']/g;
// `@/` works with and without src/; `../` breaks when files move between steps or layouts.
const IMPORT = /(?:\bfrom\s*|\bimport\s*\(\s*|\bimport\s+)["']([^"']+)["']/g;
const CODE_FILE = /\.(tsx?|jsx?|mjs)$/;
const UI_PATH = /^components\/ui\/([a-z0-9-]+)$/;

// Registry components the files import from `components/ui/`, by `@/` alias
// or relative path. Paths are relative to `files/`, mirroring the target app.
function importedUiComponents(filesDir: string): Set<string> {
  const used = new Set<string>();
  for (const path of listFiles(filesDir)) {
    const file = relative(filesDir, path).split(/[\\/]/).join("/");
    for (const [, specifier] of readFileSync(path, "utf8").matchAll(
      UI_IMPORT,
    )) {
      const target = specifier.startsWith("@/")
        ? specifier.slice(2)
        : specifier.startsWith(".")
          ? posix.join(posix.dirname(file), specifier)
          : "";
      const match = target.match(UI_PATH);
      if (match) used.add(match[1]);
    }
  }
  return used;
}

// Strings still holding a placeholder from `recipe new` / `pull-recipe --write`.
function todoPaths(value: unknown, path = ""): string[] {
  if (typeof value === "string") {
    return value.includes("TODO") ? [path || "(root)"] : [];
  }
  if (value && typeof value === "object") {
    return Object.entries(value).flatMap(([key, child]) =>
      todoPaths(child, path ? `${path}.${key}` : key),
    );
  }
  return [];
}

// Fenced code longer than this in a guide is pasted code; use <Step> instead.
const MAX_FENCE_LINES = 5;
const STEP_TAG = /<Step\s+id=["']([^"']+)["']/g;

function validateGuide(
  guidePath: string,
  name: string,
  stepIds: string[],
): string[] {
  const errors: string[] = [];
  const text = readFileSync(guidePath, "utf8").replaceAll("\r\n", "\n");

  const frontmatter = /^---\n([\s\S]*?)\n---/.exec(text)?.[1];
  const fields = new Map(
    (frontmatter ?? "").split("\n").map((line) => {
      const colon = line.indexOf(":");
      return [
        line.slice(0, colon).trim(),
        line
          .slice(colon + 1)
          .trim()
          .replace(/^["']|["']$/g, ""),
      ];
    }),
  );
  // The parts of next.cnippet.dev's frontmatter schema (cnippet-mdx) a guide
  // can get wrong; the site build rejects these.
  for (const field of ["title", "description", "date"]) {
    if (!fields.get(field))
      errors.push(`guide.mdx: frontmatter needs ${field}`);
  }
  const title = fields.get("title") ?? "";
  const description = fields.get("description") ?? "";
  if (title.length > 70) {
    errors.push("guide.mdx: title must be at most 70 characters");
  }
  if (description.length < 80 || description.length > 180) {
    errors.push(
      `guide.mdx: description must be 80–180 characters (is ${description.length})`,
    );
  }
  if (
    fields.get("date") &&
    !/^\d{4}-\d{2}-\d{2}$/.test(fields.get("date") ?? "")
  ) {
    errors.push("guide.mdx: date must be YYYY-MM-DD");
  }
  if (fields.get("category") !== "guide") {
    errors.push('guide.mdx: frontmatter category must be "guide"');
  }
  if (
    !["draft", "published", "archived"].includes(fields.get("status") ?? "")
  ) {
    errors.push("guide.mdx: status must be draft, published or archived");
  }
  if (fields.get("recipe") !== name) {
    errors.push(`guide.mdx: frontmatter recipe must be "${name}"`);
  }

  const counts = new Map<string, number>();
  for (const [, id] of text.matchAll(STEP_TAG)) {
    counts.set(id, (counts.get(id) ?? 0) + 1);
  }
  for (const id of stepIds) {
    const count = counts.get(id) ?? 0;
    if (count !== 1) {
      errors.push(
        `guide.mdx: <Step id="${id}" /> appears ${count} times, needs 1`,
      );
    }
  }
  for (const id of counts.keys()) {
    if (!stepIds.includes(id))
      errors.push(`guide.mdx: unknown step id "${id}"`);
  }

  let fenceStart = -1;
  for (const [index, line] of text.split("\n").entries()) {
    if (!/^\s*(```|~~~)/.test(line)) continue;
    if (fenceStart === -1) {
      fenceStart = index;
    } else {
      if (index - fenceStart - 1 > MAX_FENCE_LINES) {
        errors.push(
          `guide.mdx:${fenceStart + 1}: code block is ${index - fenceStart - 1} lines — show code with <Step>, not pasted`,
        );
      }
      fenceStart = -1;
    }
  }

  if (text.includes("TODO")) errors.push("guide.mdx: still has TODOs");
  return errors;
}

async function loadConfig(name: string): Promise<RecipeManifest | undefined> {
  const configPath = join(RECIPES_DIR, name, "recipe.config.ts");
  if (!existsSync(configPath)) return undefined;
  const mod = await import(pathToFileURL(configPath).href);
  const parsed = RecipeManifest.safeParse(mod.default);
  return parsed.success ? parsed.data : undefined;
}

// `create` targets of every recipe this one requires, directly or not. Two
// recipes creating the same file means the second install silently skips it.
async function requiredCreateTargets(
  config: RecipeManifest,
): Promise<Map<string, string>> {
  const owners = new Map<string, string>();
  const seen = new Set<string>([config.name]);
  const queue = [...config.requires];
  while (queue.length > 0) {
    const name = queue.shift() as string;
    if (seen.has(name)) continue;
    seen.add(name);
    const required = await loadConfig(name);
    if (!required) continue;
    queue.push(...required.requires);
    for (const step of required.steps) {
      for (const file of step.files) {
        if (file.strategy === "create") owners.set(file.target, name);
      }
    }
  }
  return owners;
}

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
  const parsed = RecipeManifest.safeParse(mod.default);
  if (!parsed.success) {
    return [
      ...errors,
      ...parsed.error.issues.map(
        (issue) => `${issue.path.join(".") || "(root)"}: ${issue.message}`,
      ),
    ];
  }
  const config = parsed.data;

  for (const path of todoPaths(mod.default)) {
    errors.push(`${path}: still a TODO — fill it in`);
  }
  const guidePath = join(recipeDir, "guide.mdx");
  if (existsSync(guidePath)) {
    errors.push(
      ...validateGuide(
        guidePath,
        name,
        config.steps.map((s) => s.id),
      ),
    );
  }

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

  const requiredTargets = await requiredCreateTargets(config);
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
      if (file.replaces && file.strategy !== "create") {
        errors.push(`${where}: \`replaces\` only applies to create files`);
      }
      const owner = requiredTargets.get(file.target);
      if (file.strategy === "create" && owner) {
        errors.push(
          `${where}: ${file.target} is also created by required recipe "${owner}"`,
        );
      }
      if (file.strategy === "create") {
        for (const host of config.hosts.filter((h) => hosts.has(h))) {
          const hostDir = join(HOSTS_DIR, host);
          const target = resolveTarget(
            file.target,
            existsSync(join(hostDir, "src", "app")),
          );
          const exists = existsSync(join(hostDir, target));
          if (exists && !file.replaces) {
            errors.push(
              `${where}: ${target} already exists in host "${host}" — set \`replaces: true\``,
            );
          } else if (!exists && file.replaces) {
            errors.push(
              `${where}: "${file.source}" is marked \`replaces\` but host "${host}" has no ${target}`,
            );
          }
        }
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

  if (existsSync(filesDir)) {
    if (existsSync(join(filesDir, "components", "ui"))) {
      errors.push(
        "files/components/ui/ must not exist; declare registry components in `cnippetUiComponents`",
      );
    }
    for (const path of listFiles(filesDir).filter((p) => CODE_FILE.test(p))) {
      const file = relative(filesDir, path).split(/[\\/]/).join("/");
      for (const [, specifier] of readFileSync(path, "utf8").matchAll(IMPORT)) {
        if (specifier.startsWith("../")) {
          errors.push(`${file}: relative import "${specifier}" — use @/`);
        }
      }
    }
    const declared = new Set(config.cnippetUiComponents ?? []);
    const used = importedUiComponents(filesDir);
    for (const component of used) {
      if (!declared.has(component)) {
        errors.push(
          `cnippetUiComponents: "${component}" is imported but not declared`,
        );
      }
    }
    for (const component of declared) {
      if (!used.has(component)) {
        errors.push(
          `cnippetUiComponents: "${component}" is declared but never imported`,
        );
      }
    }
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
