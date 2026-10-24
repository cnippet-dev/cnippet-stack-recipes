// Author commands, thin wrappers over the other scripts. Usage:
//   bun run recipe new <name> [--host <host>] [--app <dir>]
//   bun run recipe pull <name> --from <app> [...]   (same as pull-recipe)
//   bun run recipe check <name>
//   bun run recipe guide <name>
//
// new: recipes/<name>/ with a TODO config and an empty files/, plus a build
// app copied from the host (default ../build/<name>) with deps installed.
// check: validate-recipes → check-coverage → compose --through <id>
// --typecheck for every step → compose --build. Stops at the first failure.
// guide: writes guide.mdx, or adds sections for steps it doesn't have yet.
// Never touches text that's already there.
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, relative, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { parseArgs } from "node:util";
import { RecipeManifest, type Step } from "@cnippet/recipe-kit";
import { copyHost } from "./lib/host";

const ROOT = resolve(import.meta.dir, "..");
const DEFAULT_HOST = "app-router-no-src";
const USAGE = `usage:
  bun run recipe new <name> [--host <host>] [--app <dir>]
  bun run recipe pull <name> --from <app> [<path> ...] [--write] [--diff]
  bun run recipe check <name>
  bun run recipe guide <name>`;

function fail(message: string): never {
  console.error(`✗ ${message}`);
  process.exit(1);
}

async function loadConfig(name: string): Promise<RecipeManifest> {
  const configPath = join(ROOT, "recipes", name, "recipe.config.ts");
  if (!existsSync(configPath)) fail(`no such recipe: ${name}`);
  return RecipeManifest.parse(
    (await import(pathToFileURL(configPath).href)).default,
  );
}

const configTemplate = (
  name: string,
  hosts: string[],
) => `import type { RecipeManifestInput } from "@cnippet/recipe-kit";

// Fill in every TODO: \`bun run recipe check ${name}\` fails while one is left.
// Fields and rules: docs/recipe-format.md. \`bun run recipe pull ${name} --write\`
// adds dependencies, cnippetUiComponents, envVars and \`replaces\` for you.

// \`app/...\` sources land in the app dir, everything else under srcDir.
const create = (source: string, when?: string) => ({
  source,
  strategy: "create" as const,
  target: source.startsWith("app/")
    ? \`{{appDir}}\${source.slice("app/".length)}\`
    : \`{{srcDir}}\${source}\`,
  ...(when ? { when } : {}),
});

export default {
  category: "TODO",
  description: "TODO: one sentence on what the user gets.",
  hosts: ${JSON.stringify(hosts)},
  name: "${name}",
  steps: [
    {
      // e.g. [create("lib/thing/client.ts")]
      files: [],
      id: "first-step",
      title: "TODO",
      verify: "TODO: what the user can see when this step works.",
      why: "TODO: 1-3 sentences on why this step exists.",
    },
  ],
  supports: { next: ["16"], orm: ["none"], router: ["app"] },
  tier: "free",
  title: "TODO",
  version: "0.1.0",
} satisfies RecipeManifestInput;
`;

async function create(name: string, args: string[]) {
  const { values } = parseArgs({
    args,
    options: { app: { type: "string" }, host: { type: "string" } },
  });
  if (!/^[a-z0-9-]+$/.test(name)) {
    fail(`recipe name must be a lowercase slug: ${name}`);
  }
  const recipeDir = join(ROOT, "recipes", name);
  if (existsSync(recipeDir)) fail(`recipes/${name} already exists`);
  const host = values.host ?? DEFAULT_HOST;
  const hostDir = join(ROOT, "hosts", host);
  if (!existsSync(hostDir)) fail(`no such host: ${host}`);
  const appDir = resolve(ROOT, values.app ?? `../build/${name}`);
  if (existsSync(appDir)) fail(`${appDir} already exists — pass --app <dir>`);

  mkdirSync(join(recipeDir, "files"), { recursive: true });
  const hosts = values.host ? [host] : ["app-router-src", "app-router-no-src"];
  writeFileSync(
    join(recipeDir, "recipe.config.ts"),
    configTemplate(name, hosts),
  );
  console.log(`✓ recipes/${name}/recipe.config.ts and files/`);

  copyHost(hostDir, appDir, name);
  console.log(`✓ build app at ${appDir} (from hosts/${host})`);
  const install = spawnSync("bun", ["install"], {
    cwd: appDir,
    shell: process.platform === "win32",
    stdio: "inherit",
  });
  if (install.status !== 0) fail(`bun install failed in ${appDir}`);

  const app = relative(ROOT, appDir);
  console.log(`
next:
  1. build it in ${app} (bun add <packages>, write the code step by step)
  2. bun run recipe pull ${name} --from ${app} <paths...> --write
  3. fill in the TODOs in recipes/${name}/recipe.config.ts
  4. bun run recipe check ${name}`);
}

async function check(name: string) {
  const { steps } = await loadConfig(name);

  const checks: [label: string, args: string[]][] = [
    ["validate-recipes", ["validate-recipes", name]],
    ["check-coverage", ["check-coverage", name]],
    ...steps.map(({ id }): [string, string[]] => [
      `typecheck through ${id}`,
      ["compose", name, "--through", id, "--typecheck"],
    ]),
    ["build", ["compose", name, "--build"]],
  ];

  const passed: string[] = [];
  for (const [label, args] of checks) {
    const { status } = spawnSync("bun", ["run", ...args], {
      cwd: ROOT,
      stdio: "inherit",
    });
    if (status !== 0) {
      for (const line of passed) console.log(`✓ ${line}`);
      fail(`${label}  (bun run ${args.join(" ")})`);
    }
    passed.push(label);
  }

  console.log(`\nrecipe check ${name}:`);
  for (const line of passed) console.log(`✓ ${line}`);
}

const STEP_TAG = /<Step\s+id=["']([^"']+)["']/g;

const stepSection = (step: Step) => `## ${step.title}

<Step id="${step.id}" />

{/* TODO: what this step adds and why, in plain words. */}
`;

async function guide(name: string) {
  const config = await loadConfig(name);
  const guidePath = join(ROOT, "recipes", name, "guide.mdx");

  if (!existsSync(guidePath)) {
    writeFileSync(
      guidePath,
      `---
title: ${JSON.stringify(config.title)}
description: ${JSON.stringify(config.description)}
recipe: ${name}
---

## What you'll build

{/* TODO: a screenshot, then 3–5 bullets of what works at the end. */}

## Before you start

{/* TODO: what the reader needs (accounts, a database, …). Mention the shortcut: \`npx cnippet-stack init ${name}\`. */}

## How it works

{/* TODO: the 2-minute idea behind the library. */}

${config.steps.map(stepSection).join("\n")}
## When things go wrong

{/* TODO: one entry per error from your notes: the exact message, why it happens, the fix. */}

## Next steps

{/* TODO: related recipes and guides. */}
`,
    );
    console.log(
      `✓ wrote recipes/${name}/guide.mdx — fill in the TODOs (docs/writing-guides.md)`,
    );
    return;
  }

  let text = readFileSync(guidePath, "utf8");
  const present = new Set([...text.matchAll(STEP_TAG)].map(([, id]) => id));
  const added: string[] = [];
  for (const [index, step] of config.steps.entries()) {
    if (present.has(step.id)) continue;
    // Before the next step the guide already has, else before the closing
    // sections, else at the end.
    const next = config.steps.slice(index + 1).find((s) => present.has(s.id));
    const anchor = next
      ? text.lastIndexOf(
          "\n## ",
          text.search(new RegExp(`<Step\\s+id=["']${next.id}["']`)),
        )
      : text.indexOf("\n## When things go wrong");
    const at = anchor === -1 ? text.length : anchor + 1;
    text = `${text.slice(0, at)}${stepSection(step)}\n${text.slice(at)}`;
    present.add(step.id);
    added.push(step.id);
  }
  if (!added.length) {
    console.log(`recipes/${name}/guide.mdx already has every step`);
    return;
  }
  writeFileSync(guidePath, text);
  console.log(`✓ added sections to guide.mdx: ${added.join(", ")}`);
}

const [command, name, ...rest] = process.argv.slice(2);
if (!name) fail(USAGE);
switch (command) {
  case "new":
    await create(name, rest);
    break;
  case "pull": {
    const { status } = spawnSync("bun", ["run", "pull-recipe", name, ...rest], {
      cwd: ROOT,
      stdio: "inherit",
    });
    process.exit(status ?? 1);
    break;
  }
  case "check":
    await check(name);
    break;
  case "guide":
    await guide(name);
    break;
  default:
    fail(USAGE);
}
