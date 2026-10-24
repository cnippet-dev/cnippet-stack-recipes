import { expect, test } from "bun:test";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { addToConfig, type ConfigAdditions } from "./edit-config";

const none: ConfigAdditions = {
  cnippetUiComponents: [],
  dependencies: [],
  devDependencies: [],
  envVars: [],
  replaces: [],
};

const CONFIG = `const create = (source: string) => ({ source, strategy: "create" as const, target: source });
const shared = ["clsx@^2"];

export default {
  category: "email",
  // kept: a human comment
  dependencies: ["resend@^6.31.0"],
  devDependencies: shared,
  name: "demo",
  steps: [
    {
      files: [
        create("lib/a.ts"),
        create("app/page.tsx"),
        { source: "app/layout.tsx", strategy: "create" as const, target: "x", replaces: false },
      ],
      id: "one",
    },
  ],
  title: "Demo",
} satisfies Record<string, unknown>;
`;

function edit(additions: Partial<ConfigAdditions>) {
  const path = join(mkdtempSync(join(tmpdir(), "edit-config-")), "c.ts");
  writeFileSync(path, CONFIG);
  const skipped = addToConfig(path, { ...none, ...additions });
  return { skipped, text: readFileSync(path, "utf8") };
}

// Every identifier/string the human wrote is still there after an edit.
const kept = (text: string) => {
  for (const token of CONFIG.match(/"[^"]*"|\/\/[^\n]*|\b[a-zA-Z_]\w*\b/g) ??
    []) {
    if (token !== "false") expect(text).toContain(token);
  }
};

test("appends to an existing array and keeps everything else", () => {
  const { skipped, text } = edit({ dependencies: ["zod@^4.4.3"] });
  expect(skipped).toEqual([]);
  expect(text).toContain('"resend@^6.31.0"');
  expect(text).toContain('"zod@^4.4.3"');
  kept(text);
});

test("creates a missing property in key order", () => {
  const { text } = edit({
    cnippetUiComponents: ["button"],
    envVars: ["API_KEY"],
  });
  expect(text.indexOf("cnippetUiComponents")).toBeLessThan(
    text.indexOf("dependencies"),
  );
  expect(text.indexOf("envVars")).toBeGreaterThan(
    text.indexOf("devDependencies"),
  );
  expect(text.indexOf("envVars")).toBeLessThan(text.indexOf("name:"));
  expect(text).toMatch(/description: "TODO[^"]*",\s*name: "API_KEY"/);
  kept(text);
});

test("sets replaces on create() calls and object literals", () => {
  const { skipped, text } = edit({
    replaces: ["app/page.tsx", "app/layout.tsx"],
  });
  expect(skipped).toEqual([]);
  expect(text).toContain('{ ...create("app/page.tsx"), replaces: true }');
  expect(text).toMatch(/source: "app\/layout.tsx"[^}]*replaces: true/);
  expect(text).not.toContain("replaces: false");
  expect(text).toContain('create("lib/a.ts")'); // untouched
  kept(text);
});

test("skips what isn't a literal or isn't in the config", () => {
  const { skipped, text } = edit({
    devDependencies: ["typescript@^5"],
    replaces: ["app/missing.tsx"],
  });
  expect(skipped).toEqual([
    'devDependencies: add ["typescript@^5"] by hand',
    "app/missing.tsx: set `replaces: true` by hand",
  ]);
  expect(text).toContain("devDependencies: shared");
  expect(text).not.toContain("typescript@^5");
});
