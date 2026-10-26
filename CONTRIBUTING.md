# Contributing a recipe

This repo holds every **free** recipe for [stack.cnippet.dev](https://stack.cnippet.dev).
A recipe is working Next.js code that a developer installs into **their own app** with:

```bash
npx cnippet-stack init <recipe>
```

The same recipe also feeds a beginner guide on [next.cnippet.dev](https://next.cnippet.dev).
So one recipe folder gives three things: the code, the stack.cnippet.dev page, and the guide.

You only ever work in **this repo**. You never touch the CLI or the websites.

> Short on time? Read §1 and §2, then copy the cheat sheet in §9.

---

## 1. The words you need

| Word | What it is |
|---|---|
| **Recipe** | A folder in `recipes/<name>/`. Holds a manifest and a copy of the code. It's **not** an app, so you can't run it on its own. |
| **Manifest** | `recipes/<name>/recipe.config.ts`. Lists the steps, files, npm packages, env vars and questions. Format: [`docs/recipe-format.md`](./docs/recipe-format.md). |
| **`files/`** | The real code, laid out the way it sits in a Next.js app without `src/` (`lib/…`, `app/…`, `components/…`). |
| **Build app** | Any normal Next.js app on your machine where you write and test the code for real. Not part of this repo. |
| **Host** | A clean, minimal Next.js app in `hosts/`. CI copies your recipe into one to prove it builds. |
| **Compose** | "Put the recipe into a copy of a host, install it, build it." |
| **Step** | One stopping point. The user can stop after any step and the app still compiles. |

---

## 2. The whole flow

```
 ① PLAN      write the step list (ids + one line each)            5–10 min
 ② BUILD     bun run recipe new <name>, then make it work for real  most of the time
 ③ PULL      bun run recipe pull <name> --from <app> --write       1 command
 ④ DESCRIBE  fill in the TODOs in recipe.config.ts                the manual part
 ⑤ CHECK     bun run recipe check <name>                          1 command
 ⑥ PR        open a pull request; CI runs ⑤ again                 done
```

**Golden rule:** edit in your build app → test there → pull. Never edit `recipes/<name>/files/` by hand.
(One exception: `append` fragment files, see §5.)

---

## 3. Before you start

1. **Check nothing similar exists.** Look in `recipes/`. If the recipe you want is the same feature with
   different plumbing (another ORM, another email provider), it's probably an **option inside an existing recipe**,
   not a new recipe. Open an issue first. See [`docs/recipe-format.md` §8](./docs/recipe-format.md#8-new-recipe-or-an-option-in-an-existing-one).
2. **Open an issue** with the recipe name and the step list (§4 ①). A quick "yes" saves you a rejected PR.
3. **Fill in a brief** (optional, recommended for anything bigger than 3 steps):
   copy [`docs/recipe-brief-template.md`](./docs/recipe-brief-template.md).
4. **Set up this repo once:**

   ```bash
   bun install        # Bun 1.3.14, check with: bun --version
   ```

---

## 4. Step by step

### ① Plan the steps (before any code)

Write only this, in the issue or your brief:

| # | id | What the user gets | How they can see it worked |
|---|---|---|---|
| 1 | `client` | a Resend client | importing it gives no type error |
| 2 | `send-helper` | `sendEmail()` | … |

Rules:

- **id** = lowercase words with dashes (`schema-append`, `route-handler`). Never `step-1`. **Never renamed later.**
  Guides and the CLI link to it.
- **Order by dependency.** If step 3 imports a file from step 2, step 2 comes first.
- **Every step must compile on its own.** A user who stops after step 2 still has a working app.
- **3–8 steps** for most recipes. Single-file installs (Biome, TS strict) can be 1–2 steps with `thin: true`.

### ② Build it for real

Start the recipe and its build app in one command:

```bash
bun run recipe new <name>                         # build app in ../build/<name>
bun run recipe new <name> --host with-prisma      # if you need a database
bun run recipe new <name> --app ~/build/<name>    # build app somewhere else
```

It creates `recipes/<name>/recipe.config.ts` (full of TODOs) and an empty `files/`, and copies a host into
the build app with its packages installed, so the Cnippet UI setup is already done. It refuses if the recipe
or the build app folder already exists. Then, in the build app:

```bash
bun add <the packages your recipe needs>
```

Then write the code **one step at a time, in your step order**. After each step:

```bash
bunx tsc --noEmit        # no output = no type errors
```

and do the real test: send the real email, sign in with the real OAuth app, hit the real webhook.

**Break it on purpose** and copy the **exact** error messages into your notes: wrong API key, missing env var,
bad input, the wrong callback URL. These become the "When things go wrong" part of the guide. A guide that
shows real errors is what makes it worth reading.

Code rules while you write:

| Rule | Why |
|---|---|
| Imports use `@/…`, never `../` | works with and without `src/` |
| Don't edit `components/ui/*` | UI comes from the `@cnippet` registry; the recipe only lists names |
| No secrets in code | env vars only, read through `process.env` |
| Use the current API of each library | Next 16, Prisma 7, Auth.js v5, better-auth and Drizzle change fast. Check their docs, not memory. |

### ③ Pull the code into the recipe

Run from the root of this repo.

**First time (no steps list files yet):** tell the script which files belong to the recipe.

```bash
# dry run: shows what it would copy, writes nothing
bun run recipe pull <name> --from ../build/<name> lib/email lib/actions/email.ts components/email-form.tsx

# same command + --write: copies for real
bun run recipe pull <name> --from ../build/<name> lib/email lib/actions/email.ts components/email-form.tsx --write
```

**Every time after (steps list their files):** the file list comes from the manifest.

```bash
bun run recipe pull <name> --from ../build/<name> --diff     # show changes
bun run recipe pull <name> --from ../build/<name> --write    # copy them
```

(`recipe pull` is `pull-recipe` under a shorter name; both work.)

`--write` also fills in the boring half of `recipe.config.ts` for you. It only **adds**, never removes or
rewrites what you wrote:

| It adds | From |
|---|---|
| `dependencies` / `devDependencies` | packages the files import, with the **versions from your build app's `package.json`** |
| `cnippetUiComponents` | `components/ui/*` imports |
| `envVars` (name only) | `process.env.X` in the files. The description is a TODO for you. |
| `replaces: true` | host files (e.g. `app/page.tsx`) that use the recipe's code, once they're in a step |

The dry run prints the same list without writing. Things it can't do, it prints as hints:

| Hint | What to do |
|---|---|
| `<file> isn't in recipe.config.ts yet` | add it to a step; the next `--write` sets `replaces: true` |
| `imported but not in the app's package.json` | add it to `dependencies` with a version by hand |
| `⚠ relative imports` | fix the import in your build app, pull again |

Env vars a library reads **on its own** (Auth.js reads `AUTH_GITHUB_ID` without your code mentioning it) aren't
found. Add those by hand.

The script **refuses** `.env*`, `package.json`, lockfiles, `components/ui/*` and `*.md`. Each refusal tells you
where that thing goes instead.

### ④ Write `recipe.config.ts`

`recipe new` gave you a config full of `TODO`s, and `pull --write` added the packages, UI components and env var
names. Fill in every `TODO`: `recipe check` fails while one is left. `recipes/resend` is a good example to copy from.
Full field list and rules: [`docs/recipe-format.md`](./docs/recipe-format.md).

What you write by hand:

- `name`, `title`, `description`, `category`, `version` (`0.1.0` for a new recipe)
- `tier: "free"` (pro recipes live in a separate private repo)
- `hosts`: which clean apps to test in. Use both `app-router-src` and `app-router-no-src` unless you need a database (`with-prisma`).
- `steps`: from ①. Each needs `title`, `why` (1–3 short sentences) and `verify` (something the user can see).
  List each step's files with the `create("lib/…")` helper at the top of the config.
- `envVars`: a description + a fake `example` for each name. **Never a real value.**
- `prompts`: questions the CLI asks ("Add a starter form?"). Only if they really change what gets installed.
- `manualSteps`: things no CLI can do (create an API key, verify a domain, run a migration).

**Never invent a field.** If it isn't in [`packages/recipe-kit/src/schema.ts`](./packages/recipe-kit/src/schema.ts), it doesn't exist.

### ⑤ Check

```bash
bun run recipe check <name>
```

It runs these in order and stops at the first failure. Run one by hand to repeat just the check that failed:

```bash
bun run validate-recipes <name>      # is the manifest correct? do all files exist? any TODOs left? is guide.mdx ok?
bun run check-coverage <name>        # is every file in files/ used by exactly one step?
bun run compose <name> --through <step-id> --typecheck   # every stopping point compiles (once per step id)
bun run compose <name> --build       # does it build in a clean app? (this is what CI runs)
```

`compose` turns **every prompt on**. For each prompt you can answer "no" to, think it through by hand:
"If this file is skipped, does anything still import it?" Details: [`docs/troubleshooting.md`](./docs/troubleshooting.md#testing-the-off-paths).

Something failed? Fix it **in your build app**, pull again, check again.

### ⑥ Open a pull request

```bash
git checkout -b recipe/<name>
git add recipes/<name>
git commit -m "feat(<name>): add <name> recipe"
git push -u origin recipe/<name>
```

Fill in the PR checklist. CI runs `validate-recipes`, `check-coverage` and `compose --build` for every recipe you touched.
If CI is red, run the same command on your machine. It's the same script.

After merge, the maintainers publish it. stack.cnippet.dev and the CLI pick it up, and so does next.cnippet.dev once the guide exists.

---

## 5. Changing an existing recipe

Same loop, shorter:

```
change code in your build app → test → pull --diff → pull --write → check → PR
```

- **Bump `version`** in the manifest. Patch for fixes, minor for new optional steps or prompts,
  major if users' files change shape (renamed files, removed exports).
- **Never rename or remove a step id** without a major version bump.
- **`append` files** (e.g. `prisma/auth-models.prisma`) are fragments, not whole files, so `pull` skips them.
  Edit these directly in `files/` and keep the `>>> cnippet:<name>` / `<<< cnippet:<name>` markers.

---

## 6. The guide (`guide.mdx`)

Every recipe will have a beginner guide on next.cnippet.dev, written in `recipes/<name>/guide.mdx`.

A guide shows up at `next.cnippet.dev/guides/<name>` once its frontmatter says `status: published`.
A PR without a guide is still fine. To write one, follow [`docs/writing-guides.md`](./docs/writing-guides.md);
`recipes/authjs/guide.mdx` is the example.

Order: **steps first, code second, guide words last.** Code changes while you build. Words written about code
that doesn't work yet get rewritten.

```bash
bun run recipe guide <name>
```

writes a starter `guide.mdx`: one section per step with its `<Step id>`, and TODOs where the words go. Run it
again after adding a step and it adds the missing sections, leaving your text alone.

Once a `guide.mdx` exists, `validate-recipes` checks it: every step id in exactly one `<Step>`, no unknown ids,
no code block longer than 5 lines (that's pasted code), frontmatter `title`, `description` and `recipe: <name>`,
and no TODOs left.

Want a first draft of the words? See [`docs/ai-drafting.md`](./docs/ai-drafting.md). You edit everything it writes.

---

## 7. What gets a PR rejected

- Code that was never run for real (only typechecked)
- A copied `components/ui/*`, `.env`, lockfile or `package.json` in `files/`
- Real secrets anywhere
- A step without a real `verify`, or a `why` that's an essay
- Renamed step ids on an existing recipe
- A new recipe that should have been an option in an existing one (§3)
- Two copies of shared code. If your recipe needs a database client, `requires` the database recipe and import its client. Don't ship your own.

---

## 8. Getting help

- Something's broken? Look in [`docs/troubleshooting.md`](./docs/troubleshooting.md) first.
- Still stuck? Open an issue with the command you ran and its full output.

---

## 9. Cheat sheet

```bash
# once
bun install

# start a recipe + its build app (../build/<name>)
bun run recipe new <name> [--host with-prisma] [--app <dir>]

# first pull (steps don't list files yet)
bun run recipe pull <name> --from <app> <paths...>            # dry run
bun run recipe pull <name> --from <app> <paths...> --write    # copy + fill config
#   → fill in the TODOs in recipes/<name>/recipe.config.ts

# every time after
bun run recipe pull <name> --from <app> --diff
bun run recipe pull <name> --from <app> --write

# guide (optional today)
bun run recipe guide <name>

# checks
bun run recipe check <name>                                    # all of the below, in order
bun run validate-recipes <name>
bun run check-coverage <name>
bun run compose <name> --build
bun run compose <name> --through <step-id> --typecheck
bun run compose <name> --host app-router-src --build        # one host only, faster

# clean up composed test apps
rm -rf .compose
```
