// Verbatim copy of cnippet-stack/packages/cli/src/installer/strategies/ast-inject/shared.ts — keep identical to upstream.
// TODO: import from cnippet-stack once this repo depends on it (it already shares @cnippet/recipe-kit).

import type {
  ArrayLiteralExpression,
  ObjectLiteralExpression,
  SourceFile,
} from "ts-morph";
import { Node, SyntaxKind } from "ts-morph";

type ContainerKind = "array" | "object";
type ContainerFor<K extends ContainerKind> = K extends "array"
  ? ArrayLiteralExpression
  : ObjectLiteralExpression;

function isMatchingLiteral<K extends ContainerKind>(
  node: Node | undefined,
  kind: K,
): node is ContainerFor<K> {
  if (!node) return false;
  return kind === "array"
    ? Node.isArrayLiteralExpression(node)
    : Node.isObjectLiteralExpression(node);
}

/** Unwraps one layer of call expression (`withX({...})`, `defineConfig({...})`) to reach its first argument. */
function unwrapSingleCall(node: Node): Node {
  return Node.isCallExpression(node) ? (node.getArguments()[0] ?? node) : node;
}

function defaultExportExpression(sourceFile: SourceFile): Node | undefined {
  for (const statement of sourceFile.getStatements()) {
    if (Node.isExportAssignment(statement) && !statement.isExportEquals()) {
      return unwrapSingleCall(statement.getExpression());
    }
  }
  return undefined;
}

/**
 * Locates the array/object literal an `add-to-array`/`add-object-property`
 * injection should target, in the same "search by name across the whole
 * file" spirit as `wrap-jsx.ts`'s anchor lookup:
 *  1. any property (in an object literal anywhere) named `anchor`, whose
 *     value is the right literal kind;
 *  2. a top-level `const anchor = [...]`/`{...}`;
 *  3. if `anchor` is empty or `"default"`, the file's default export
 *     (unwrapping one `withX({...})`/`defineConfig({...})` call layer).
 */
export function findAnchorContainer<K extends ContainerKind>(
  sourceFile: SourceFile,
  anchor: string,
  kind: K,
): ContainerFor<K> {
  if (anchor && anchor !== "default") {
    const property = sourceFile
      .getDescendantsOfKind(SyntaxKind.PropertyAssignment)
      .find((p) => p.getName() === anchor);
    if (isMatchingLiteral(property?.getInitializer(), kind)) {
      return property.getInitializer() as ContainerFor<K>;
    }

    const variable = sourceFile.getVariableDeclaration(anchor);
    if (isMatchingLiteral(variable?.getInitializer(), kind)) {
      return variable.getInitializer() as ContainerFor<K>;
    }
  }

  const defaultExport = defaultExportExpression(sourceFile);
  if (isMatchingLiteral(defaultExport, kind)) {
    return defaultExport;
  }

  throw new Error(
    `ast-inject: couldn't find a${kind === "array" ? "n array" : "n object"} literal named "${anchor}" in ${sourceFile.getFilePath()}.`,
  );
}
