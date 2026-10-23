# The recipe format

Every recipe is one folder:

```
recipes/<name>/
  recipe.config.ts    the manifest: steps, files, packages, env vars, questions
  files/              the real code, laid out like an app without src/
  guide.mdx           the beginner guide for next.cnippet.dev (optional for now)
  .coverageignore     optional: files in files/ that are there on purpose but not installed
```

No `package.json`, no `node_modules`. The recipe isn't an app.

**The schema is the truth.** This page explains it in plain words, but if it and
[`packages/recipe-kit/src/schema.ts`](../packages/recipe-kit/src/schema.ts) ever disagree, the schema wins.
The same schema is used by `compose` here, by CI, and by the real `cnippet-stack` CLI, so what CI tests is what users get.

---

## 1. A full example

```ts
import type { RecipeManifestInput } from "@cnippet/recipe-kit";

export default {
  name: "resend",                         // = folder name
  version: "0.1.0",
  title: "Resend Email Integration",
  description: "Send email from server actions with Resend, plus an optional delivery webhook.",
  category: "email",
  tier: "free",
  supports: { next: ["16"], orm: ["none"], router: ["app"] },
  hosts: ["app-router-src", "app-router-no-src"],

  dependencies: ["resend@^6.31.0", "zod@^4.4.3"],
  cnippetUiComponents: ["button", "input", "label"],

  envVars: [
    { name: "RESEND_API_KEY", description: "API key from resend.com/api-keys", example: "re_placeholder" },
    { name: "RESEND_WEBHOOK_SECRET", description: "Signing secret of the webhook", example: "whsec_placeholder",
      when: "answers.webhooks" },
  ],

  prompts: [
    { id: "starterUi", type: "confirm", message: "Generate a starter email form?", default: true },
    { id: "webhooks",  type: "confirm", message: "Add a webhook route for delivery events?", default: false },
  ],

  steps: [
    {
      id: "client",
      title: "Create the Resend client",
      why: "One shared client reads the API key once, on the server only.",
      verify: "Import `resend` from `@/lib/email/resend` — no TypeScript errors.",
      files: [{ source: "lib/email/resend.ts", target: "{{srcDir}}lib/email/resend.ts", strategy: "create" }],
      manualSteps: [{ title: "Create an API key", description: "resend.com/api-keys", blocking: true, when: "before" }],
    },
    // … more steps
  ],
} satisfies RecipeManifestInput;
```

---

## 2. Top-level fields

| Field | Needed? | What it means |
|---|---|---|
| `name` | yes | Lowercase, dashes. Must equal the folder name. |
| `version` | yes | Semver. Bump on every change (see CONTRIBUTING §5). |
| `title`, `description` | yes | Shown on stack.cnippet.dev and in `cnippet-stack list`. |
| `category` | yes | `auth`, `database`, `email`, `payments`, `api`, … |
| `tier` | yes | `"free"` or `"pro"`. Controls both the code and the guide. |
| `supports` | yes | `next` majors (`["16"]`), `router` (`["app"]`), `orm` (`["prisma"]`, `["drizzle"]`, `["none"]`, or several). |
| `hosts` | yes | Which `hosts/*` CI builds it in. At least one. |
| `requires` | no | Other recipes that must be installed first, e.g. `["prisma"]`. The CLI installs them first, and `compose` does too. |
| `dependencies`, `devDependencies` | no | `"pkg@^x.y.z"`. Take versions from the app you tested in. Pin exactly (`"next-auth@5.0.0-beta.32"`) for beta packages, with a comment saying why. |
| `cnippetUiComponents` | no | `@cnippet` UI names your files import from `components/ui/`. The CLI runs `shadcn add` for them. |
| `envVars` | no | See §5. |
| `prompts` | no | See §6. |
| `steps` | yes | See §3. At least one. |
| `checks` | no | What `cnippet-stack doctor` checks after install (`env`, `file`, `dep`, `command`, `httpGet`). Their `when` may only use `detection`, never `answers`. |
| `gitignore` | no | Lines appended to the user's `.gitignore`. `{{srcDir}}` allowed. |
| `thin` | no | `true` for 1–2 step recipes. The CLI skips learn mode. |
| `trustedBuildScripts` | no | Packages whose install scripts must run (pnpm 10+ and bun block them by default), e.g. `prisma`. |
| `complianceNotes` | no | Short notes shown to the user (licences, data handling). |

---

## 3. Steps

One step = one stopping point the user (and the guide) can stop at.

| Field | What it means |
|---|---|
| `id` | Lowercase slug (`schema-append`). **Never numeric, never renamed.** It's the guide's anchor and the CLI's resume key. |
| `title` | Short, starts with a verb: "Create the Resend client". |
| `why` | 1–3 plain sentences. Printed in the terminal. The long explanation goes in the guide. |
| `verify` | Something the user can **see**: a page, a curl result, a table in Prisma Studio, "no TypeScript errors". |
| `files` | The files this step installs (§4). |
| `manualSteps` | Things the user does by hand. `when: "before"` or `"after"` the step. `blocking: true` = can't go on without it. Optional `guideUrl`. |
| `postInstall` | Commands run after install, e.g. `prisma generate`. Listed once even if several steps repeat them. |

Rules (CI enforces most of them):

- Order steps **by dependency**. A step may only import files from earlier steps.
- Installing steps 1..N, for any N, must **typecheck**. Check with `compose --through <id> --typecheck`.
- Every file in `files/` belongs to **exactly one** step (`check-coverage`).
- 3–8 steps for most recipes.

---

## 4. Files

```ts
{ source: "lib/email/resend.ts", target: "{{srcDir}}lib/email/resend.ts", strategy: "create" }
```

| Field | What it means |
|---|---|
| `source` | Path inside `files/`. Never starts with `src/`. |
| `target` | Where it lands in the user's app. Use placeholders (below). |
| `strategy` | `create`, `append` or `ast-inject` (below). |
| `replaces` | `true` = this `create` overwrites a file every app already has (like `app/page.tsx`). A backup is made first. |
| `when` | Only install this file if the expression is true (§7). |
| `injection` | For `ast-inject` only: `{ kind, anchor }`. |

**Placeholders** (only in `target`, never inside the code):

| Placeholder | Becomes |
|---|---|
| `{{srcDir}}` | `src/` or nothing |
| `{{appDir}}` | `src/app/` or `app/` |

Files in `files/` stay real code that compiles. Imports use `@/…`, which works in both layouts.

**Strategies:**

| Strategy | Use it for | Rule |
|---|---|---|
| `create` | A new file | Skips the file if it already exists, unless `replaces: true` or the user passes `--overwrite`. |
| `append` | Adding to a file the user owns (`prisma/schema.prisma`) | The fragment **must** be wrapped in markers (below). |
| `ast-inject` | Changing existing code (`app/layout.tsx`) | Done with ts-morph, never regex. `kind`: `wrap-jsx`, `add-import`, `add-to-array`, `add-object-property`. |

**Markers** for `append`, in the target file's own comment style:

```prisma
// >>> cnippet:authjs
model User { … }
// <<< cnippet:authjs
```

They make a second install safe: the block is found and not added twice.

**Never put these in `files/`:** `components/ui/**` (list them in `cnippetUiComponents`), `.env*` (use `envVars`),
`package.json` and lockfiles (use `dependencies`), `app/generated/**`, `next-env.d.ts`, `tsconfig.json`
(unless the recipe is about it), `*.md` / `*.mdx` (the guide is `guide.mdx` next to `files/`, not inside it).

---

## 5. Env vars

```ts
{ name: "AUTH_SECRET", description: "Secret used to encrypt session JWTs.", generate: "secret32" }
```

| Field | What it means |
|---|---|
| `name` | The variable name. |
| `description` | One line: what it is and where to get it. |
| `example` | A **fake** value written to `.env` (`re_placeholder`). Never a real one. |
| `generate` | `secret32` or `uuid`: the CLI makes a real random value for the user. |
| `required` | Default `true`. |
| `when` | Only add it if the expression is true (e.g. `answers.webhooks`). |

Some libraries read env vars on their own (Auth.js reads `AUTH_GITHUB_ID` with no `process.env` in your code).
List those too.

---

## 6. Prompts

```ts
{ id: "webhooks", type: "confirm", message: "Add a webhook route for delivery events?", default: false }
```

`type` is `confirm`, `select`, `multiselect` or `text`. `select` and `multiselect` take `options: [{ label, value, hint? }]`.
A prompt can have its own `when` (only ask if an earlier answer was X).

Only add a prompt when the answer **changes which files get installed**. Fewer questions is better.

---

## 7. Conditions: `when` and `// #if`

`when` expressions read two things:

- `answers.<promptId>` — what the user answered
- `detection.<field>` — what the CLI found in the user's project (e.g. `detection.orm`)

Allowed: `===`, `!==`, `&&`, `||`, `!`, member access, and the methods `includes`, `startsWith`, `endsWith`, `some`, `every`.
It's a small safe evaluator, not JavaScript. Anything else is an error.

```ts
when: "answers.webhooks"
when: "answers.providers.includes('github')"
when: "detection.orm === 'drizzle'"
```

**Branches inside a file** use the file's own comment syntax, so the file still compiles:

```ts
export const auth = betterAuth({
  emailAndPassword: { enabled: true },
  // #if answers.social.includes("google")
  socialProviders: { google: { clientId: process.env.GOOGLE_CLIENT_ID!, clientSecret: process.env.GOOGLE_CLIENT_SECRET! } },
  // #endif
});
```

- Forms: `// #if <expr>`, `// #else`, `// #endif` (or `# #if`, `<!-- #if -->`).
- **No nesting, at most 3 `#if` blocks per file.** More than that means separate files with `when`, or a separate recipe.
- `compose` turns every branch **on**, so CI tests the biggest version.
- JSON can't hold comments. Ship one file per option and pick with `when`.

---

## 8. New recipe, or an option in an existing one?

| Situation | Do this |
|---|---|
| Same feature for the user, different plumbing underneath (Prisma or Drizzle, Resend or SES) | **An option in the existing recipe.** Move the plumbing into one small file, ship one version per option, pick with `when: "detection.…"`. |
| A different library the user picks **by name** (Auth.js vs better-auth) | **A new recipe.** |
| A different feature (email form vs newsletter list) | **A new recipe.** |

Why: a second recipe copies all the shared files, and every bug then has to be fixed twice.

**Shared code is never copied between recipes.** If your recipe needs a database client, add `requires: ["prisma"]`
and import the client the `prisma` recipe installs. Don't ship a second one.

---

## 9. Hosts

| Host | What it is | Use when |
|---|---|---|
| `app-router-no-src` | Clean Next.js app, no `src/` | Most recipes |
| `app-router-src` | Same, with `src/` | Most recipes, to prove `{{srcDir}}` works |
| `with-prisma` | No `src/`, Prisma 7 already set up | Recipes that `requires: ["prisma"]` |

Hosts hold nothing recipe-specific. Need a new host (e.g. `with-drizzle`)? Open an issue first.
