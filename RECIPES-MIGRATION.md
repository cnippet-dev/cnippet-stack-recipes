# cnippet-stack-recipes — Migration Plan

> **What this is:** the spec for restructuring this repo from "one full Next.js app per recipe" to "shared hosts + cheap recipe folders + a few demo apps."
>
> **Who it's for:** a developer or AI agent doing the migration. Read the whole file before changing anything.
>
> **Status of claims:** everything in §1 was read from this repo. Items marked _(verify)_ need checking on disk — they were inferred from partial reads. Items marked _(decide)_ need a human answer before the step runs.

---

## 0. Why we're doing this

This repo is the **source of truth** for recipe code. `cnippet-stack` turns that code into `.hbs` templates, and `next.cnippet.dev` renders it in guides. Today both of those happen by hand-copying, which loses files.

Two separate problems:

**Problem A — nothing describes a recipe in a machine-readable way.** Each app has a `README.md` with a prose "Priority Files" list. Prose can't be validated, so it drifts, and it already has. When someone copies "the files in the README," they copy from a broken list.

**Problem B — one full app per recipe doesn't scale.** There are 7 apps now. The guide catalog has 183 entries, of which ~175 need a recipe. 175 full Next.js apps means 175 `package.json` files to bump on every Next release, 175 builds in CI, and one enormous lockfile.

The fix for A is `recipe.config.ts`. The fix for B is separating "the recipe's files" from "an app that runs them."

---

## 1. Current state (read from the repo)

### 1.1 Layout

```
cnippet-stack-recipes/
├── apps/
│   ├── authjs/          # full Next.js app — NextAuth v5 + Prisma
│   ├── better-auth/     # full Next.js app — better-auth + Prisma + 2FA
│   ├── drizzle/         # full Next.js app — Drizzle + Neon
│   ├── prisma/          # full Next.js app — Prisma 7 CRUD
│   ├── rest/            # full Next.js app — REST API patterns + Upstash
│   ├── supabase/        # full Next.js app — Supabase DB + storage
│   └── reference/       # component/recipe reference docs app
├── packages/
│   ├── ui/              # @repo/ui — near-empty stub (react + react-dom only)
│   ├── eslint-config/
│   └── typescript-config/
├── .github/
│   ├── labeler.yml
│   └── workflows/build.yml
├── biome.json
├── turbo.json
├── package.json         # bun workspaces: apps/*, packages/*
└── bun.lock             # single lockfile for all 7 apps
```

Each app carries: `README.md`, `components.json` (registers the `@cnippet` registry → `https://ui.cnippet.dev/r/{name}.json`), `AGENTS.md` (Next.js version warning), its own `.gitignore`, `next-env.d.ts`, full `package.json`.

### 1.2 Bugs found — fix during migration, do not carry over

These are real and were read from the files. **Every one of them is a place a copy-paste would produce a wrong or missing file.**

| # | Where | Problem |
|---|---|---|
| B1 | `apps/better-auth/README.md` | Titled **`# authjs recipe`**. Wrong recipe name. |
| B2 | `apps/better-auth/README.md` | Lists `api/auth/[...nextauth]/route.ts`. better-auth uses **`[...all]`**. Copying this path produces a route that never fires. |
| B3 | `apps/authjs/README.md` | Lists **`lib/primsa.ts`** — typo for `prisma.ts`. |
| B4 | `apps/drizzle/README.md` | Lists **`prisma/schema.ts`** under a Drizzle recipe. Drizzle has no Prisma schema. |
| B5 | All five Prisma-using READMEs | List **`prisma/schema.ts`**. The real file is **`prisma/schema.prisma`** (confirmed present in `apps/prisma`, `apps/rest`, `apps/authjs`). |
| B6 | `apps/prisma/app/generated/prisma/**` | Generated Prisma client appears **committed** _(verify)_ despite `/app/generated/prisma` in `.gitignore` — gitignore doesn't untrack already-committed files. Same for `apps/better-auth`. |
| B7 | `apps/prisma/prisma-orm-complete-setup (1).md` | A **guide document** is committed inside a recipe app, with `(1)` from a browser download. This is the doc/code drift made physical. Guides belong in `next.cnippet.dev`, not here. |
| B8 | `.github/workflows/build.yml` | Comments claim "apps/reference is the only Next.js app in this monorepo" and the Next cache path only covers `apps/reference/.next/cache`. There are **seven** Next.js apps. Cache is near-useless for the other six. |
| B9 | `.github/workflows/build.yml` | Env block is a growing union of every app's env vars (`SUPABASE_*`, `UPSTASH_*`, `AUTH_*`, `BETTER_AUTH_*`, …). Every new recipe appends to it. This is the coupling the migration removes. |
| B10 | `package.json` vs `build.yml` | `devEngines` pins Bun **1.3.14**; CI uses `BUN_VERSION: 1.3.8`. Align them. |
| B11 | `packages/ui` | Exports `./*: ./src/*.tsx` but has no real components; apps pull UI from the `@cnippet` registry instead. Either populate it or delete it. _(decide)_ |

### 1.3 What's actually good and must be preserved

- **The code works.** Every app was built and run by hand. That's the value here — don't rewrite working code during a restructure.
- **`components.json` with the `@cnippet` registry** is the right pattern: UI comes from `ui.cnippet.dev` via the shadcn CLI, consumed not forked.
- **`AGENTS.md`'s warning** about Next.js breaking changes is correct and should move to the repo root so it applies everywhere.
- **Prisma 7 setup is current**: `provider = "prisma-client"`, explicit `output`, driver adapter, no `url` in the datasource, config in `prisma.config.ts`. Keep this shape.

---

## 2. Target layout

```
cnippet-stack-recipes/
├── hosts/                          # 3-4 shared, minimal Next.js apps. Kept current, nothing else.
│   ├── app-router-src/             #   src/ directory layout
│   ├── app-router-no-src/          #   no src/ directory
│   └── with-prisma/                #   Prisma 7 already wired (for recipes that build on it)
│
├── recipes/                        # one folder per recipe. Cheap: no package.json, no node_modules.
│   ├── better-auth/
│   │   ├── recipe.config.ts        #   the steps — the machine-readable manifest
│   │   └── files/                  #   real .ts/.tsx/.prisma source, mirroring target paths
│   │       ├── lib/auth/auth.ts
│   │       ├── lib/auth/auth-client.ts
│   │       └── prisma/schema.prisma
│   ├── prisma/
│   └── biome/
│       ├── recipe.config.ts
│       └── files/biome.json
│
├── demos/                          # 5-6 full runnable apps, hand-picked. Full package.json each.
│   └── better-auth/
│
├── packages/
│   ├── eslint-config/
│   └── typescript-config/
│
├── scripts/
│   ├── validate-recipes.ts         # every declared path exists, ids unique, schema valid
│   ├── check-coverage.ts           # no unclaimed files in a recipe's files/
│   └── compose.ts                  # copy a recipe into a host → for CI and local testing
│
├── AGENTS.md                       # moved from apps/*/AGENTS.md
├── RECIPES-MIGRATION.md            # this file
└── README.md                       # real repo README (currently missing/starter)
```

### Why this shape

| Concern | How it's handled |
|---|---|
| Adding recipe #176 | A folder with two things in it. No lockfile change, no CI app added. |
| Next.js 17 lands | Update 3 hosts + ~6 demos. Not 175 apps. |
| "Does this recipe actually work?" | CI composes it into a host and runs `next build`. Same gate as today, shared host. |
| "Which files belong to this recipe?" | `recipe.config.ts`, validated. Not prose. |
| "I want to see it running" | `demos/better-auth` for the flagship ones. |
| `cnippet-stack` reading this repo | Reads `recipes/*/recipe.config.ts` + `recipes/*/files/**`. Stable contract. |

### The one real downside, and how we handle it

Files in `recipes/*/files/` are **not inside a Next.js app**, so your editor can't resolve `@/lib/...` or `next/server` imports. TypeScript will look broken in-editor.

Mitigation: add `recipes/tsconfig.json` that points `@/*` at one host and includes that host's types. Editors get mostly-correct resolution. **CI composition is the authoritative check**, not the editor.

```jsonc
// recipes/tsconfig.json — editor convenience only, not a build config
{
  "extends": "../packages/typescript-config/nextjs.json",
  "compilerOptions": {
    "noEmit": true,
    "paths": {
      "@/*": ["../hosts/app-router-src/*"]
    }
  },
  "include": ["*/files/**/*.ts", "*/files/**/*.tsx"]
}
```

Accept that this is imperfect. Do not solve it by giving every recipe a `package.json` — that reintroduces the problem this migration exists to fix.

---

## 3. The `recipe.config.ts` contract

This replaces the prose `README.md`. It is the single machine-readable description of a recipe.

**Critical:** the type must come from the **same Zod schema `cnippet-stack` uses** (`RecipeManifest` in `@cnippet/validators`). Do not define a second, parallel type in this repo — that's how the two drift. Until the dependency is wired (see §4, Phase 0), define the type locally in `scripts/types.ts` with a `// TODO: replace with @cnippet/validators import` comment and keep field names identical.

### 3.1 Full example

```ts
// recipes/better-auth/recipe.config.ts
import { defineRecipe } from "../../scripts/define-recipe";

export default defineRecipe({
  name: "better-auth",
  version: "0.1.0",
  title: "Better Auth in Next.js",
  description: "Email/password and social auth with database sessions.",
  category: "auth",
  tier: "free",

  // Compatibility gate. The CLI refuses to install on a mismatch.
  supports: {
    next: ">=16.0.0",
    router: "app",
    orm: ["prisma"],
  },

  // Other recipes that must be installed first.
  requires: ["prisma"],

  // Which host apps CI composes this into.
  hosts: ["with-prisma"],

  // Packages the CLI installs. These moved out of the old app package.json.
  dependencies: {
    "better-auth": "^1.6.25",
  },
  devDependencies: {},

  // Declared variants. First-class, never an ad-hoc prompt.
  // Omit entirely if the recipe has no variants.
  variants: [
    { id: "postgres", label: "Postgres (any provider)", default: true },
    { id: "neon", label: "Neon (serverless)" },
  ],

  // Data-driven prompts. `when` is evaluated by a safe evaluator, never eval().
  prompts: [
    {
      name: "social",
      type: "multiselect",
      message: "Social providers",
      choices: [
        { value: "google", label: "Google" },
        { value: "github", label: "GitHub" },
      ],
    },
    {
      name: "starterUi",
      type: "confirm",
      message: "Generate starter sign-in / sign-up pages?",
      initial: true,
    },
  ],

  // ORDERED. This is both the install order and the guide's section order.
  steps: [
    {
      id: "schema-append",
      title: "Add the auth tables to your Prisma schema",
      why: "Better Auth stores users in your database rather than owning a separate one. Four models go into your existing schema.",
      files: [
        {
          source: "prisma/schema.prisma",
          target: "prisma/schema.prisma",
          strategy: "append",
        },
      ],
      commands: ["prisma generate"],
      manual: ["Run `prisma migrate dev --name better-auth` against your database"],
      verify: "Open `prisma studio` — you should see user, session, account and verification tables.",
    },
    {
      id: "server-instance",
      title: "Create the auth server instance",
      why: "One shared instance. Constructing a client per request leaks database connections.",
      files: [
        {
          source: "lib/auth/auth.ts",
          target: "{{srcDir}}lib/auth/auth.ts",
          strategy: "create",
        },
      ],
      env: [
        { name: "BETTER_AUTH_SECRET", description: "Signing secret", generate: "secret32" },
        { name: "BETTER_AUTH_URL", description: "Your app's base URL", example: "http://localhost:3000" },
        {
          name: "GOOGLE_CLIENT_ID",
          description: "From console.cloud.google.com",
          when: 'social.includes("google")',
        },
      ],
      verify: "Import it anywhere — no TypeScript errors.",
    },
    // … remaining steps
  ],
});
```

### 3.2 Field reference

| Field | Required | Notes |
|---|---|---|
| `name` | yes | Must equal the folder name |
| `version` | yes | semver, Changesets-managed |
| `title` / `description` | yes | Used on the recipe browser and guide |
| `category` | yes | Matches a category in the guide list (auth, database, payments, …) |
| `tier` | yes | `"free"` or `"pro"` |
| `supports` | yes | `next` semver range, `router`, optional `orm` |
| `requires` | no | Dependency recipes, by name |
| `hosts` | yes | Which `hosts/*` CI composes into. At least one. |
| `dependencies` / `devDependencies` | yes | What the CLI installs. Was previously implicit in the app's `package.json`. |
| `variants` | no | Omit if none. Exactly one must have `default: true` when present. |
| `prompts` | no | Data-driven. `when` expressions reference prior answers and detection. |
| `steps` | yes | Ordered. See below. |

### 3.3 Step rules — enforced by `validate-recipes.ts`

| Rule | Why |
|---|---|
| `id` is a lowercase descriptive slug (`schema-append`), **never numeric** | It's a public URL anchor on the guide and a CLI resume key. `step-3` breaks on insertion. |
| `id` is unique within the recipe and **stable forever** | Renaming one is a breaking change |
| Every step has `title`, `why`, `verify` | `why` prints in the terminal, `verify` tells the reader it worked. A step without them fails CI. |
| `why` is 1–3 sentences, plain text | Printed at 80 columns. Long explanation belongs in the MDX guide. |
| Every `source` path exists under `files/` | **This is the rule that fixes `lib/primsa.ts`.** |
| Every file in `files/` is claimed by exactly one step | Catches dropped components. See `check-coverage.ts`. |
| Most recipes: 3–8 steps | Fewer than 3 and learn mode has nothing to pace |
| **Thin recipes: 1–2 steps is valid** | Biome, TS strict mode, CORS, Vercel Cron are single-file installs. Mark `thin: true` and the CLI skips offering learn mode. |
| Partial install must typecheck | Stopping after any step leaves a buildable project. May force step reordering. |

### 3.4 Merge strategies

| Strategy | When | Rule |
|---|---|---|
| `create` | File doesn't exist in a typical project | Fails if it exists, unless `--overwrite` |
| `append` | Adding to a file the user owns (`prisma/schema.prisma`, `.env`) | **Must** be wrapped in markers, see §3.6 |
| `ast-inject` | Modifying existing source (`proxy.ts`, `app/layout.tsx`) | ts-morph only. Never regex. |

### 3.5 Target-path placeholders

`source` is a literal path under `files/`. `target` may contain placeholders the CLI resolves from detection:

| Placeholder | Resolves to |
|---|---|
| `{{srcDir}}` | `"src/"` or `""` |
| `{{appDir}}` | `"src/app/"` or `"app/"` |

**Keep placeholders out of `files/` contents.** The files themselves stay real, compilable code — that's what makes composition testing possible. Imports use the `@/` alias, which works in both layouts, so no path branching is needed inside the code.

### 3.6 Marker blocks — mandatory for `append`

```prisma
// >>> cnippet:better-auth
model User { ... }
// <<< cnippet:better-auth
```

Use the target file's own comment syntax (`//`, `#`, `<!-- -->`). Markers make re-runs idempotent and make learn-mode resume safe. `recipe:sync` in `cnippet-stack` extracts only what's between them, so the file in `files/` can also contain unrelated context.

### 3.7 Variant branching inside code

Put branches in the real source as comments, so the file still compiles:

```ts
export const auth = betterAuth({
  database: prismaAdapter(prisma, { provider: "postgresql" }),
  emailAndPassword: { enabled: true },
  // #if social.includes("google")
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    },
  },
  // #endif
});
```

`cnippet-stack`'s sync script converts `// #if` → `{{#if}}`. **Nobody hand-edits a `.hbs` file again.**

Rules:
- Supported forms: `// #if <expr>`, `// #else`, `// #endif`, `// #each <list>`.
- `<expr>` uses the same safe evaluator as prompt `when` clauses. No arbitrary JS.
- **Max 3 branches per file, no nesting.** More than that means it's a separate recipe, not a variant.
- A host composition runs with **all branches on**, so CI tests the maximal config.

**JSON and other comment-free formats** can't carry `#if`. For those, ship one file per variant and select with `when`:

```ts
files: [
  { source: "biome.base.json",  target: "biome.json", strategy: "create", when: 'variant === "base"' },
  { source: "biome.strict.json", target: "biome.json", strategy: "create", when: 'variant === "strict"' },
]
```

---

## 4. Migration phases

Do these in order. Each phase ends in a working repo — **do not** start the next until the acceptance criteria pass. Land each as its own PR.

### Phase 0 — Scaffolding, nothing moves

Add the new structure alongside the old one. `apps/` is untouched and CI still passes.

1. Create `hosts/`, `recipes/`, `demos/`, `scripts/` (empty).
2. Add `hosts/app-router-src`, `hosts/app-router-no-src`, `hosts/with-prisma`. Minimal: `create-next-app` defaults + `components.json` with the `@cnippet` registry + Tailwind v4. `with-prisma` also gets Prisma 7 in the shape described in §1.3 (`provider = "prisma-client"`, explicit `output`, `prisma.config.ts`, driver adapter, an empty schema with no models).
3. Add `scripts/types.ts` with the `RecipeManifest` types, `scripts/define-recipe.ts` (identity function for type inference), and `scripts/validate-recipes.ts`.
4. Add `hosts/*` and `recipes/*` to workspaces in root `package.json`. `recipes/*` have no `package.json`, so they won't resolve as workspaces — that's correct; they aren't packages.
5. Move `apps/*/AGENTS.md` content to root `AGENTS.md`.
6. Fix B10: align Bun version between `devEngines` and `build.yml`.

**Acceptance:** `bun install` succeeds; `bun run build` still builds the 7 old apps; all 3 hosts build; `bun run validate-recipes` passes trivially on zero recipes.

### Phase 1 — Migrate `prisma` (the pilot)

Pick `prisma` first: it's the smallest, has no auth, and other recipes declare `requires: ["prisma"]`.

1. `mkdir -p recipes/prisma/files`
2. Copy the real files from `apps/prisma` into `recipes/prisma/files/`, **mirroring their target paths**. Read the actual directory — do not trust `apps/prisma/README.md` (see B5).
3. Write `recipes/prisma/recipe.config.ts`: steps, `dependencies` extracted from `apps/prisma/package.json`, `hosts: ["app-router-src", "app-router-no-src"]`.
4. Write `scripts/compose.ts`: copies a recipe's files into a temp copy of a host, resolving `{{srcDir}}`, applying `append` markers.
5. Add a CI job: compose `prisma` into each declared host → `bun install` → `tsc --noEmit` → `next build`.

**Acceptance:** `bun run validate-recipes` passes. Composition into both hosts builds clean. Every file in `files/` is claimed by a step. `apps/prisma` still exists and still builds.

### Phase 2 — `scripts/check-coverage.ts`

The gate that actually stops missing files.

Lists every file under `recipes/<name>/files/` that no step claims. Fails if anything unclaimed exists, with an ignore list for things that are legitimately context-only (a `prisma/schema.prisma` that exists so the append has something to append into, say).

`next build` catches broken imports. It does **not** catch a dropped component that's only reached at runtime. Coverage does.

**Acceptance:** deliberately delete a `source` entry from `prisma`'s config → CI fails with the unclaimed path named.

### Phase 3 — Migrate the remaining five

`better-auth` → `authjs` → `rest` → `drizzle` → `supabase`, then `trpc` (added later). One PR each, same procedure as Phase 1.

While migrating, fix the bugs rather than porting them:

- **B1/B2**: `better-auth`'s route handler is `app/api/auth/[...all]/route.ts`. Verify on disk and declare the real path.
- **B3**: `lib/prisma.ts`, spelled correctly.
- **B4**: `drizzle` has no Prisma schema. Its files are `lib/db/drizzle.ts`, `lib/db/schema.ts`, `lib/db/relations.ts`, `drizzle.config.ts`.
- **B5**: `prisma/schema.prisma`, not `.ts`.
- **B6**: do **not** copy `app/generated/prisma/**` into `files/`. It's generated output. The `prisma generate` post-install command produces it.
- **B7**: delete `apps/prisma/prisma-orm-complete-setup (1).md`. It belongs on `next.cnippet.dev`. If its content is worth keeping, hand it to whoever writes that guide — do not leave it here.
- **`supabase`**: its README carries a real security warning ("Update all the RLS policies. Current policies leave the application very vulnerable"). That is not a footnote — it becomes a `manual` step with `blocking: true`, or the recipe ships an insecure default.

Also for `supabase`: the README lists `lib/db/prisma.ts` alongside Supabase clients. Verify whether that's real or a copy-paste leftover from the `rest` recipe.

**Acceptance:** all six recipes validate, compose, and build. Coverage passes on each.

### Phase 4 — Demos

Decide which apps stay runnable. Suggested: `better-auth` and `prisma` only, to start — those are the two people most want to see working.

1. `git mv apps/better-auth demos/better-auth`, same for `prisma`.
2. Strip anything now duplicated by the recipe. The demo's job is "a running app you can click through," not "the source of truth."
3. Add a root-level note in each demo's README: *"This is a demo. The recipe source of truth is `recipes/<name>/`. Changes here do not ship."* Without that line someone will edit the demo and wonder why nothing changed.

**Acceptance:** demos build and run. Recipes still validate independently of demos.

Done notes: step 2 was read as "strip the prose file lists" — the README "Priority Files" sections (which carried B1, B2, B5) were replaced by the demo note, run steps and the env vars the code actually reads. No working code was removed. Workspace packages were renamed `demo-prisma` / `demo-better-auth` so they no longer shadow the real `prisma` and `better-auth` npm packages in the lockfile.

### Phase 5 — Delete the old apps

Only once Phases 1–4 are all green.

1. Delete `apps/authjs`, `apps/drizzle`, `apps/rest`, `apps/supabase`.
2. `apps/reference` — _(decide)_ what this is for. If it's the docs/showcase app, move it to `demos/reference` or keep a top-level `apps/reference`. If it's dead, delete it.
3. Delete the `apps/` directory if nothing remains.
4. `bun install` to prune the lockfile. Expect it to shrink a lot.

**Acceptance:** repo builds from clean clone. Lockfile regenerated. No references to `apps/*` remain in `turbo.json`, `.github/`, or docs.

### Phase 6 — CI rebuild

Fix B8 and B9.

The old model ("build every app, with every env var in one block") is replaced by a matrix over recipes:

```yaml
# .github/workflows/recipes.yml  (sketch — adapt to your runner setup)
jobs:
  validate:
    steps:
      - run: bun run validate-recipes     # schema, paths exist, ids unique
      - run: bun run check-coverage       # nothing unclaimed

  compose:
    strategy:
      matrix:
        recipe: [prisma, better-auth, authjs, rest, drizzle, supabase]
      fail-fast: false
    steps:
      - run: bun run compose ${{ matrix.recipe }}   # into each declared host
      - run: bun run --cwd .compose/${{ matrix.recipe }} tsc --noEmit
      - run: bun run --cwd .compose/${{ matrix.recipe }} next build
```

Env vars come from the recipe's declared `env` list with placeholder values, generated per-job — not from one shared block that grows forever.

Update `.github/labeler.yml`: replace `app:reference` and friends with `recipes`, `hosts`, `demos`, `scripts`.

**Acceptance:** a PR touching one recipe runs that recipe's job, not all seven. Cache paths point at real directories.

### Phase 7 — Wire to `cnippet-stack`

Out of scope for this repo's changes, but it's the payoff and shouldn't be forgotten.

_(decide)_ how `cnippet-stack` reads this repo: git submodule, pinned CI checkout, or publish `recipes/` as a package. Submodule is simplest given you own both repos.

Then `cnippet-stack` gains `pnpm recipe:sync`, which reads `recipe.config.ts` + `files/`, applies the `#if` → `{{#if}}` and marker-extraction transforms, and writes `packages/registry/recipes/<name>/`. CI there fails if committed `.hbs` differs from generated output — same idea as a lockfile check.

**After this lands, the `.hbs` files are never hand-edited again.**

---

## 5. Per-recipe migration procedure

For one recipe, in order:

```bash
# 1. Read what's actually on disk. Do NOT trust the README.
find apps/<name> -type f \
  \( -name '*.ts' -o -name '*.tsx' -o -name '*.prisma' -o -name '*.json' \) \
  -not -path '*/node_modules/*' \
  -not -path '*/.next/*' \
  -not -path '*/app/generated/*'

# 2. Create the recipe folder
mkdir -p recipes/<name>/files

# 3. Copy real files, mirroring target paths
#    e.g. apps/<name>/lib/auth/auth.ts → recipes/<name>/files/lib/auth/auth.ts

# 4. Write recipe.config.ts

# 5. Validate
bun run validate-recipes <name>
bun run check-coverage <name>

# 6. Compose and build
bun run compose <name>
bun run --cwd .compose/<name>/<host> next build
```

### What to exclude from `files/`

Never copy these — they belong to the host, not the recipe:

- `node_modules/`, `.next/`, `.turbo/`
- `app/generated/**` (Prisma output — `prisma generate` makes it)
- `next-env.d.ts`, `.gitignore`, `package.json`, `bun.lock`
- `postcss.config.mjs`, `tsconfig.json` *(unless the recipe's whole point is changing it, like TS strict mode)*
- `components/ui/**` — these come from the `@cnippet` registry via the shadcn CLI. **Declare them in `cnippetUiComponents` (a list of registry names, e.g. `["button", "card"]`) so the CLI runs `shadcn add @cnippet/<name>` instead**, or the recipe ships a stale fork of Cnippet UI. List every component the recipe's files import from `components/ui/`, by `@/` alias or relative path.
- Any `.md` guide file (B7)

### How to break code into steps

Work backwards from "what can a person verify." Rough shape for an auth recipe:

1. `schema-append` — database tables → verify in Prisma Studio
2. `server-instance` — `lib/auth/auth.ts` → verify it typechecks
3. `route-handler` — `api/auth/[...all]/route.ts` → verify `/api/auth/session` returns `null` not 404
4. `client-instance` — `lib/auth/auth-client.ts` → verify import
5. `validation` — Zod schemas + server actions → verify a bad input is rejected
6. `starter-ui` — sign-in / sign-up pages → verify you can see them in a browser
7. `route-protection` — `proxy.ts` + DAL → verify a logged-out visit to a protected page redirects

Note the ordering constraint: **step 3 imports what step 2 creates.** Reversed, step 2 alone wouldn't typecheck and the partial-install rule fails. Order by dependency, not by narrative.

---

## 6. Where each existing app lands

| Today | Becomes | Notes |
|---|---|---|
| `apps/prisma` | `recipes/prisma` + `demos/prisma` | Pilot. Fix B5, B6, B7. |
| `apps/better-auth` | `recipes/better-auth` + `demos/better-auth` | Fix B1, B2, B6. Flagship — keep the demo. |
| `apps/authjs` | `recipes/authjs` | Fix B3, B5. Name decided (D5): `authjs` everywhere — the guide slug on `next.cnippet.dev` must be `authjs` too. |
| `apps/rest` | `recipes/rest-api-patterns` | Fix B5. Maps to guide #21. |
| `apps/drizzle` | `recipes/drizzle` | Fix B4. Guide #12, tier **paid**. |
| `apps/supabase` | `recipes/supabase` | Fix B5. The RLS warning becomes a blocking manual step. |
| `apps/trpc` | `recipes/trpc` | Added after this plan was written. `requires: ["prisma"]`, host `with-prisma`. The placeholder session in `trpc/init.ts` is a manual step. |
| `apps/reference` | _(decide)_ | Clarify its purpose first. |
| `packages/ui` | _(decide)_ | B11 — populate or delete. |
| `packages/eslint-config`, `packages/typescript-config` | unchanged | Hosts and demos consume them |

One naming decision to settle before Phase 3: **recipe names must match between this repo, `cnippet-stack`'s registry, and the guide slug on `next.cnippet.dev`.** `authjs` vs `nextauth` vs `next-auth` will cause a broken guide link otherwise. Write the chosen names down.

Chosen names (all three places must use these):

| Recipe | Name |
|---|---|
| Prisma | `prisma` |
| Better Auth | `better-auth` |
| Auth.js (NextAuth v5) | `authjs` |
| REST API patterns | `rest-api-patterns` |
| Drizzle | `drizzle` |
| Supabase | `supabase` |
| tRPC | `trpc` |

---

## 7. Verification checklist

Before calling the migration done:

**Structure**
- [ ] `hosts/`, `recipes/`, `demos/`, `scripts/` exist and are in `turbo.json`
- [ ] No `apps/` directory, or only a deliberately-kept `apps/reference`
- [ ] Root `AGENTS.md` and a real `README.md` exist
- [ ] Lockfile regenerated and noticeably smaller

**Every recipe**
- [ ] Has `recipe.config.ts` and `files/`
- [ ] Has no `package.json`, `node_modules`, or `.next`
- [ ] Every `source` path exists
- [ ] Every file in `files/` is claimed by exactly one step
- [ ] Every step has `title`, `why`, `verify`
- [ ] Step ids are descriptive slugs, unique, non-numeric
- [ ] Every `append` uses marker blocks
- [ ] `dependencies` extracted from the old app's `package.json`
- [ ] No generated Prisma client, no guide `.md`, no `components/ui/**` fork
- [ ] Composes into every declared host and passes `tsc --noEmit` + `next build`
- [ ] Stopping after each step still typechecks

**Bugs closed**
- [ ] B1–B11 each either fixed or consciously deferred with a note

**CI**
- [ ] Matrix over recipes, not one job per app
- [ ] Env placeholders generated from declared `env`, not a shared block
- [ ] Cache paths point at directories that exist
- [ ] Labeler updated

---

## 8. Rules for whoever implements this

1. **Read the disk, never the README.** The READMEs are the thing being replaced and they contain at least five known errors.
2. **Don't rewrite working code.** This is a restructure. If a file works today, it moves unchanged. Fixing a real bug found along the way is fine; "improving" a working file is not.
3. **One phase per PR.** Phases are ordered because later ones depend on earlier ones being green.
4. **Verify library APIs against current docs before touching any code.** better-auth, Prisma 7, Next 16, Drizzle and Supabase all move faster than training data. Root `AGENTS.md` says the same thing about Next.js and it's right. A plausible-looking import that doesn't exist costs more than looking it up.
5. **Never invent a `recipe.config.ts` field.** If it isn't in §3, it doesn't exist. Propose a schema change separately — and remember the schema is shared with `cnippet-stack`.
6. **When a step in this plan conflicts with something convenient, follow the plan** and raise the conflict. The convenient thing is what produced the drift.
7. **Stop and ask on anything marked _(decide)_.** There are seven of them. Guessing on recipe names or on what `apps/reference` is for will cost more than asking.

---

## 9. Open decisions

Answer these before or during the phase that needs them.

| # | Decision | Needed by |
|---|---|---|
| D1 | Which host apps? Three (`app-router-src`, `app-router-no-src`, `with-prisma`) or also `with-drizzle` / `no-orm`? | Phase 0 |
| D2 | `packages/ui` — populate or delete? (B11) | Phase 0 |
| D3 | What is `apps/reference` for? Keep, move to `demos/`, or delete? | Phase 5 |
| ~~D4~~ | ~~Which recipes get a demo?~~ — **decided:** `better-auth` and `prisma`. All other apps are deleted in Phase 5. | Phase 4 |
| ~~D5~~ | ~~Recipe naming~~ — **decided:** `authjs`, matching `cnippet-stack`'s registry. Guide slug on `next.cnippet.dev` still to be aligned (out of scope here, §10). | Phase 3 |
| D6 | How does `cnippet-stack` read this repo? Submodule, pinned CI checkout, or published package? | Phase 7 |
| ~~D7~~ | ~~Field name and shape for registry-sourced UI components~~ — **decided:** `cnippetUiComponents: string[]`, already in upstream `RecipeManifest` | Phase 1 |

---

## 10. Out of scope

Named so nobody wanders into them mid-migration:

- **`cnippet-stack` changes** — `recipe:sync`, `--learn`, `--resume`, steps in the manifest schema, pro gating at the steps endpoint. That's a separate plan for that repo.
- **`next.cnippet.dev` changes** — the `<RecipeStep>` component, guide frontmatter, rewriting the four existing guides. Separate plan.
- **New recipes.** Migrate the six that exist first. Recipe #7 onwards comes after the structure is proven, and will be much cheaper then.
