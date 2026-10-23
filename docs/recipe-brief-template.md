# Brief — `<name>` recipe

> Copy this file into your issue or PR description (not into the repo).
> Fill it in **before** you build, and keep it up to date while you build.

## 1. Decisions up front

- **New recipe or an option in an existing one?** (see `docs/recipe-format.md` §8) →
- **Thin (1–2 steps) or full?** →
- **Needs another recipe first?** (`requires`, e.g. `prisma`) →
- **Free or pro?** →

## 2. Scope

**In:** what the recipe installs.

**Out:** what it deliberately doesn't do. (Things a beginner needs to *know* but the CLI shouldn't *install* go in the guide.)

## 3. Steps (draft — refine while building)

| # | id | Files | why (1 line) | verify (what the user sees) |
|---|---|---|---|---|
| 1 | | | | |

Ordering constraint: which step imports which?

## 4. Prompts

| id | Question | Default | What changes if "no" |
|---|---|---|---|

## 5. Env vars

| Name | Where the user gets it | Fake example | Only when |
|---|---|---|---|

## 6. Manual steps

Things no CLI can do: create an account/API key, verify a domain, run a migration, set a callback URL.

## 7. Dependencies

| Package | Version tested | Why it's needed |
|---|---|---|

## 8. Break it on purpose

Fill in while building. Copy the **exact** error text.

| What I did | Exact error |
|---|---|
| Removed the API key | |
| Used a wrong key | |
| Sent bad input | |

## 9. Definition of done

- [ ] It worked for real in my build app (real email / real sign-in / real payment in test mode)
- [ ] Section 8 is filled in with exact error messages
- [ ] `validate-recipes <name>` passes
- [ ] `check-coverage <name>` passes
- [ ] `compose <name> --build` passes on every host in `hosts`
- [ ] `compose <name> --through <id> --typecheck` passes for every step
- [ ] Every prompt's "no" path thought through (`docs/troubleshooting.md`)

## 10. After building

- Did the steps feel natural, or did you have to reorder them?
- Could someone rebuild the feature from the step list alone?
- Anything in the format that got in your way? (Tell us — that's how the tooling improves.)
