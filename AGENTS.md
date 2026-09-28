<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# cnippet-stack-recipes

This repo is the source of truth for recipe code consumed by `cnippet-stack` and `next.cnippet.dev`. It is mid-migration from one full app per recipe (`apps/*`) to shared hosts plus recipe folders — read `RECIPES-MIGRATION.md` before restructuring anything.

- `hosts/*` — minimal Next.js apps recipes are composed into for CI. Keep them current; add nothing recipe-specific.
- `recipes/*` — `recipe.config.ts` + `files/`. No `package.json`.
- `demos/*` — full runnable apps (`prisma`, `better-auth`). Not the source of truth: a recipe change goes in `recipes/`, never only in a demo.
- `scripts/*` — recipe validation, coverage and composition.
- Read files on disk, never an app's README — the READMEs have known errors.
- better-auth, Prisma 7, Next 16, Drizzle and Supabase move faster than training data: check current docs before touching their APIs.
