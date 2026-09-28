// Turns a real source file from recipes/<name>/files/ into the text a given
// project receives: `#if` directives resolved, append markers honoured, and
// `{{srcDir}}`/`{{appDir}}` placeholders in targets resolved.
// (RECIPES-MIGRATION.md §3.5–3.7)
import { evaluateWhen, type WhenScope } from "./when";

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
        throw new Error(`${where}: #each is not supported by compose yet`);
    }
  }

  if (block) throw new Error(`${file}: unclosed #if`);
  return out.join("\n");
}

/**
 * For `append` sources: returns the marker lines plus everything between
 * them. Anything outside the markers is context for the reader and is not
 * appended.
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
  return lines.slice(start, end + 1).join("\n");
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
