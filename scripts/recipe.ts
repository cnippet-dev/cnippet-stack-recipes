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
//
// --pro works on the recipe's Pro add-on, which lives in the Pro repo (set
// CNIPPET_EXTRA_ROOTS to it, see lib/roots). new --pro: an add-on skeleton
// plus a build app with the base already composed in. check --pro: the same
// checks on the add-on's steps, plus an upgrade build (base, then add-on).
// guide --pro: the Pro guide, add-on steps only.
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, relative, resolve } from "node:path";
import { parseArgs } from "node:util";
import type { RecipeManifest, Step } from "@cnippet/recipe-kit";
import { copyHost } from "./lib/host";
import {
  hostDir as hostPath,
  loadBase,
  loadPro,
  ROOT,
  ROOTS,
} from "./lib/roots";

const DEFAULT_HOST = "app-router-no-src";
const USAGE = `usage:
  bun run recipe new <name> [--pro] [--host <host>] [--app <dir>]
  bun run recipe pull <name> --from <app> [<path> ...] [--write] [--diff]
  bun run recipe check <name> [--pro]
  bun run recipe guide <name> [--pro]`;

function fail(message: string): never {
  console.error(`✗ ${message}`);
  process.exit(1);
}

async function loadConfig(name: string): Promise<RecipeManifest> {
  try {
    return (await loadBase(name)).manifest;
  } catch (error) {
    fail((error as Error).message);
  }
}

async function loadAddon(name: string) {
  try {
    return await loadPro(name);
  } catch (error) {
    fail((error as Error).message);
  }
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

const addonTemplate = (
  name: string,
  baseVersion: string,
) => `import type { RecipeAddonInput } from "@cnippet/recipe-kit";

// The Pro add-on for the free "${name}" recipe: only the extra steps and files.
// Fill in every TODO: \`bun run recipe check ${name} --pro\` fails while one is
// left. A file that replaces one the base creates needs \`replaces: true\`;
// append files use the \`cnippet:${name}-pro\` markers.

export default {
  baseVersion: "^${baseVersion}",
  description: "TODO: one or two sentences on what Pro adds.",
  extends: "${name}",
  features: ["TODO: one line per thing Pro adds"],
  name: "${name}",
  steps: [
    {
      files: [],
      id: "first-pro-step",
      title: "TODO",
      verify: "TODO: what the user can see when this step works.",
      why: "TODO: 1-3 sentences on why this step exists.",
    },
  ],
  tier: "pro",
  title: "TODO",
  version: "0.1.0",
} satisfies RecipeAddonInput;
`;

async function createAddon(name: string, host: string, app?: string) {
  const proRoot = ROOTS[1];
  if (!proRoot) {
    fail("set CNIPPET_EXTRA_ROOTS to the Pro repo to create an add-on");
  }
  const base = await loadConfig(name);
  const addonDir = join(proRoot, "recipes", name);
  if (existsSync(addonDir)) fail(`${addonDir} already exists`);
  const appDir = resolve(ROOT, app ?? `../build/${name}-pro`);
  if (existsSync(appDir)) fail(`${appDir} already exists — pass --app <dir>`);

  mkdirSync(join(addonDir, "files"), { recursive: true });
  writeFileSync(
    join(addonDir, "recipe.config.ts"),
    addonTemplate(name, base.version),
  );
  console.log(`✓ ${addonDir}/recipe.config.ts and files/`);

  // The build app starts from the base, so the author builds Pro on top of it.
  const { status } = spawnSync(
    "bun",
    ["run", "compose", name, "--host", host, "--out", appDir, "--typecheck"],
    { cwd: ROOT, stdio: "inherit" },
  );
  if (status !== 0) fail(`composing the ${name} base into ${appDir} failed`);
  console.log(`✓ build app at ${appDir} (hosts/${host} + ${name})`);

  const appArg = relative(ROOT, appDir);
  console.log(`
next:
  1. add the Pro code in ${appArg}
  2. bun run recipe pull ${name} --pro --from ${appArg} <paths...> --write
  3. fill in the TODOs in ${relative(ROOT, addonDir)}/recipe.config.ts
  4. bun run recipe check ${name} --pro`);
}

async function create(name: string, args: string[]) {
  const { values } = parseArgs({
    args,
    options: {
      app: { type: "string" },
      host: { type: "string" },
      pro: { type: "boolean" },
    },
  });
  if (!/^[a-z0-9-]+$/.test(name)) {
    fail(`recipe name must be a lowercase slug: ${name}`);
  }
  const host = values.host ?? DEFAULT_HOST;
  const hostDir = hostPath(host);
  if (!existsSync(hostDir)) fail(`no such host: ${host}`);
  if (values.pro) return createAddon(name, host, values.app);
  const recipeDir = join(ROOT, "recipes", name);
  if (existsSync(recipeDir)) fail(`recipes/${name} already exists`);
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

async function check(name: string, pro: boolean) {
  const steps = pro
    ? (await loadAddon(name)).pro.addon.steps
    : (await loadConfig(name)).steps;
  const flag = pro ? ["--pro"] : [];

  const checks: [label: string, args: string[]][] = [
    ["validate-recipes", ["validate-recipes", name]],
    ["check-coverage", ["check-coverage", name]],
    ...steps.map(({ id }): [string, string[]] => [
      `typecheck through ${id}`,
      ["compose", name, ...flag, "--through", id, "--typecheck"],
    ]),
    ["build", ["compose", name, ...flag, "--build"]],
    ...(pro
      ? [
          [
            "upgrade build",
            ["compose", name, "--pro", "--upgrade", "--build"],
          ] as [string, string[]],
        ]
      : []),
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

  console.log(`\nrecipe check ${name}${pro ? " --pro" : ""}:`);
  for (const line of passed) console.log(`✓ ${line}`);
}

const STEP_TAG = /<Step\s+id=["']([^"']+)["']/g;

const stepSection = (step: Step) => `## ${step.title}

<Step id="${step.id}" />

{/* TODO: what this step adds and why, in plain words. */}
`;

async function proGuide(name: string) {
  const { addonDir, pro } = await loadAddon(name);
  return { config: pro.addon, guidePath: join(addonDir, "guide.mdx") };
}

async function guide(name: string, pro: boolean) {
  const { config, guidePath } = pro
    ? await proGuide(name)
    : {
        config: await loadConfig(name),
        guidePath: join((await loadBase(name)).dir, "guide.mdx"),
      };

  if (!existsSync(guidePath) && pro) {
    // Continues the Free guide: only the add-on steps, read by licensed users.
    writeFileSync(
      guidePath,
      `---
title: ${JSON.stringify(config.title)}
description: ${JSON.stringify(config.description)}
date: ${new Date().toISOString().slice(0, 10)}
category: guide
status: draft
recipe: ${name}
part: "pro"
---

## What Pro adds

{/* TODO: what the reader has after the Free guide, and what these steps add on top. */}

${config.steps.map(stepSection).join("\n")}
## When things go wrong

{/* TODO: one entry per error from your notes: the exact message, why it happens, the fix. */}
`,
    );
    console.log(
      `✓ wrote ${relative(ROOT, guidePath)} — fill in the TODOs (docs/writing-guides.md)`,
    );
    return;
  }

  if (!existsSync(guidePath)) {
    writeFileSync(
      guidePath,
      `---
title: ${JSON.stringify(config.title)}
description: ${JSON.stringify(config.description)}
date: ${new Date().toISOString().slice(0, 10)}
category: guide
status: draft
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
    await check(name, rest.includes("--pro"));
    break;
  case "guide":
    await guide(name, rest.includes("--pro"));
    break;
  default:
    fail(USAGE);
}
