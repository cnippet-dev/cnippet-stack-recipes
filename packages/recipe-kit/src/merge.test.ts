import { describe, expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { mergeAddon, proStepSource, satisfiesRange } from "./merge.js";
import { renderFiles } from "./render.js";
import {
  parseRecipeConfig,
  RecipeAddon,
  type RecipeAddonInput,
  RecipeManifest,
  type RecipeManifestInput,
} from "./schema.js";
import type { WhenScope } from "./when.js";

const step = (id: string, files: unknown[] = []) => ({
  files,
  id,
  title: id,
  verify: "it works",
  why: "because",
});

const baseInput: RecipeManifestInput = {
  category: "auth",
  dependencies: ["next-auth@^5.0.0", "zod@^4.0.0"],
  description: "Free auth",
  envVars: [{ description: "secret", name: "AUTH_SECRET" }],
  hosts: ["with-prisma"],
  name: "authjs",
  prompts: [
    { default: true, id: "starterUi", message: "UI?", type: "confirm" },
  ],
  steps: [
    step("config", [
      { source: "auth.ts", strategy: "create", target: "{{srcDir}}auth.ts" },
      {
        replaces: true,
        source: "page.tsx",
        strategy: "create",
        target: "{{appDir}}page.tsx",
      },
      {
        source: "schema.prisma",
        strategy: "append",
        target: "prisma/schema.prisma",
      },
    ]),
  ],
  supports: { next: ["16"], orm: ["prisma"], router: ["app"] },
  tier: "free",
  title: "Auth.js",
  version: "0.3.0",
};

const addonInput: RecipeAddonInput = {
  baseVersion: "^0.3.0",
  dependencies: ["zod@^4.0.0", "otplib@^12.0.0"],
  description: "Production auth",
  envVars: [{ description: "key", name: "OTP_KEY" }],
  extends: "authjs",
  features: ["2FA"],
  name: "authjs",
  prompts: [
    { default: true, id: "twoFactor", message: "2FA?", type: "confirm" },
  ],
  steps: [
    step("two-factor", [
      {
        replaces: true,
        source: "auth.ts",
        strategy: "create",
        target: "{{srcDir}}auth.ts",
      },
      {
        replaces: true,
        source: "page.tsx",
        strategy: "create",
        target: "{{appDir}}page.tsx",
      },
      { source: "otp.ts", strategy: "create", target: "{{srcDir}}lib/otp.ts" },
      {
        source: "schema.prisma",
        strategy: "append",
        target: "prisma/schema.prisma",
      },
    ]),
  ],
  tier: "pro",
  title: "Auth.js Pro",
  version: "1.0.0",
};

const base = () => RecipeManifest.parse(baseInput);
const addon = (overrides: Partial<RecipeAddonInput> = {}) =>
  RecipeAddon.parse({ ...addonInput, ...overrides });

describe("satisfiesRange", () => {
  test.each([
    ["0.3.0", "^0.3.0", true],
    ["0.3.9", "^0.3.0", true],
    ["0.4.0", "^0.3.0", false],
    ["0.2.9", "^0.3.0", false],
    ["1.9.0", "^1.2.0", true],
    ["2.0.0", "^1.2.0", false],
    ["0.0.4", "^0.0.3", false],
    ["0.0.3", "^0.0.3", true],
    ["5.0.0", ">=0.3.0", true],
    ["0.2.0", ">=0.3.0", false],
    ["0.3.0", "0.3.0", true],
    ["0.3.1", "0.3.0", false],
  ])("%s in %s → %p", (version, range, expected) => {
    expect(satisfiesRange(version, range)).toBe(expected);
  });

  test("rejects versions it can't read", () => {
    expect(() => satisfiesRange("0.3.0-beta.1", "^0.3.0")).toThrow();
  });
});

describe("parseRecipeConfig", () => {
  test("tells a recipe from an add-on", () => {
    expect(parseRecipeConfig(baseInput).kind).toBe("recipe");
    expect(parseRecipeConfig(addonInput).kind).toBe("addon");
  });

  test("an add-on must be pro and list its features", () => {
    expect(() => parseRecipeConfig({ ...addonInput, tier: "free" })).toThrow();
    expect(() => parseRecipeConfig({ ...addonInput, features: [] })).toThrow();
  });
});

describe("mergeAddon", () => {
  test("base first, then add-on; Pro title, base version", () => {
    const { manifest, addonStepIds } = mergeAddon(base(), addon());
    expect(manifest.steps.map((s) => s.id)).toEqual(["config", "two-factor"]);
    expect(manifest.prompts.map((p) => p.id)).toEqual([
      "starterUi",
      "twoFactor",
    ]);
    expect(manifest.envVars.map((v) => v.name)).toEqual([
      "AUTH_SECRET",
      "OTP_KEY",
    ]);
    expect(manifest.tier).toBe("pro");
    expect(manifest.title).toBe("Auth.js Pro");
    expect(manifest.description).toBe("Production auth");
    expect(manifest.version).toBe("0.3.0");
    expect(manifest.hosts).toEqual(["with-prisma"]);
    expect([...addonStepIds]).toEqual(["two-factor"]);
  });

  test("dependencies: union by package, same spec once", () => {
    expect(mergeAddon(base(), addon()).manifest.dependencies).toEqual([
      "next-auth@^5.0.0",
      "zod@^4.0.0",
      "otplib@^12.0.0",
    ]);
  });

  test("dependencies: a different range for a base package is an error", () => {
    expect(() =>
      mergeAddon(base(), addon({ dependencies: ["zod@^3.0.0"] })),
    ).toThrow(/zod@\^3\.0\.0.*zod@\^4\.0\.0/);
  });

  test.each([
    ["step id", { steps: [step("config")] }],
    [
      "prompt id",
      {
        prompts: [{ id: "starterUi", message: "?", type: "confirm" as const }],
      },
    ],
    ["env var", { envVars: [{ description: "again", name: "AUTH_SECRET" }] }],
  ])("a duplicate %s is an error", (what, overrides) => {
    expect(() => mergeAddon(base(), addon(overrides))).toThrow(
      new RegExp(`duplicate ${what}`),
    );
  });

  test("base version outside baseVersion is an error", () => {
    expect(() => mergeAddon(base(), addon({ baseVersion: "^0.4.0" }))).toThrow(
      /built for base \^0\.4\.0, but the base is 0\.3\.0/,
    );
  });

  test("name and extends must match the base", () => {
    expect(() =>
      mergeAddon(base(), addon({ extends: "resend", name: "resend" })),
    ).toThrow(/must both be "authjs"/);
  });

  test("errors name the add-on", () => {
    expect(() => mergeAddon(base(), addon({ baseVersion: "^9.0.0" }))).toThrow(
      /^authjs \(pro add-on\): /,
    );
  });
});

function writeTree(root: string, files: Record<string, string>) {
  for (const [path, contents] of Object.entries(files)) {
    mkdirSync(dirname(join(root, path)), { recursive: true });
    writeFileSync(join(root, path), contents);
  }
}

describe("renderFiles with a Pro recipe", () => {
  const root = mkdtempSync(join(tmpdir(), "recipe-kit-"));
  const baseDir = join(root, "free", "authjs");
  const addonDir = join(root, "pro", "authjs");
  writeTree(baseDir, {
    "files/auth.ts": "export const auth = 'free';\n",
    "files/page.tsx": "export default 'free page';\n",
    "files/schema.prisma":
      "// >>> cnippet:authjs\nmodel User {}\n// <<< cnippet:authjs\n",
  });
  writeTree(addonDir, {
    "files/auth.ts": "export const auth = 'pro';\n",
    "files/otp.ts":
      "// #if answers.twoFactor\nexport const otp = true;\n// #endif\n",
    "files/page.tsx": "export default 'pro page';\n",
    "files/schema.prisma":
      "// >>> cnippet:authjs-pro\nmodel TwoFactor {}\n// <<< cnippet:authjs-pro\n",
  });

  const scope: WhenScope = {
    answers: { starterUi: true, twoFactor: true },
    detection: { srcDir: false },
  };
  const pro = mergeAddon(base(), addon());
  const files = renderFiles(
    pro.manifest,
    proStepSource(pro, baseDir, addonDir),
    scope,
  );
  const byTarget = (target: string) => files.filter((f) => f.target === target);

  test("a replaced base file is written once, with the Pro contents", () => {
    expect(byTarget("auth.ts")).toEqual([
      expect.objectContaining({ contents: "export const auth = 'pro';\n" }),
    ]);
  });

  test("it keeps the base file's `replaces`: false for a new file, true for a host file", () => {
    expect(byTarget("auth.ts")[0]?.replaces).toBe(false);
    expect(byTarget("app/page.tsx")[0]?.replaces).toBe(true);
  });

  test("appends keep both blocks, each with its own marker", () => {
    expect(
      byTarget("prisma/schema.prisma").map((f) => [f.marker, f.contents]),
    ).toEqual([
      ["authjs", "model User {}"],
      ["authjs-pro", "model TwoFactor {}"],
    ]);
  });

  test("add-on files read their own folder and #if base + add-on answers", () => {
    expect(byTarget("lib/otp.ts")[0]?.contents).toBe(
      "export const otp = true;\n",
    );
  });

  test("the replacing file lands where the Pro step is, after the base files", () => {
    expect(files.map((f) => f.target)).toEqual([
      "prisma/schema.prisma",
      "auth.ts",
      "app/page.tsx",
      "lib/otp.ts",
      "prisma/schema.prisma",
    ]);
  });

  test("the base alone renders as before", () => {
    const free = renderFiles(base(), baseDir, scope);
    expect(free.map((f) => [f.target, f.contents, f.marker])).toEqual([
      ["auth.ts", "export const auth = 'free';\n", undefined],
      ["app/page.tsx", "export default 'free page';\n", undefined],
      ["prisma/schema.prisma", "model User {}", "authjs"],
    ]);
  });
});
