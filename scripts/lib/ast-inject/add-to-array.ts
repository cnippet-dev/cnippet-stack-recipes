// Verbatim copy of cnippet-stack/packages/cli/src/installer/strategies/ast-inject/add-to-array.ts — keep identical to upstream.
// TODO: import from cnippet-stack once this repo depends on it (it already shares @cnippet/recipe-kit).

import type { SourceFile } from "ts-morph";
import { findAnchorContainer } from "./shared.js";

export interface AddToArrayResult {
  status: "injected" | "skipped";
}

/**
 * `contents` is a single bare array element's source, e.g. `"somePlugin()"`
 * — used as-is (no parsing needed, unlike `add-import`'s full statement).
 * Added to the anchor array unless an element with identical text is
 * already present (idempotent, dedup-by-exact-match).
 */
export function applyAddToArray(
  sourceFile: SourceFile,
  anchor: string,
  contents: string,
): AddToArrayResult {
  const elementText = contents.trim();
  if (!elementText) {
    throw new Error(
      `ast-inject "add-to-array": empty element contents for anchor "${anchor}".`,
    );
  }

  const array = findAnchorContainer(sourceFile, anchor, "array");
  const alreadyPresent = array
    .getElements()
    .some((el) => el.getText() === elementText);
  if (alreadyPresent) return { status: "skipped" };

  array.addElement(elementText);
  return { status: "injected" };
}
