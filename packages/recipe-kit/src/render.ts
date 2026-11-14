// Turns a recipe's real source files (recipes/<name>/files/) into the text a
// given project receives: `when` filters applied, `#if` directives resolved,
// append marker blocks extracted, `{{srcDir}}`/`{{appDir}}` targets resolved.
// compose (CI) and the cnippet-stack registry (users) both call renderFiles(),
// so what CI tests is byte-for-byte what users install.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { StepSource } from "./merge.js";
import type { RecipeFile, RecipeManifest, Step } from "./schema.js";
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
  /** `append` only: the `cnippet:<marker>` block name. A Pro add-on's files use `<recipe>-pro`. */
  marker?: string;
  replaces?: boolean;
  strategy: RecipeFile["strategy"];
  target: string;
}

/**
 * Renders every file of `manifest`'s steps (up to and including step
 * `through`, if given) that applies to `scope`. `source` is the folder
 * holding `recipe.config.ts` and `files/`, or, for a Pro recipe (base +
 * add-on), a function giving each step's folder and append marker
 * (`proStepSource`).
 *
 * When a later `create` file has the same target as an earlier one (a Pro
 * step replacing a base file), only the later one is kept, with the earlier
 * one's `replaces`: the target exists in the app only if it did before.
 */
export function renderFiles(
  manifest: RecipeManifest,
  source: string | ((step: Step) => StepSource),
  scope: WhenScope,
  through?: string,
): RenderedFile[] {
  const last = through
    ? manifest.steps.findIndex((step) => step.id === through)
    : manifest.steps.length - 1;
  if (last === -1) throw new Error(`${manifest.name}: no step "${through}"`);

  const sourceOf =
    typeof source === "string"
      ? () => ({ dir: source, marker: manifest.name })
      : source;
  const srcDir = Boolean(scope.detection.srcDir);
  const rendered = manifest.steps.slice(0, last + 1).flatMap((step) => {
    const { dir, marker } = sourceOf(step);
    return step.files
      .filter((file) => evaluateWhen(file.when, scope))
      .map((file): RenderedFile => {
        let contents = readFileSync(
          join(dir, "files", file.source),
          "utf8",
        ).replaceAll("\r\n", "\n");
        if (file.strategy === "append") {
          contents = extractMarkerBlock(contents, marker, file.source);
        }
        return {
          contents: renderDirectives(contents, scope, file.source),
          injection: file.injection,
          ...(file.strategy === "append" ? { marker } : {}),
          replaces: file.replaces,
          strategy: file.strategy,
          target: resolveTarget(file.target, srcDir),
        };
      });
  });

  const out: RenderedFile[] = [];
  for (const file of rendered) {
    const earlier =
      file.strategy === "create" && file.replaces
        ? out.findIndex(
            (f) => f.strategy === "create" && f.target === file.target,
          )
        : -1;
    if (earlier === -1) {
      out.push(file);
      continue;
    }
    out.push({ ...file, replaces: out[earlier]?.replaces });
    out.splice(earlier, 1);
  }
  return out;
}
