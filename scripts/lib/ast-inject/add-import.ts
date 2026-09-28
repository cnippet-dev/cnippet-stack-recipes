// Verbatim copy of cnippet-stack/packages/cli/src/installer/strategies/ast-inject/add-import.ts — keep identical to upstream.
// TODO: import from cnippet-stack once this repo depends on it (RECIPES-MIGRATION.md §3).

import type { Project, SourceFile } from "ts-morph";

export interface AddImportResult {
  status: "injected" | "skipped";
}

/**
 * `contents` is a single import statement's source, e.g.
 * `import { AuthProvider } from "@/lib/auth-client";`. Parsed once with a
 * throwaway source file to extract its shape, then merged into the real
 * target's imports (deduped by module specifier + named bindings).
 */
export function applyAddImport(
  project: Project,
  sourceFile: SourceFile,
  contents: string,
): AddImportResult {
  const scratch = project.createSourceFile("__scratch_import__.tsx", contents, {
    overwrite: true,
  });
  const [importDecl] = scratch.getImportDeclarations();
  if (!importDecl) {
    scratch.forget();
    throw new Error(
      `ast-inject "add-import": contents did not parse as an import statement:\n${contents}`,
    );
  }

  const moduleSpecifier = importDecl.getModuleSpecifierValue();
  const namedImports = importDecl.getNamedImports().map((n) => n.getName());
  const defaultImport = importDecl.getDefaultImport()?.getText();
  scratch.forget();

  const existing = sourceFile
    .getImportDeclarations()
    .find((decl) => decl.getModuleSpecifierValue() === moduleSpecifier);

  if (!existing) {
    sourceFile.addImportDeclaration({
      defaultImport,
      moduleSpecifier,
      namedImports,
    });
    return { status: "injected" };
  }

  const existingNamed = new Set(
    existing.getNamedImports().map((n) => n.getName()),
  );
  const missingNamed = namedImports.filter((name) => !existingNamed.has(name));
  const needsDefault = defaultImport && !existing.getDefaultImport();

  if (missingNamed.length === 0 && !needsDefault) {
    return { status: "skipped" };
  }

  if (missingNamed.length > 0) {
    existing.addNamedImports(missingNamed);
  }
  if (needsDefault) {
    existing.setDefaultImport(defaultImport);
  }
  return { status: "injected" };
}
