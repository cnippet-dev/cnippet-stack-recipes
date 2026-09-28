// Composes a recipe into a fresh copy of each host it declares, so CI (and
// you) can build it. Usage:
//   bun run compose <recipe> [--host <host>] [--through <step-id>] [--build | --typecheck]
// Output: .compose/<recipe>/<host>/. `--through` stops after that step (the
// partial-install rule); `--build` then installs, runs shadcn + postInstall,
// and runs `next build` + `tsc --noEmit`. `--typecheck` skips `next build`.
import { spawnSync } from "node:child_process";
import { randomBytes, randomUUID } from "node:crypto";
import {
  appendFileSync,
  cpSync,
  existsSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { dirname, join, relative, resolve, sep } from "node:path";
import { pathToFileURL } from "node:url";
import { parseArgs } from "node:util";
import { applyAstInject } from "./lib/ast-inject";
import {
  extractMarkerBlock,
  renderDirectives,
  resolveTarget,
} from "./lib/render";
import { evaluateWhen, type WhenScope } from "./lib/when";
import { type Prompt, RecipeConfig, type Step } from "./types";

const ROOT = resolve(import.meta.dir, "..");

// Host files that are build output or machine-specific, never copied.
const HOST_EXCLUDES = [
  "node_modules",
  ".next",
  ".turbo",
  "next-env.d.ts",
  `app${sep}generated`,
];

type PackageJson = {
  name: string;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  trustedDependencies?: string[];
};

async function loadRecipe(name: string): Promise<RecipeConfig> {
  const configPath = join(ROOT, "recipes", name, "recipe.config.ts");
  if (!existsSync(configPath)) throw new Error(`no such recipe: ${name}`);
  const mod = await import(pathToFileURL(configPath).href);
  return RecipeConfig.parse(mod.default);
}

// "All branches on": the maximal config, so CI tests the most code.
function maximalAnswers(prompts: Prompt[]): Record<string, unknown> {
  const values = (p: Prompt) => (p.options ?? []).map((o) => o.value);
  return Object.fromEntries(
    prompts.map((p) => {
      switch (p.type) {
        case "multiselect":
          return [p.id, values(p)];
        case "confirm":
          return [p.id, true];
        default:
          return [p.id, p.default ?? values(p)[0] ?? ""];
      }
    }),
  );
}

// "@prisma/client@^7.9.1" → ["@prisma/client", "^7.9.1"]
function splitSpec(spec: string): [string, string] {
  const at = spec.lastIndexOf("@");
  return at > 0 ? [spec.slice(0, at), spec.slice(at + 1)] : [spec, "latest"];
}

function readJson<T>(path: string): T {
  return JSON.parse(readFileSync(path, "utf8")) as T;
}

function detect(dest: string) {
  const pkg = readJson<PackageJson>(join(dest, "package.json"));
  const deps = { ...pkg.dependencies, ...pkg.devDependencies };
  return {
    framework: { name: "next", version: deps.next ?? "0" },
    orm: deps.prisma ? "prisma" : deps["drizzle-orm"] ? "drizzle" : "none",
    router: "app",
    srcDir: existsSync(join(dest, "src", "app")),
  };
}

type Applied = Map<string, { config: RecipeConfig; steps: Step[] }>;

async function applyRecipe(
  name: string,
  dest: string,
  applied: Applied,
  through?: string,
): Promise<void> {
  const config = await loadRecipe(name);
  const detection = detect(dest);

  for (const required of config.requires) {
    if (applied.has(required)) continue;
    if (required === "prisma" && detection.orm === "prisma") continue;
    await applyRecipe(required, dest, applied);
  }

  const major = detection.framework.version.replace(/^\D*/, "").split(".")[0];
  if (!config.supports.next.includes(major ?? "")) {
    throw new Error(`${name} does not support Next.js ${major}`);
  }
  if (!config.supports.orm.includes(detect(dest).orm as never)) {
    throw new Error(`${name} does not support orm "${detect(dest).orm}"`);
  }

  const answers = maximalAnswers(config.prompts);
  const scope: WhenScope = { answers, detection };
  const filesDir = join(ROOT, "recipes", name, "files");

  const throughIndex = through
    ? config.steps.findIndex((s) => s.id === through)
    : config.steps.length - 1;
  if (throughIndex === -1) throw new Error(`${name}: no step "${through}"`);

  const steps = config.steps.slice(0, throughIndex + 1);
  for (const step of steps) {
    for (const file of step.files) {
      if (!evaluateWhen(file.when, scope)) continue;

      const sourcePath = join(filesDir, file.source);
      let contents = readFileSync(sourcePath, "utf8").replaceAll("\r\n", "\n");
      if (file.strategy === "append") {
        contents = extractMarkerBlock(contents, name, file.source);
      }
      contents = renderDirectives(contents, scope, file.source);

      const target = resolveTarget(file.target, detection.srcDir);
      const targetPath = join(dest, target);

      switch (file.strategy) {
        case "create":
          if (existsSync(targetPath)) {
            throw new Error(
              `${name}/${step.id}: create target ${target} already exists in the host`,
            );
          }
          mkdirSync(dirname(targetPath), { recursive: true });
          writeFileSync(targetPath, contents);
          break;
        case "append":
          mkdirSync(dirname(targetPath), { recursive: true });
          appendFileSync(
            targetPath,
            existsSync(targetPath) ? `\n${contents}\n` : `${contents}\n`,
          );
          break;
        case "ast-inject":
          if (!file.injection) {
            throw new Error(`${name}/${step.id}: ast-inject without injection`);
          }
          applyAstInject(targetPath, file.injection, contents.trim());
          break;
      }
    }
  }

  // package.json: dependencies, devDependencies, trusted build scripts.
  const pkgPath = join(dest, "package.json");
  const pkg = readJson<PackageJson>(pkgPath);
  for (const [field, specs] of [
    ["dependencies", config.dependencies],
    ["devDependencies", config.devDependencies],
  ] as const) {
    pkg[field] ??= {};
    for (const spec of specs) {
      const [dep, range] = splitSpec(spec);
      pkg[field][dep] = range;
    }
  }
  if (config.trustedBuildScripts?.length) {
    pkg.trustedDependencies = [
      ...new Set([
        ...(pkg.trustedDependencies ?? []),
        ...config.trustedBuildScripts,
      ]),
    ];
  }
  writeFileSync(pkgPath, `${JSON.stringify(pkg, null, 2)}\n`);

  // .gitignore entries.
  if (config.gitignore?.length) {
    appendFileSync(
      join(dest, ".gitignore"),
      `\n# cnippet:${name}\n${config.gitignore
        .map((entry) => resolveTarget(entry, detection.srcDir))
        .join("\n")}\n`,
    );
  }

  // Placeholder env values — never real secrets.
  const env = config.envVars
    .filter((v) => evaluateWhen(v.when, scope))
    .map((v) => {
      const value =
        v.generate === "secret32"
          ? randomBytes(32).toString("hex")
          : v.generate === "uuid"
            ? randomUUID()
            : (v.example ?? "placeholder");
      return `${v.name}="${value}"`;
    });
  if (env.length) appendFileSync(join(dest, ".env"), `${env.join("\n")}\n`);

  applied.set(name, { config, steps });
}

// `attempts` > 1 only for commands that hit the network and fail transiently.
function run(cwd: string, command: string, args: string[], attempts = 1) {
  const line = [command, ...args].join(" ");
  for (let attempt = 1; attempt <= attempts; attempt++) {
    console.log(`  $ ${line}${attempt > 1 ? ` (attempt ${attempt})` : ""}`);
    const result = spawnSync(command, args, {
      cwd,
      shell: process.platform === "win32",
      stdio: "inherit",
    });
    if (result.status === 0) return;
  }
  throw new Error(`\`${line}\` failed in ${cwd}`);
}

async function build(
  dest: string,
  applied: Applied,
  mode: "build" | "typecheck",
) {
  run(dest, "bun", ["install"], 3);
  const components = [
    ...new Set(
      [...applied.values()].flatMap((a) => a.config.cnippetUiComponents ?? []),
    ),
  ];
  if (components.length) {
    // The host's own pinned shadcn, not @latest, so CI is reproducible.
    run(
      dest,
      "bunx",
      [
        "shadcn",
        "add",
        ...components.map((c) => `@cnippet/${c}`),
        "--yes",
        "--overwrite",
      ],
      3,
    );
  }
  const commands = new Set(
    [...applied.values()].flatMap(({ steps }) =>
      steps.flatMap((step) => step.postInstall.map((p) => p.command)),
    ),
  );
  for (const command of commands) run(dest, "bunx", command.split(" "));
  if (mode === "build") run(dest, "bunx", ["next", "build"]);
  run(dest, "bunx", ["tsc", "--noEmit"]);
}

async function main() {
  const { positionals, values } = parseArgs({
    allowPositionals: true,
    options: {
      build: { type: "boolean" },
      host: { type: "string" },
      through: { type: "string" },
      typecheck: { type: "boolean" },
    },
  });
  const [name] = positionals;
  if (!name) {
    console.error(
      "usage: bun run compose <recipe> [--host <host>] [--through <step-id>] [--build | --typecheck]",
    );
    process.exit(1);
  }

  const { hosts: declared } = await loadRecipe(name);
  const hosts = values.host ? [values.host] : declared;

  for (const host of hosts) {
    const hostDir = join(ROOT, "hosts", host);
    if (!existsSync(hostDir)) throw new Error(`no such host: ${host}`);
    const dest = join(ROOT, ".compose", name, host);

    rmSync(dest, { force: true, recursive: true });
    cpSync(hostDir, dest, {
      filter: (src) => {
        const rel = relative(hostDir, src);
        return !HOST_EXCLUDES.some(
          (ex) =>
            rel === ex ||
            rel.startsWith(`${ex}${sep}`) ||
            rel.endsWith(`${sep}${ex}`),
        );
      },
      recursive: true,
    });
    const pkgPath = join(dest, "package.json");
    const pkg = readJson<PackageJson>(pkgPath);
    pkg.name = `compose-${name}-${host}`;
    writeFileSync(pkgPath, `${JSON.stringify(pkg, null, 2)}\n`);

    const applied: Applied = new Map();
    await applyRecipe(name, dest, applied, values.through);
    console.log(`✓ composed ${name} → ${relative(ROOT, dest)}`);

    if (values.build || values.typecheck) {
      const mode = values.build ? "build" : "typecheck";
      await build(dest, applied, mode);
      console.log(`✓ ${mode} passed: ${name} on ${host}`);
    }
  }
}

await main();
