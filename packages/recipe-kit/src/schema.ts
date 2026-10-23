// The one recipe format. `recipes/<name>/recipe.config.ts` default-exports a
// `RecipeManifestInput`; compose/validate (this repo) and the cnippet-stack
// registry + CLI all parse it with `RecipeManifest` below.
import { z } from "zod";

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
  // `create` onto a file every app already has (`app/page.tsx`, …): the
  // installer overwrites it (after a backup) instead of skipping it.
  replaces: z.boolean().default(false),
  // Literal path under the recipe's `files/`.
  source: z.string(),
  strategy: z.enum(["create", "append", "ast-inject"]),
  // `{{srcDir}}` / `{{appDir}}` placeholders allowed.
  target: z.string(),
  when: z.string().optional(),
});
export type RecipeFile = z.infer<typeof FileSchema>;

// `checks` power `cnippet-stack doctor`. Doctor runs post-install with no
// prompt answers available, so a check's `when` may only reference
// `detection` — never `answers`.
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

export const PostInstallSchema = z.object({
  command: z.string(),
  description: z.string(),
});

// Descriptive, stable slug: `schema-append`, never `step-3` or `3`.
const STEP_ID = /^[a-z][a-z0-9]*(-[a-z0-9]+)*$/;
const NUMERIC_STEP_ID = /^(step-?)?\d+$/;

// One step = one stopping point the user (and the guide) can stop at.
export const StepSchema = z.object({
  files: z.array(FileSchema).default([]),
  id: z
    .string()
    .regex(STEP_ID, "step id must be a lowercase kebab-case slug")
    .refine((id) => !NUMERIC_STEP_ID.test(id), "step id must not be numeric"),
  manualSteps: z.array(ManualStepSchema).default([]),
  postInstall: z.array(PostInstallSchema).default([]),
  title: z.string().min(1),
  verify: z.string().min(1),
  why: z.string().min(1),
});
export type Step = z.infer<typeof StepSchema>;

export const RecipeManifest = z.object({
  category: z.string(),
  checks: z.array(CheckSchema).default([]),
  // `@cnippet` shadcn registry components the starter UI imports, e.g.
  // ["button", "input"]. The CLI offers to `shadcn add` them first.
  cnippetUiComponents: z.array(z.string()).optional(),
  complianceNotes: z.array(z.string()).default([]),
  dependencies: z.array(z.string()).default([]),
  description: z.string(),
  devDependencies: z.array(z.string()).default([]),
  envVars: z.array(EnvVarSchema).default([]),
  // Entries appended to the target project's .gitignore. `{{srcDir}}` allowed.
  gitignore: z.array(z.string()).optional(),
  // Clean apps (under this repo's hosts/) that CI composes the recipe into.
  hosts: z.array(z.string()).min(1),
  name: z.string().regex(/^[a-z0-9-]+$/),
  prompts: z.array(PromptSchema).default([]),
  requires: z.array(z.string()).default([]),
  steps: z.array(StepSchema).min(1),
  supports: z.object({
    next: z.array(z.string()),
    orm: z.array(z.enum(["prisma", "drizzle", "none"])),
    router: z.array(z.enum(["app"])),
  }),
  // Single-file installs (Biome, TS strict, …) may have 1–2 steps.
  thin: z.boolean().default(false),
  tier: z.enum(["free", "pro"]),
  title: z.string(),
  // Packages whose install-time build scripts this recipe vouches for
  // (pnpm 10+ and bun block them by default).
  trustedBuildScripts: z.array(z.string()).optional(),
  version: z.string(),
});
export type RecipeManifest = z.infer<typeof RecipeManifest>;
export type RecipeManifestInput = z.input<typeof RecipeManifest>;

/** Every step's manual steps, in step order. */
export function allManualSteps(manifest: RecipeManifest): ManualStep[] {
  return manifest.steps.flatMap((step) => step.manualSteps);
}

/** Every step's post-install commands, once each (several steps may re-run e.g. `prisma generate`). */
export function allPostInstall(
  manifest: RecipeManifest,
): z.infer<typeof PostInstallSchema>[] {
  return [
    ...new Map(
      manifest.steps
        .flatMap((step) => step.postInstall)
        .map((entry) => [entry.command, entry]),
    ).values(),
  ];
}
