# cnippet-stack-recipes

The source of truth for recipe code. `cnippet-stack` turns each recipe into install templates, and `next.cnippet.dev` renders the same code in its guides.

## Layout

| Path | What it is |
|---|---|
| `recipes/<name>/` | One recipe: `recipe.config.ts` (the ordered, machine-readable steps) and `files/` (real source, mirroring target paths). No `package.json`. |
| `hosts/*` | Minimal Next.js apps that CI composes recipes into: `app-router-src`, `app-router-no-src`, `with-prisma`. |
| `demos/*` | Full runnable apps for `prisma` and `better-auth`. Not the source of truth — changes there do not ship. |
| `scripts/` | `validate-recipes`, `check-coverage` and `compose`. |
| `packages/*` | Shared `eslint-config` and `typescript-config`. |

Recipes: `authjs`, `better-auth`, `drizzle`, `prisma`, `rest-api-patterns`, `supabase`, `trpc`.

## Commands

```bash
bun install

bun run validate-recipes [name ...]   # schema, paths exist, step ids, UI components declared
bun run check-coverage [name ...]     # every file in files/ is claimed by a step
bun run compose <name> --build        # copy into each declared host, then next build + tsc
bun run compose <name> --through <step-id> --typecheck   # partial install still typechecks

bun run build                         # build hosts and demos
```

Composed apps are written to `.compose/<recipe>/<host>/` (gitignored).

## Adding or changing a recipe

Read [`RECIPES-MIGRATION.md`](./RECIPES-MIGRATION.md) §3 for the `recipe.config.ts` contract and [`AGENTS.md`](./AGENTS.md) for repo rules. In short:

- Put real, compilable code in `files/`; target-path placeholders (`{{srcDir}}`, `{{appDir}}`) go only in the config.
- Every step needs a descriptive `id`, `title`, `why` and `verify`.
- Declare Cnippet UI components in `cnippetUiComponents`; never copy `components/ui/**`.
- `append` sources must be wrapped in `>>> cnippet:<name>` / `<<< cnippet:<name>` markers.
- Before opening a PR: `validate-recipes`, `check-coverage` and `compose <name> --build` all pass.
