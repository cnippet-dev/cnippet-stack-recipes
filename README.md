# cnippet-stack-recipes

The free recipes behind [stack.cnippet.dev](https://stack.cnippet.dev). A recipe is tested, working Next.js code
a developer installs into their own app:

```bash
npx cnippet-stack init resend
```

Each recipe folder is the single source for three things: the code the CLI installs, the recipe page on
stack.cnippet.dev, and the beginner guide on next.cnippet.dev.

**Want to add or fix a recipe?** Read [`CONTRIBUTING.md`](./CONTRIBUTING.md).

## Recipes

`authjs`, `prisma`, `resend`.
The source of truth is the `recipes/` folder, not this list.

## Layout

| Path | What it is |
|---|---|
| `recipes/<name>/` | One recipe: `recipe.config.ts` (the manifest) and `files/` (the real code). No `package.json`. |
| `hosts/*` | Clean Next.js apps CI builds recipes in: `app-router-src`, `app-router-no-src`, `with-prisma`. |
| `packages/recipe-kit` | The recipe schema, renderer and `when` evaluator. Shared with the `cnippet-stack` CLI, so CI and users get the same output. |
| `scripts/` | `pull-recipe`, `validate-recipes`, `check-coverage`, `compose`, `changed-recipes`. |
| `demos/*` | Full runnable apps (`prisma`, `better-auth`) for showing people. Changes there don't ship. |
| `docs/` | [Recipe format](./docs/recipe-format.md) · [Writing guides](./docs/writing-guides.md) · [Troubleshooting](./docs/troubleshooting.md) · [Brief template](./docs/recipe-brief-template.md) |

## Commands

```bash
bun install

bun run pull-recipe <name> --from <app> [--diff | --write]   # copy tested code into the recipe
bun run validate-recipes [name ...]                         # manifest correct, files exist
bun run check-coverage [name ...]                           # every file used by exactly one step
bun run compose <name> --build                              # build it in every host (what CI runs)
bun run compose <name> --through <step-id> --typecheck      # a partial install still compiles
```

Composed apps go to `.compose/<recipe>/<host>/` (gitignored, safe to delete).
