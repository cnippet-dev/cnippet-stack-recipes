// Adds what pull-recipe found to recipe.config.ts with ts-morph. It only ever
// adds: a missing array entry, a missing property, `replaces: true`. Anything
// it can't edit safely (a value that isn't a literal) comes back as a hint.
import { spawnSync } from "node:child_process";
import {
  type ArrayLiteralExpression,
  Node,
  type ObjectLiteralExpression,
  Project,
  type SourceFile,
} from "ts-morph";

export type ConfigAdditions = {
  cnippetUiComponents: string[];
  dependencies: string[];
  devDependencies: string[];
  // Names only; the description is left as a TODO for the author.
  envVars: string[];
  // `create` sources that need `replaces: true`.
  replaces: string[];
};

function manifestObject(file: SourceFile): ObjectLiteralExpression {
  let node: Node | undefined = file
    .getStatements()
    .find(Node.isExportAssignment)
    ?.getExpression();
  while (
    node &&
    (Node.isSatisfiesExpression(node) ||
      Node.isAsExpression(node) ||
      Node.isParenthesizedExpression(node))
  ) {
    node = node.getExpression();
  }
  if (node && Node.isIdentifier(node)) {
    node = file.getVariableDeclaration(node.getText())?.getInitializer();
  }
  if (!node || !Node.isObjectLiteralExpression(node)) {
    throw new Error("recipe.config.ts must default-export an object literal");
  }
  return node;
}

// The array literal under `name`, created (in key order) when missing.
// undefined when the value isn't an array literal we can safely append to.
function arrayProperty(
  obj: ObjectLiteralExpression,
  name: string,
): ArrayLiteralExpression | undefined {
  const prop = obj.getProperty(name);
  if (prop) {
    const value = Node.isPropertyAssignment(prop)
      ? prop.getInitializer()
      : undefined;
    return value && Node.isArrayLiteralExpression(value) ? value : undefined;
  }
  // Insert indexes count comment lines too.
  const properties = obj.getPropertiesWithComments();
  const after = properties.findIndex(
    (p) => Node.isPropertyAssignment(p) && p.getName() > name,
  );
  const added = obj.insertPropertyAssignment(
    after === -1 ? properties.length : after,
    { initializer: "[]", name },
  );
  return added.getInitializer() as ArrayLiteralExpression;
}

const stringValue = (node: Node | undefined) =>
  node &&
  (Node.isStringLiteral(node) || Node.isNoSubstitutionTemplateLiteral(node))
    ? node.getLiteralText()
    : undefined;

// `{ source: "x" }`, `create("x")` or `{ ...create("x"), … }`.
function fileSource(node: Node): string | undefined {
  if (Node.isCallExpression(node)) return stringValue(node.getArguments()[0]);
  if (!Node.isObjectLiteralExpression(node)) return undefined;
  const source = node.getProperty("source");
  if (source && Node.isPropertyAssignment(source)) {
    return stringValue(source.getInitializer());
  }
  for (const prop of node.getProperties()) {
    if (Node.isSpreadAssignment(prop)) {
      const found = fileSource(prop.getExpression());
      if (found) return found;
    }
  }
  return undefined;
}

function fileEntries(obj: ObjectLiteralExpression): Node[] {
  const steps = obj.getProperty("steps");
  const list =
    steps && Node.isPropertyAssignment(steps) ? steps.getInitializer() : null;
  if (!list || !Node.isArrayLiteralExpression(list)) return [];
  return list.getElements().flatMap((step) => {
    if (!Node.isObjectLiteralExpression(step)) return [];
    const files = step.getProperty("files");
    const value =
      files && Node.isPropertyAssignment(files) ? files.getInitializer() : null;
    return value && Node.isArrayLiteralExpression(value)
      ? value.getElements()
      : [];
  });
}

function setReplaces(entry: Node): boolean {
  if (Node.isCallExpression(entry)) {
    entry.replaceWithText(`{ ...${entry.getText()}, replaces: true }`);
    return true;
  }
  if (!Node.isObjectLiteralExpression(entry)) return false;
  const prop = entry.getProperty("replaces");
  if (!prop) {
    entry.addPropertyAssignment({ initializer: "true", name: "replaces" });
    return true;
  }
  if (!Node.isPropertyAssignment(prop)) return false;
  prop.setInitializer("true");
  return true;
}

/** Applies `additions` to the config and saves it. Returns what it couldn't apply. */
export function addToConfig(
  configPath: string,
  additions: ConfigAdditions,
): string[] {
  const project = new Project({ skipAddingFilesFromTsConfig: true });
  const file = project.addSourceFileAtPath(configPath);
  const manifest = manifestObject(file);
  const skipped: string[] = [];

  const arrays: [string, string[]][] = [
    ["cnippetUiComponents", additions.cnippetUiComponents],
    ["dependencies", additions.dependencies],
    ["devDependencies", additions.devDependencies],
  ];
  for (const [name, items] of arrays) {
    if (!items.length) continue;
    const array = arrayProperty(manifest, name);
    if (array) array.addElements(items.map((item) => JSON.stringify(item)));
    else skipped.push(`${name}: add ${JSON.stringify(items)} by hand`);
  }

  if (additions.envVars.length) {
    const array = arrayProperty(manifest, "envVars");
    if (array) {
      array.addElements(
        additions.envVars.map(
          (name) =>
            `{ description: "TODO: what it is and where to get it.", name: ${JSON.stringify(name)} }`,
        ),
      );
    } else {
      skipped.push(`envVars: add ${JSON.stringify(additions.envVars)} by hand`);
    }
  }

  // One at a time: replacing a node can invalidate the ones found before it.
  for (const source of additions.replaces) {
    const entry = fileEntries(manifest).find((e) => fileSource(e) === source);
    if (!entry || !setReplaces(entry)) {
      skipped.push(`${source}: set \`replaces: true\` by hand`);
    }
  }

  file.saveSync();
  spawnSync("bunx", ["biome", "format", "--write", configPath], {
    shell: process.platform === "win32",
    stdio: "ignore",
  });
  return skipped;
}
