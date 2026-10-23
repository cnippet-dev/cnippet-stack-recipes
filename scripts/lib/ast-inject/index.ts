// Local dispatcher over the upstream ast-inject strategies (the sibling files
// are verbatim copies). Upstream's own index.ts is not copied because it is
// coupled to the CLI's backup/RenderedFile plumbing.
import { existsSync } from "node:fs";
import { Project } from "ts-morph";
import type { StepFile } from "../../types";
import { applyAddImport } from "./add-import";
import { applyAddObjectProperty } from "./add-object-property";
import { applyAddToArray } from "./add-to-array";
import { applyWrapJsx } from "./wrap-jsx";

export function applyAstInject(
  dest: string,
  injection: NonNullable<StepFile["injection"]>,
  contents: string,
): "injected" | "skipped" {
  if (!existsSync(dest)) {
    throw new Error(
      `ast-inject target ${dest} does not exist — ast-inject only modifies existing files`,
    );
  }

  const project = new Project({ useInMemoryFileSystem: false });
  const sourceFile = project.addSourceFileAtPath(dest);

  const { status } = (() => {
    switch (injection.kind) {
      case "add-import":
        return applyAddImport(project, sourceFile, contents);
      case "wrap-jsx":
        return applyWrapJsx(sourceFile, injection.anchor, contents);
      case "add-to-array":
        return applyAddToArray(sourceFile, injection.anchor, contents);
      case "add-object-property":
        return applyAddObjectProperty(
          project,
          sourceFile,
          injection.anchor,
          contents,
        );
    }
  })();

  if (status === "injected") sourceFile.saveSync();
  return status;
}
