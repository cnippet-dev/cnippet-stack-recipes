// Pulls a recipe's files out of a working Next.js app into
// recipes/<name>/files/ — the reverse of compose. Usage:
//   bun run pull-recipe <recipe> --from <app-dir> [<path> ...] [--write] [--force] [--diff]
//
// <path>s are recipe paths, the way they sit under files/: `lib/email/send.ts`,
// `app/api/webhooks/resend/route.ts`, or a directory. They're looked up in the
// app under src/ when it has src/app, so either layout works (a leading `src/`
// is also accepted and stripped). Use this for the first pull, before a
// recipe.config.ts exists.
//
// With no <path>s, the list comes from recipe.config.ts: every `create` file,
// read from its target resolved for the app's layout — the exact path compose
// would write. `append` and `ast-inject` sources are fragments, not files in
// the app, so they're skipped.
//
// Host files — ones every host already has, like `app/page.tsx` or
// `app/layout.tsx` — are boilerplate unless they import the recipe's own
// code. One that does (a page rendering `<EmailForm />`) is pulled even when
// not listed, and must be a `create` with `replaces: true` in the config. One
// that doesn't is refused.
//
// Dry run by default. --write copies; it refuses to overwrite a recipe file
// with uncommitted changes (you may have edited it here) unless --force.
// --diff prints a diff for every file that would change.
import { spawnSync } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { dirname, join, relative, resolve, sep } from "node:path";
import { pathToFileURL } from "node:url";
import { parseArgs } from "node:util";
import { RecipeManifest, resolveTarget } from "@cnippet/recipe-kit";

const ROOT = resolve(import.meta.dir, "..");
const DEFAULT_HOSTS = ["app-router-src", "app-router-no-src"];

// Never belong in files/, whatever the app has.
const REFUSED: [RegExp, string][] = [
  [/(^|\/)components\/ui\//, "list it in cnippetUiComponents instead"],
  [/(^|\/)\.env/, "declare it in envVars instead"],
  [/(^|\/)package\.json$/, "declare dependencies in the config instead"],
  [
    /(^|\/)(bun\.lockb?|package-lock\.json|pnpm-lock\.yaml|yarn\.lock)$/,
    "lockfiles never ship",
  ],
  [/\.mdx?$/, "docs never ship in files/"],
];
// Skipped silently when walking a directory.
const SKIP_DIRS = new Set([".git", ".next", ".turbo", "node_modules"]);

const IMPORT = /(?:\bfrom\s*|\bimport\s*\(\s*|\bimport\s+)["']([^"']+)["']/g;
const CODE_FILE = /\.(tsx?|jsx?|mjs)$/;
const RESOLVE_SUFFIXES = [
  "",
  ".ts",
  ".tsx",
  ".js",
  ".jsx",
  "/index.ts",
  "/index.tsx",
];
// `@/components/ui/button`, or a relative path ending in `ui/button`.
const UI_IMPORT = /^(?:@\/components|\.{1,2}(?:\/[^/]+)*)\/ui\/([^/]+)$/;

type Pull = { source: string; from: string };
type Status = "new" | "changed" | "same";

const toPosix = (path: string) => path.split(sep).join("/");
const normalize = (text: string) => text.replaceAll("\r\n", "\n");

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    if (SKIP_DIRS.has(entry)) return [];
    const path = join(dir, entry);
    return statSync(path).isDirectory() ? walk(path) : [path];
  });
}

async function loadConfig(name: string): Promise<RecipeManifest | undefined> {
  const configPath = join(ROOT, "recipes", name, "recipe.config.ts");
  if (!existsSync(configPath)) return undefined;
  const mod = await import(pathToFileURL(configPath).href);
  const parsed = RecipeManifest.safeParse(mod.default);
  if (!parsed.success) {
    throw new Error(`${name}: invalid recipe.config.ts — run validate-recipes`);
  }
  return parsed.data;
}

// Recipe path → app path: `app/x` → `src/app/x`, `lib/x` → `src/lib/x` when the
// app uses src/; anything not found under src/ (e.g. `prisma/`) is tried at
// the root.
function pullsFromPaths(appDir: string, srcDir: boolean, paths: string[]) {
  const pulls: Pull[] = [];
  const errors: string[] = [];
  for (const raw of paths) {
    const path = raw
      .replaceAll("\\", "/")
      .replace(/^\.\//, "")
      .replace(/\/$/, "");
    const recipePath = srcDir && path.startsWith("src/") ? path.slice(4) : path;
    const candidates = srcDir
      ? [`src/${recipePath}`, recipePath]
      : [recipePath];
    const found = candidates.find((c) => existsSync(join(appDir, c)));
    if (!found) {
      errors.push(
        `${raw}: not found in the app (looked for ${candidates.join(", ")})`,
      );
      continue;
    }

    const base = join(appDir, found);
    const files = statSync(base).isDirectory() ? walk(base) : [base];
    const prefix = srcDir && found.startsWith("src/") ? "src/" : "";
    for (const from of files) {
      const appRel = toPosix(relative(appDir, from));
      pulls.push({ from, source: appRel.slice(prefix.length) });
    }
  }
  return { errors, pulls };
}

function pullsFromConfig(
  appDir: string,
  srcDir: boolean,
  config: RecipeManifest,
) {
  const pulls: Pull[] = [];
  const errors: string[] = [];
  const skipped: string[] = [];
  for (const step of config.steps) {
    for (const file of step.files) {
      if (file.strategy !== "create") {
        skipped.push(`${file.source} (${file.strategy}, step ${step.id})`);
        continue;
      }
      const appRel = resolveTarget(file.target, srcDir);
      const from = join(appDir, appRel);
      if (!existsSync(from)) {
        errors.push(
          `${file.source}: ${appRel} not found in the app (step ${step.id})`,
        );
        continue;
      }
      pulls.push({ from, source: file.source });
    }
  }
  return { errors, pulls, skipped };
}

// "@scope/pkg/sub" → "@scope/pkg", "next/server" → "next"
function packageName(specifier: string): string | undefined {
  if (/^(\.|\/|@\/|node:|bun:)/.test(specifier)) return undefined;
  const parts = specifier.split("/");
  return specifier.startsWith("@") ? parts.slice(0, 2).join("/") : parts[0];
}

// "resend@^6.1.0" → "resend", "@scope/pkg@^1" → "@scope/pkg"
function specName(spec: string): string {
  const at = spec.lastIndexOf("@");
  return at > 0 ? spec.slice(0, at) : spec;
}

function hostPackages(hosts: string[]): Set<string> {
  const names = new Set<string>();
  for (const host of hosts) {
    const pkgPath = join(ROOT, "hosts", host, "package.json");
    if (!existsSync(pkgPath)) continue;
    const pkg = JSON.parse(readFileSync(pkgPath, "utf8"));
    for (const dep of Object.keys({
      ...pkg.dependencies,
      ...pkg.devDependencies,
    })) {
      names.add(dep);
    }
  }
  return names;
}

// Recipe paths (`app/page.tsx`, `lib/utils.ts`, …) of files the hosts ship.
function hostFiles(hosts: string[]): Set<string> {
  const paths = new Set<string>();
  for (const host of hosts) {
    const hostDir = join(ROOT, "hosts", host);
    if (!existsSync(hostDir)) continue;
    const srcDir = existsSync(join(hostDir, "src", "app"));
    for (const file of walk(hostDir)) {
      const rel = toPosix(relative(hostDir, file));
      paths.add(srcDir && rel.startsWith("src/") ? rel.slice(4) : rel);
    }
  }
  return paths;
}

// `@/` imports in `contents` that land on one of `recipeFiles`.
function recipeImports(contents: string, recipeFiles: Set<string>): string[] {
  const found: string[] = [];
  for (const [, specifier] of contents.matchAll(IMPORT)) {
    if (!specifier?.startsWith("@/")) continue;
    const base = specifier.slice(2);
    if (RESOLVE_SUFFIXES.some((suffix) => recipeFiles.has(base + suffix))) {
      found.push(specifier);
    }
  }
  return found;
}

// Paths under recipes/<name>/files/ with uncommitted changes, tracked or not.
function dirtyPaths(filesDir: string): Set<string> {
  const result = spawnSync(
    "git",
    [
      "status",
      "--porcelain",
      "--untracked-files=all",
      "--",
      relative(ROOT, filesDir),
    ],
    { cwd: ROOT, encoding: "utf8" },
  );
  if (result.status !== 0) throw new Error("git status failed");
  return new Set(
    result.stdout
      .split("\n")
      .filter(Boolean)
      .map((line) => line.slice(3).replace(/^"|"$/g, "")),
  );
}

async function main() {
  const { positionals, values } = parseArgs({
    allowPositionals: true,
    options: {
      diff: { type: "boolean" },
      force: { type: "boolean" },
      from: { type: "string" },
      write: { type: "boolean" },
    },
  });
  const [name, ...paths] = positionals;
  if (!name || !values.from) {
    console.error(
      "usage: bun run pull-recipe <recipe> --from <app-dir> [<path> ...] [--write] [--force] [--diff]",
    );
    process.exit(1);
  }
  if (!/^[a-z0-9-]+$/.test(name)) {
    throw new Error(`recipe name must be a lowercase slug: ${name}`);
  }

  const appDir = resolve(values.from);
  const srcDir = existsSync(join(appDir, "src", "app"));
  if (!existsSync(join(appDir, "package.json"))) {
    throw new Error(`${appDir} has no package.json — is it a Next.js app?`);
  }
  if (!srcDir && !existsSync(join(appDir, "app"))) {
    throw new Error(`${appDir} has neither app/ nor src/app/`);
  }

  const config = await loadConfig(name);
  const errors: string[] = [];
  let pulls: Pull[];
  if (paths.length > 0) {
    const result = pullsFromPaths(appDir, srcDir, paths);
    errors.push(...result.errors);
    pulls = result.pulls;
  } else if (config) {
    const result = pullsFromConfig(appDir, srcDir, config);
    errors.push(...result.errors);
    pulls = result.pulls;
    for (const skip of result.skipped) console.log(`  – skipped ${skip}`);
  } else {
    throw new Error(
      `recipes/${name}/recipe.config.ts doesn't exist yet — pass the paths to pull`,
    );
  }

  pulls = pulls.filter((pull) => {
    const refused = REFUSED.find(([pattern]) => pattern.test(pull.source));
    if (refused) errors.push(`${pull.source}: refused — ${refused[1]}`);
    return !refused;
  });
  const filesDir = join(ROOT, "recipes", name, "files");
  const hosts = config?.hosts ?? DEFAULT_HOSTS;

  // Host files: pull the ones that use recipe code, refuse the boilerplate.
  const hostOwned = hostFiles(hosts);
  const recipeFiles = new Set(
    [
      ...pulls.map((p) => p.source),
      ...(existsSync(filesDir)
        ? walk(filesDir).map((f) => toPosix(relative(filesDir, f)))
        : []),
    ].filter((source) => !hostOwned.has(source)),
  );
  const replacing = new Map<string, string[]>();
  for (const source of hostOwned) {
    if (!CODE_FILE.test(source) || pulls.some((p) => p.source === source)) {
      continue;
    }
    const [found] = pullsFromPaths(appDir, srcDir, [source]).pulls;
    if (
      found &&
      recipeImports(readFileSync(found.from, "utf8"), recipeFiles).length
    ) {
      pulls.push(found);
    }
  }
  pulls = pulls.filter((pull) => {
    if (!hostOwned.has(pull.source)) return true;
    const used = CODE_FILE.test(pull.source)
      ? recipeImports(readFileSync(pull.from, "utf8"), recipeFiles)
      : [];
    if (!used.length) {
      errors.push(
        `${pull.source}: refused — every host already has it and this copy doesn't use the recipe's code`,
      );
      return false;
    }
    replacing.set(pull.source, used);
    return true;
  });

  // A directory pull may reach the same file twice via overlapping args.
  pulls = [...new Map(pulls.map((p) => [p.source, p])).values()].sort((a, b) =>
    a.source.localeCompare(b.source),
  );

  console.log(
    `${name} ← ${appDir} (${srcDir ? "src/" : "no src/"} layout)${values.write ? "" : " — dry run"}\n`,
  );

  const dirty = dirtyPaths(filesDir);
  const uiComponents = new Set<string>();
  const packages = new Set<string>();
  const relativeImports = new Map<string, string[]>();
  const writes: { pull: Pull; contents: string; status: Status }[] = [];

  for (const pull of pulls) {
    const contents = normalize(readFileSync(pull.from, "utf8"));
    const dest = join(filesDir, pull.source);
    const status: Status = !existsSync(dest)
      ? "new"
      : normalize(readFileSync(dest, "utf8")) === contents
        ? "same"
        : "changed";

    for (const [index, line] of contents.split("\n").entries()) {
      for (const [, specifier] of line.matchAll(IMPORT)) {
        if (!specifier) continue;
        if (specifier.startsWith("../")) {
          relativeImports.set(pull.source, [
            ...(relativeImports.get(pull.source) ?? []),
            `${index + 1}: ${specifier}`,
          ]);
        }
        const ui = UI_IMPORT.exec(specifier);
        if (ui?.[1]) uiComponents.add(ui[1]);
        const pkg = packageName(specifier);
        if (pkg) packages.add(pkg);
      }
    }

    const repoPath = toPosix(relative(ROOT, dest));
    let mark = { changed: "~", new: "+", same: "=" }[status];
    if (status === "changed" && dirty.has(repoPath) && !values.force) {
      errors.push(
        `${pull.source}: has uncommitted changes in the recipe — commit them or pass --force`,
      );
      mark = "!";
    } else if (status !== "same") {
      writes.push({ contents, pull, status });
    }
    const uses = replacing.get(pull.source);
    console.log(
      `  ${mark} ${pull.source}${uses ? `  (replaces the host's file — uses ${uses.join(", ")})` : ""}`,
    );

    if (values.diff && status === "changed") {
      spawnSync("git", ["diff", "--no-index", "--", dest, pull.from], {
        cwd: ROOT,
        stdio: "inherit",
      });
    }
  }

  if (relativeImports.size) {
    console.warn(
      "\n⚠ relative imports — use @/ so the file works in both layouts:",
    );
    for (const [source, lines] of relativeImports) {
      console.warn(`    ${source}  (${lines.join(", ")})`);
    }
  }

  // Host files the config must mark as `replaces`.
  if (config) {
    const configured = new Map(
      config.steps.flatMap((step) => step.files.map((f) => [f.source, f])),
    );
    for (const source of replacing.keys()) {
      const file = configured.get(source);
      if (!file) {
        console.log(
          `\n${source} isn't in recipe.config.ts yet — add it to a step as a create with \`replaces: true\``,
        );
      } else if (!file.replaces) {
        errors.push(
          `${source}: set \`replaces: true\` on it in recipe.config.ts`,
        );
      }
    }
  } else if (replacing.size) {
    console.log(
      `\nmark these \`replaces: true\` in the config: ${JSON.stringify([...replacing.keys()])}`,
    );
  }

  // What the config still needs to declare for these files.
  const declaredUi = new Set(config?.cnippetUiComponents ?? []);
  const missingUi = [...uiComponents].filter((c) => !declaredUi.has(c)).sort();
  if (missingUi.length) {
    console.log(
      `\ncnippetUiComponents${config ? " is missing" : ""}: ${JSON.stringify(missingUi)}`,
    );
  }
  const provided = hostPackages(hosts);
  for (const spec of [
    ...(config?.dependencies ?? []),
    ...(config?.devDependencies ?? []),
  ]) {
    provided.add(specName(spec));
  }
  const missingPackages = [...packages].filter((p) => !provided.has(p)).sort();
  if (missingPackages.length) {
    console.log(
      `dependencies${config ? " is missing" : " needed"}: ${JSON.stringify(missingPackages)} (take the versions from the app's package.json)`,
    );
  }

  if (errors.length) {
    console.error("");
    for (const error of errors) console.error(`✗ ${error}`);
    console.error(
      `\nnothing written — fix the ${errors.length} error(s) above`,
    );
    process.exit(1);
  }

  const counts = { changed: 0, new: 0 };
  for (const { status } of writes) counts[status as keyof typeof counts]++;
  if (!values.write) {
    console.log(
      `\n${counts.new} new, ${counts.changed} changed — rerun with --write to copy`,
    );
    return;
  }
  for (const { pull, contents } of writes) {
    const dest = join(filesDir, pull.source);
    mkdirSync(dirname(dest), { recursive: true });
    writeFileSync(dest, contents);
  }
  console.log(
    `\n✓ wrote ${counts.new} new, ${counts.changed} changed into recipes/${name}/files/`,
  );
  if (!config)
    console.log(
      `next: write recipe.config.ts, then bun run validate-recipes ${name}`,
    );
  else
    console.log(
      `next: bun run validate-recipes ${name} && bun run check-coverage ${name}`,
    );
}

try {
  await main();
} catch (error) {
  console.error(`✗ ${error instanceof Error ? error.message : error}`);
  process.exit(1);
}
