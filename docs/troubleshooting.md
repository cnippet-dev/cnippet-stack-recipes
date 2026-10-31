# Troubleshooting

## Error messages

| You see | It means | Fix |
|---|---|---|
| `recipes/<name>/recipe.config.ts doesn't exist yet — pass the paths to pull` | First pull, no manifest yet | List the paths: `pull-recipe <name> --from <app> lib/… components/…` |
| `<path>: not found in the app (looked for …)` | Typo, or the file isn't in your build app | Check the path. Don't add `src/`; it's found on its own. |
| `invalid recipe.config.ts — run validate-recipes` | The manifest breaks the schema | `bun run validate-recipes <name>` says which field |
| `⚠ relative imports — use @/ …` (pull) or `relative import "../…" — use @/` (validate) | A `../` import | Change it to `@/…` in your build app, pull again |
| `set replaces: true on it in recipe.config.ts` | You're pulling a file every app has (`app/page.tsx`) | Add `replaces: true` to that file entry |
| `cnippetUiComponents is missing: [...]` | A `components/ui/*` import isn't declared | Add the names to `cnippetUiComponents` |
| `dependencies is missing: [...]` | A package import isn't declared | Add `"pkg@^x.y.z"` with the version from your build app |
| `create target … already exists in the host` | Your file would overwrite a host file | Add `replaces: true`, only if you really mean to overwrite it |
| `… is marked replaces but the host has no such file` | `replaces: true` on a brand-new file | Remove `replaces` |
| `has uncommitted changes in the recipe — commit them or pass --force` | Someone edited `files/` directly | Move the edit into your build app, or commit it. `--force` overwrites it. |
| `<name>: no step "xyz"` | Wrong `--through` id | Use an id from the manifest |
| `does not support Next.js N` | The host's Next major isn't in `supports.next` | Test on that version, then add it |
| `nested #if is not allowed` / `more than 3 #if blocks` | Too many branches in one file | Split into files picked with `when`, see recipe-format §7 |
| `` `bunx next build` failed `` | A real build error | Scroll up. Reproduce it in your build app, fix it there, pull again. |

## What `pull-recipe` refuses

| Refused | Put it here instead |
|---|---|
| `components/ui/*` | `cnippetUiComponents` |
| `.env*` | `envVars` |
| `package.json` | `dependencies` / `devDependencies` |
| lockfiles | nowhere, they never ship |
| `*.md`, `*.mdx` | `recipes/<name>/guide.mdx` (next to `files/`, not inside it) |
| Host files that don't use recipe code (`app/layout.tsx`, a plain `app/page.tsx`) | leave them out, every app has them |

If there's any error, nothing is written.

## Testing the "off" paths

`compose` answers **yes** to every prompt, so the "no" answers aren't built automatically. Build them with
`--answers`, which overrides the recipe's own answers (not those of the recipes it requires):

```bash
bun run compose authjs --answers '{"starterUi":false,"providers":[]}' --build
```

Build the least the recipe can install (every confirm off, every multiselect empty) at least once. To find what breaks:

1. Find every file and env var with `when: "answers.<thatPrompt>"`.
2. Ask: "If these are skipped, does any **other** file still import them?" The answer must be no.
3. A useful shortcut: `compose <name> --through <last-step-before-the-optional-ones> --typecheck`
   is the same as answering "no" to everything after it.

## Looking at the composed app

```bash
bun run compose <name> --typecheck        # installs deps too
cd .compose/<name>/app-router-no-src
bun dev
```

Env values there are fake, so real sending, sign-in or payments won't work. Test those in your build app.
`.compose/` is safe to delete any time.

## CI is red but it works on my machine

CI runs the same scripts. Run the failing one locally:

```bash
bun install --frozen-lockfile
bun run validate-recipes
bun run check-coverage
bun run compose <name> --build
```

Common causes: a lockfile out of date (`bun install` and commit `bun.lock`), a file left out of `git add`,
or a host you didn't build locally (`--host` picks one, CI builds all of them).
