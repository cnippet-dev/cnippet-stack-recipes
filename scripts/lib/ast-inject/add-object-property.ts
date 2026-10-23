// Verbatim copy of cnippet-stack/packages/cli/src/installer/strategies/ast-inject/add-object-property.ts — keep identical to upstream.
// TODO: import from cnippet-stack once this repo depends on it (it already shares @cnippet/recipe-kit).

import type { Project, SourceFile } from "ts-morph";
import { Node } from "ts-morph";
import { findAnchorContainer } from "./shared.js";

export interface AddObjectPropertyResult {
  status: "injected" | "skipped";
}

/**
 * `contents` is a single bare property's source, e.g. `"ppr: true"` (parsed
 * once with a throwaway object literal, same scratch-parse trick as
 * `add-import.ts`, to split it into a name + initializer). Added to the
 * anchor object unless a property with that name already exists (idempotent
 * — the existing value is left alone rather than overwritten).
 */
export function applyAddObjectProperty(
  project: Project,
  sourceFile: SourceFile,
  anchor: string,
  contents: string,
): AddObjectPropertyResult {
  const scratch = project.createSourceFile(
    "__scratch_object__.ts",
    `({${contents}})`,
    { overwrite: true },
  );
  const objectLiteral = scratch
    .getStatements()[0]
    ?.getFirstDescendant((n) => Node.isObjectLiteralExpression(n));
  const [property] = objectLiteral?.getProperties() ?? [];
  if (
    !property ||
    !(
      Node.isPropertyAssignment(property) ||
      Node.isShorthandPropertyAssignment(property)
    )
  ) {
    scratch.forget();
    throw new Error(
      `ast-inject "add-object-property": contents did not parse as a property:\n${contents}`,
    );
  }

  const name = property.getName();
  const initializer = Node.isPropertyAssignment(property)
    ? property.getInitializer()?.getText()
    : undefined;
  scratch.forget();

  const object = findAnchorContainer(sourceFile, anchor, "object");
  const existing = object
    .getProperties()
    .find(
      (p) =>
        (Node.isPropertyAssignment(p) ||
          Node.isShorthandPropertyAssignment(p)) &&
        p.getName() === name,
    );
  if (existing) return { status: "skipped" };

  if (initializer !== undefined) {
    object.addPropertyAssignment({ initializer, name });
  } else {
    object.addShorthandPropertyAssignment({ name });
  }
  return { status: "injected" };
}
