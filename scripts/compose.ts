// Composes a recipe into a fresh copy of each host it declares, so CI (and
// you) can build it. Usage:
//   bun run compose <recipe> [--pro [--upgrade]] [--host <host>] [--through <step-id>] [--answers <json>] [--build | --typecheck]
// Output: .compose/<recipe>[-pro|-upgrade]/<host>/. `--pro` composes base +
// add-on merged (the add-on is found via CNIPPET_EXTRA_ROOTS, see lib/roots);
// `--pro --upgrade` composes the base, then only the add-on steps on top. `--through` stops after that step (the
// partial-install rule); `--build` then installs, runs shadcn + postInstall,
// and runs `next build` + `tsc --noEmit`. `--typecheck` skips `next build`.
// `--answers '{"starterUi":false}'` overrides the all-on answers of <recipe>
// (not of the recipes it requires), to test the branches that are off.
import { spawnSync } from "node:child_process";
import { randomBytes, randomUUID } from "node:crypto";
import {
  appendFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { parseArgs } from "node:util";
import {
  addonMarker,
  evaluateWhen,
  type Prompt,
  type RecipeManifest,
  renderFiles,
  resolveTarget,
  type Step,
  type StepSource,
  type WhenScope,
} from "@cnippet/recipe-kit";
import { applyAstInject } from "./lib/ast-inject";
import { copyHost } from "./lib/host";
import { hostDir as hostPath, loadBase, loadPro, ROOT } from "./lib/roots";

type PackageJson = {
  name: string;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  trustedDependencies?: string[];
};

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

// Set from --answers in main(); applies to the recipe named on the command line.
let answerOverrides: { recipe: string; values: Record<string, unknown> } = {
  recipe: "",
  values: {},
};

type Applied = Map<string, { config: RecipeManifest; steps: Step[] }>;

// free: the base. pro: base + add-on merged. upgrade: the base, then only the
// add-on's steps, deps, env vars and gitignore on top (what `init --pro` adds
// to an app that already has Free).
type Variant = "free" | "pro" | "upgrade";

async function applyRecipe(
  name: string,
  dest: string,
  applied: Applied,
  through?: string,
  variant: Variant = "free",
): Promise<void> {
  let config: RecipeManifest;
  let source: string | ((step: Step) => StepSource);
  let key = name;
  if (variant === "free") {
    const base = await loadBase(name);
    config = base.manifest;
    source = base.dir;
  } else {
    const loaded = await loadPro(name);
    source = loaded.source;
    config = loaded.pro.manifest;
    if (variant === "upgrade") {
      if (!applied.has(name)) await applyRecipe(name, dest, applied);
      const { addon } = loaded.pro;
      config = {
        ...config,
        cnippetUiComponents: addon.cnippetUiComponents,
        dependencies: addon.dependencies,
        devDependencies: addon.devDependencies,
        envVars: addon.envVars,
        gitignore: addon.gitignore,
        requires: addon.requires,
        steps: addon.steps,
        trustedBuildScripts: addon.trustedBuildScripts,
      };
      key = addonMarker(name);
    }
  }
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

  const answers = {
    ...maximalAnswers(config.prompts),
    ...(name === answerOverrides.recipe ? answerOverrides.values : {}),
  };
  const scope: WhenScope = { answers, detection };
  const files = renderFiles(config, source, scope, through);
  const steps = through
    ? config.steps.slice(0, config.steps.findIndex((s) => s.id === through) + 1)
    : config.steps;

  for (const file of files) {
    const { target, contents } = file;
    const targetPath = join(dest, target);

    switch (file.strategy) {
      case "create":
        if (existsSync(targetPath) && !file.replaces) {
          throw new Error(
            `${name}: create target ${target} already exists in the host — set \`replaces: true\` if the recipe means to overwrite it`,
          );
        }
        if (!existsSync(targetPath) && file.replaces) {
          throw new Error(
            `${name}: ${target} is marked \`replaces\` but the host has no such file`,
          );
        }
        mkdirSync(dirname(targetPath), { recursive: true });
        writeFileSync(targetPath, contents);
        break;
      case "append": {
        // Same markers the CLI's append strategy writes; add-on files use `<name>-pro`.
        const marker = file.marker ?? name;
        const block = `// >>> cnippet:${marker}\n${contents.trimEnd()}\n// <<< cnippet:${marker}\n`;
        mkdirSync(dirname(targetPath), { recursive: true });
        appendFileSync(
          targetPath,
          existsSync(targetPath) ? `\n${block}` : block,
        );
        break;
      }
      case "ast-inject":
        if (!file.injection) {
          throw new Error(`${name}: ast-inject ${target} without injection`);
        }
        applyAstInject(targetPath, file.injection, contents.trim());
        break;
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
      `\n# cnippet:${key}\n${config.gitignore
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

  applied.set(key, { config, steps });
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
      answers: { type: "string" },
      build: { type: "boolean" },
      host: { type: "string" },
      // Compose into this dir instead of .compose/ (one host only; must not exist).
      out: { type: "string" },
      pro: { type: "boolean" },
      through: { type: "string" },
      typecheck: { type: "boolean" },
      upgrade: { type: "boolean" },
    },
  });
  const [name] = positionals;
  if (!name) {
    console.error(
      "usage: bun run compose <recipe> [--pro [--upgrade]] [--host <host>] [--through <step-id>] [--answers <json>] [--build | --typecheck]",
    );
    process.exit(1);
  }
  if (values.upgrade && !values.pro) {
    console.error("--upgrade only works with --pro");
    process.exit(1);
  }
  const variant: Variant = values.upgrade
    ? "upgrade"
    : values.pro
      ? "pro"
      : "free";
  const label = variant === "free" ? name : `${name}-${variant}`;
  if (values.answers) {
    answerOverrides = { recipe: name, values: JSON.parse(values.answers) };
  }

  const { hosts: declared } = (await loadBase(name)).manifest;
  const hosts = values.host ? [values.host] : declared;
  if (values.out && (hosts.length !== 1 || existsSync(values.out))) {
    // compose wipes its dest first, so never point it at an existing dir.
    console.error("--out needs --host and a dir that doesn't exist yet");
    process.exit(1);
  }

  for (const host of hosts) {
    const hostDir = hostPath(host);
    if (!existsSync(hostDir)) throw new Error(`no such host: ${host}`);
    const dest = values.out
      ? resolve(values.out)
      : join(ROOT, ".compose", label, host);

    rmSync(dest, { force: true, recursive: true });
    copyHost(hostDir, dest, `compose-${label}-${host}`);

    const applied: Applied = new Map();
    await applyRecipe(name, dest, applied, values.through, variant);
    console.log(`✓ composed ${label} → ${relative(ROOT, dest)}`);

    if (values.build || values.typecheck) {
      const mode = values.build ? "build" : "typecheck";
      await build(dest, applied, mode);
      console.log(`✓ ${mode} passed: ${label} on ${host}`);
    }
  }
}

await main();
