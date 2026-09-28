import { z } from "zod";

// ---------------------------------------------------------------------------
// Part 1 — verbatim copy of cnippet-stack/packages/validators/src/manifest.ts
//
// TODO: replace with `import { RecipeManifest, ... } from "@cnippet/validators"`
// once this repo depends on it (RECIPES-MIGRATION.md §3). Until then, keep this
// section byte-for-byte identical to upstream — do not edit it here.
// ---------------------------------------------------------------------------

export const PromptSchema = z.object({
  default: z.union([z.string(), z.boolean(), z.array(z.string())]).optional(),
  id: z.string(),
  message: z.string(),
  options: z
    .array(
      z.object({
        hint: z.string().optional(),
        label: z.string(),
        value: z.string(),
      }),
    )
    .optional(),
  type: z.enum(["select", "multiselect", "confirm", "text"]),
  when: z.string().optional(),
});
export type Prompt = z.infer<typeof PromptSchema>;

export const EnvVarSchema = z.object({
  description: z.string(),
  example: z.string().optional(),
  generate: z.enum(["secret32", "uuid"]).optional(),
  name: z.string(),
  required: z.boolean().default(true),
  when: z.string().optional(),
});
export type EnvVar = z.infer<typeof EnvVarSchema>;

export const FileSchema = z.object({
  injection: z
    .object({
      anchor: z.string(),
      kind: z.enum([
        "wrap-jsx",
        "add-import",
        "add-to-array",
        "add-object-property",
      ]),
    })
    .optional(),
  strategy: z.enum(["create", "append", "ast-inject"]),
  target: z.string(),
  template: z.string(),
  when: z.string().optional(),
});
export type RecipeFile = z.infer<typeof FileSchema>;

// `checks` power `cnippet-stack doctor`. Doctor runs post-install with no
// prompt answers available, so a check's `when` may only reference
// `detection` — never `answers` (an `answers`-conditioned `when` will always
// evaluate against an empty object and be treated as unsatisfied).
export const CheckSchema = z.discriminatedUnion("type", [
  z.object({
    description: z.string(),
    name: z.string(),
    type: z.literal("env"),
    when: z.string().optional(),
  }),
  z.object({
    description: z.string(),
    path: z.string(),
    type: z.literal("file"),
    when: z.string().optional(),
  }),
  z.object({
    description: z.string(),
    name: z.string(),
    type: z.literal("dep"),
    when: z.string().optional(),
  }),
  z.object({
    command: z.string(),
    description: z.string(),
    type: z.literal("command"),
    when: z.string().optional(),
  }),
  z.object({
    description: z.string(),
    // Status codes that count as a pass. Defaults to any 2xx at check time.
    expectStatus: z.array(z.number()).optional(),
    type: z.literal("httpGet"),
    url: z.string(),
    when: z.string().optional(),
  }),
]);
export type Check = z.infer<typeof CheckSchema>;

export const ManualStepSchema = z.object({
  blocking: z.boolean().default(false),
  condition: z.string().optional(),
  description: z.string(),
  guideUrl: z.string().url().optional(),
  title: z.string(),
  when: z.enum(["before", "after"]),
});
export type ManualStep = z.infer<typeof ManualStepSchema>;

export const RecipeManifest = z.object({
  category: z.string(),
  // Post-install verification for `cnippet-stack doctor`. Defaults to
  // `[]` so recipes that don't author checks need no manifest changes.
  checks: z.array(CheckSchema).default([]),
  // cnippet-ui (`@cnippet` shadcn registry) component names this recipe's
  // starter UI imports, e.g. ["button", "input", "card"]. When non-empty,
  // the CLI offers to run `<pm> dlx shadcn@latest add @cnippet/<name>`
  // for each one before writing this recipe's own files. Optional (not
  // defaulted) so manifests published before this field parse unchanged
  // over the wire.
  cnippetUiComponents: z.array(z.string()).optional(),
  complianceNotes: z.array(z.string()).default([]),
  dependencies: z.array(z.string()).default([]),
  description: z.string(),
  devDependencies: z.array(z.string()).default([]),
  envVars: z.array(EnvVarSchema).default([]),
  files: z.array(FileSchema),
  // Entries the CLI appends to the target project's .gitignore (e.g. Prisma's
  // generated client output). Supports `{{srcDir}}`-style placeholders,
  // resolved at render time like file targets. Optional (not defaulted) so
  // manifests published before this field parse unchanged over the wire.
  gitignore: z.array(z.string()).optional(),
  manualSteps: z.array(ManualStepSchema).default([]),
  name: z.string().regex(/^[a-z0-9-]+$/),
  postInstall: z
    .array(z.object({ command: z.string(), description: z.string() }))
    .default([]),
  prompts: z.array(PromptSchema).default([]),
  requires: z.array(z.string()).default([]),
  supports: z.object({
    next: z.array(z.string()),
    orm: z.array(z.enum(["prisma", "drizzle", "none"])),
    router: z.array(z.enum(["app"])),
  }),
  tier: z.enum(["free", "pro"]),
  title: z.string(),
  // Packages whose install-time build scripts this recipe vouches for.
  // pnpm 10+ and bun block postinstall scripts by default; the CLI merges
  // these into `pnpm.onlyBuiltDependencies` / `trustedDependencies` in the
  // target package.json so e.g. `prisma generate` works out of the box.
  // Optional (not defaulted) so manifests published before this field parse
  // unchanged over the wire.
  trustedBuildScripts: z.array(z.string()).optional(),
  version: z.string(),
});
export type RecipeManifest = z.infer<typeof RecipeManifest>;

// ---------------------------------------------------------------------------
// Part 2 — recipes-repo extension (not in upstream yet)
//
// `recipe.config.ts` is the upstream manifest with `files`, `postInstall` and
// `manualSteps` moved into ordered `steps`, plus the `hosts` CI composes into.
// `toManifest()` flattens it back to a plain `RecipeManifest`, so everything a
// config says still has an upstream home. Adding `steps` to upstream is a
// proposed schema change — see RECIPES-MIGRATION.md §3.
// ---------------------------------------------------------------------------

// Descriptive, stable slug: `schema-append`, never `step-3` or `3`.
const STEP_ID = /^[a-z][a-z0-9]*(-[a-z0-9]+)*$/;
const NUMERIC_STEP_ID = /^(step-?)?\d+$/;

export const StepFileSchema = FileSchema.omit({ template: true }).extend({
  // Literal path under the recipe's `files/`. Becomes `template` upstream.
  source: z.string(),
});
export type StepFile = z.infer<typeof StepFileSchema>;

export const StepSchema = z.object({
  files: z.array(StepFileSchema).default([]),
  id: z
    .string()
    .regex(STEP_ID, "step id must be a lowercase kebab-case slug")
    .refine((id) => !NUMERIC_STEP_ID.test(id), "step id must not be numeric"),
  manualSteps: z.array(ManualStepSchema).default([]),
  postInstall: z
    .array(z.object({ command: z.string(), description: z.string() }))
    .default([]),
  title: z.string().min(1),
  verify: z.string().min(1),
  why: z.string().min(1),
});
export type Step = z.infer<typeof StepSchema>;

export const RecipeConfig = RecipeManifest.omit({
  files: true,
  manualSteps: true,
  postInstall: true,
}).extend({
  hosts: z.array(z.string()).min(1),
  steps: z.array(StepSchema).min(1),
  // Single-file installs (Biome, TS strict, …) may have 1–2 steps.
  thin: z.boolean().default(false),
});
export type RecipeConfig = z.infer<typeof RecipeConfig>;
export type RecipeConfigInput = z.input<typeof RecipeConfig>;

export function toManifest(config: RecipeConfig): RecipeManifest {
  const { hosts: _hosts, steps, thin: _thin, ...rest } = config;
  return RecipeManifest.parse({
    ...rest,
    files: steps.flatMap((step) =>
      step.files.map(({ source, ...file }) => ({ ...file, template: source })),
    ),
    manualSteps: steps.flatMap((step) => step.manualSteps),
    // Several steps may re-run e.g. `prisma generate`; upstream runs it once.
    postInstall: [
      ...new Map(
        steps
          .flatMap((step) => step.postInstall)
          .map((entry) => [entry.command, entry]),
      ).values(),
    ],
  });
}
