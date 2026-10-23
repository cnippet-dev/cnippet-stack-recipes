// Turns a recipe's real source files (recipes/<name>/files/) into the text a
// given project receives: `when` filters applied, `#if` directives resolved,
// append marker blocks extracted, `{{srcDir}}`/`{{appDir}}` targets resolved.
// compose (CI) and the cnippet-stack registry (users) both call renderFiles(),
// so what CI tests is byte-for-byte what users install.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { RecipeFile, RecipeManifest } from "./schema.js";
import { evaluateWhen, type WhenScope } from "./when.js";

// `// #if expr`, `# #if expr`, `<!-- #if expr -->` — the file's own comment syntax.
const DIRECTIVE =
  /^\s*(?:\/\/|#|<!--)\s*#(if|else|endif|each)\b\s*(.*?)\s*(?:-->)?\s*$/;
const MAX_BRANCHES = 3;

/** Resolves `#if`/`#else`/`#endif` blocks. Directive lines are dropped. */
export function renderDirectives(
  source: string,
  scope: WhenScope,
  file: string,
): string {
  const out: string[] = [];
  let block: { keep: boolean; inElse: boolean } | null = null;
  let branches = 0;

  for (const [index, line] of source.split("\n").entries()) {
    const match = DIRECTIVE.exec(line);
    const where = `${file}:${index + 1}`;
    if (!match) {
      if (!block || block.keep) out.push(line);
      continue;
    }

    const [, directive, expression] = match;
    switch (directive) {
      case "if":
        if (block) throw new Error(`${where}: nested #if is not allowed`);
        if (++branches > MAX_BRANCHES) {
          throw new Error(
            `${where}: more than ${MAX_BRANCHES} #if blocks — make it a separate recipe`,
          );
        }
        block = { inElse: false, keep: evaluateWhen(expression, scope) };
        break;
      case "else":
        if (!block || block.inElse) throw new Error(`${where}: stray #else`);
        block = { inElse: true, keep: !block.keep };
        break;
      case "endif":
        if (!block) throw new Error(`${where}: stray #endif`);
        block = null;
        break;
      case "each":
        throw new Error(`${where}: #each is not supported`);
    }
  }

  if (block) throw new Error(`${file}: unclosed #if`);
  return out.join("\n");
}

/**
 * For `append` sources: returns the lines between the `>>> cnippet:<recipe>`
 * and `<<< cnippet:<recipe>` markers (markers excluded — the installer adds
 * its own). Anything outside them is context for the reader, not appended.
 */
export function extractMarkerBlock(
  source: string,
  recipe: string,
  file: string,
): string {
  const lines = source.split("\n");
  const start = lines.findIndex((l) => l.includes(`>>> cnippet:${recipe}`));
  const end = lines.findIndex((l) => l.includes(`<<< cnippet:${recipe}`));
  if (start === -1 || end === -1 || end < start) {
    throw new Error(`${file}: missing cnippet:${recipe} marker block`);
  }
  return lines.slice(start + 1, end).join("\n");
}

export function resolveTarget(target: string, srcDir: boolean): string {
  const resolved = target
    .replaceAll("{{srcDir}}", srcDir ? "src/" : "")
    .replaceAll("{{appDir}}", srcDir ? "src/app/" : "app/");
  const leftover = /\{\{[^}]*\}\}/.exec(resolved);
  if (leftover) {
    throw new Error(`unknown placeholder ${leftover[0]} in target "${target}"`);
  }
  return resolved;
}

export interface RenderedFile {
  contents: string;
  injection?: RecipeFile["injection"];
  replaces?: boolean;
  strategy: RecipeFile["strategy"];
  target: string;
}

/**
 * Renders every file of `manifest`'s steps (up to and including step
 * `through`, if given) that applies to `scope`. `recipeDir` is the folder
 * holding `recipe.config.ts` and `files/`.
 */
export function renderFiles(
  manifest: RecipeManifest,
  recipeDir: string,
  scope: WhenScope,
  through?: string,
): RenderedFile[] {
  const last = through
    ? manifest.steps.findIndex((step) => step.id === through)
    : manifest.steps.length - 1;
  if (last === -1) throw new Error(`${manifest.name}: no step "${through}"`);

  const srcDir = Boolean(scope.detection.srcDir);
  return manifest.steps
    .slice(0, last + 1)
    .flatMap((step) => step.files)
    .filter((file) => evaluateWhen(file.when, scope))
    .map((file) => {
      let contents = readFileSync(
        join(recipeDir, "files", file.source),
        "utf8",
      ).replaceAll("\r\n", "\n");
      if (file.strategy === "append") {
        contents = extractMarkerBlock(contents, manifest.name, file.source);
      }
      return {
        contents: renderDirectives(contents, scope, file.source),
        injection: file.injection,
        replaces: file.replaces,
        strategy: file.strategy,
        target: resolveTarget(file.target, srcDir),
      };
    });
}
