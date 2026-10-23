<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# cnippet-stack-recipes

This repo is the source of truth for recipe code consumed by `cnippet-stack` and `next.cnippet.dev`. It was migrated from one full app per recipe (the old `apps/*`) to shared hosts plus recipe folders — read `CONTRIBUTING.md` and `docs/recipe-format.md` before changing anything.

- `hosts/*` — minimal Next.js apps recipes are composed into for CI. Keep them current; add nothing recipe-specific.
- `recipes/*` — `recipe.config.ts` + `files/`. No `package.json`.
- `demos/*` — full runnable apps (`prisma`, `better-auth`). Not the source of truth: a recipe change goes in `recipes/`, never only in a demo.
- `packages/recipe-kit` — the recipe schema, renderer and `when` evaluator, shared with `cnippet-stack`. Schema changes affect the live CLI.
- `scripts/*` — pull, validation, coverage and composition.
- Read files on disk, not prose: a recipe's files are whatever its `recipe.config.ts` declares, never a README list.
- better-auth, Prisma 7, Next 16, Drizzle and Supabase move faster than training data: check current docs before touching their APIs.

<!-- BEGIN:turborepo-agent-rules -->

# This is NOT the Turborepo you know

Turborepo configuration, task behavior, and CLI commands can vary between installed versions and may differ from your training data. Resolve the `turbo` package from this file's directory or relevant workspace; in monorepos, it may not be visible from the repository root. For example, run `node -p "require.resolve('turbo/package.json')"` from a workspace that depends on `turbo`.

Read `docs/README.md` inside that installed package first, then read the relevant pages from its `docs/` directory before changing Turborepo configuration or commands. Heed deprecation notices. These bundled docs match the installed package version and are available without network access.

This block is written and re-added by `turbo` before repository-scoped commands when an AI agent is detected. In the Turborepo source repository, its template is defined in `crates/turborepo-cli/src/cli/agent_guidance.rs`. Removing the managed block while updates are enabled means a later qualifying invocation will add it again. Set `"agentGuidance": false` in the root `turbo.json` or `turbo.jsonc` to opt out; this does not remove an existing block. Keep the block committed with your work to avoid an uncommitted change on the next agent invocation.
<!-- END:turborepo-agent-rules -->
