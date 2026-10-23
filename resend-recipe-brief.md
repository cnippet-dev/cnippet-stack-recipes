# Brief — `resend` recipe

> **Guide:** #35, "Resend Email Integration" · Category: Email · Tier: **Free**
> **What this is:** the planning document for the Resend recipe. It says *what to build* and *why*, not *how* — the code comes from building and running it, not from this file.
> **Lifespan:** throwaway. Once the recipe is built and tested, this file has done its job. It is **not** the guide and must never be published.

---

## 1. Decisions made up front

Three questions decided before any code.

### Does it install files? → **Yes. Code-first lane.**

A client module, a send helper, a server action, a form. All real files. So: build the code first, write the guide last.

### Thin or full? → **Full.**

Six steps across four or five files. (A *thin* recipe is one or two config files — Biome, TS strict mode. Those get `thin: true` and skip learn mode.)

### Does it have variants? → **No. And that's the right answer.**

The obvious candidate was "plain HTML strings vs React Email components." Run the three-tier test on it:

| Tier | Test | React Email? |
|---|---|---|
| 1 | Only an env **value** differs | No |
| 2 | Same files, a few lines differ | Partly — but… |
| 3 | Different files, different deps, different mental model | **Yes** |

React Email adds two dependencies (`@react-email/components`, `@react-email/render`), introduces a whole new `emails/` folder that doesn't exist in the other path, and brings its own preview server. That's a different mental model, not a few lines.

It's also **guide #39 in its own right**, with its own Free tier.

**Decision: `resend` ships plain-HTML only. React Email becomes a separate recipe later, with `requires: ["resend"]`.** That tests the dependency mechanism, which we also need to prove.

> **Note for whoever builds the second recipe:** this is the correct outcome of the three-tier test, not a limitation. Forcing a variant here would teach the wrong lesson. When you do want to test the variant mechanism, use **`prisma`** — Postgres vs Neon is a genuine tier 2 (same files, the adapter import and `DIRECT_URL` handling differ).

---

## 2. Scope

### In

- A Resend client that fails fast when the API key is missing
- A typed send helper that turns Resend's errors into something usable
- A Zod-validated server action so the key never reaches the browser
- An optional starter form (prompted)
- An optional webhook receiver for delivery events, with signature verification (prompted)

### Out — belongs in the guide, not the recipe

- **Domain verification** — a manual step on resend.com. The CLI can't click through a dashboard. Becomes a `manual` entry.
- **Attachments** — a few extra properties on the send call. Prose, not a file.
- **Batch sending / audiences / broadcasts** — a different product surface. Out of scope entirely.
- **React Email templates** — separate recipe (see §1).

---

## 3. Prompts

Two. Both data-driven, both used to gate optional steps.

| Name | Type | Question | Default |
|---|---|---|---|
| `starterUi` | confirm | Generate a starter email form? | yes |
| `webhooks` | confirm | Add a webhook route for delivery events? | no |

Keep it to two. Every prompt is friction, and detection should answer anything it can.

---

## 4. Environment variables

| Name | Purpose | Notes |
|---|---|---|
| `RESEND_API_KEY` | Auth | Example: `re_AbC123...`. Never `generate` — comes from their dashboard. |
| `EMAIL_FROM` | Sender address | Example: `onboarding@resend.dev`. **This is the one people get wrong** — see §8. |
| `RESEND_WEBHOOK_SECRET` | Webhook signature | Only when `webhooks` is true. Svix-format signing secret. |

---

## 5. Files and what each one is responsible for

Paths assume `src/`; the recipe declares targets with `{{srcDir}}`.

| File | Responsibility |
|---|---|
| `lib/email/resend.ts` | Construct one shared Resend client. Throw at import time if `RESEND_API_KEY` is missing. Nothing else — no sending logic here. |
| `lib/email/send.ts` | One typed function per email kind (start with `sendWelcome`). Owns the `from` address, the subject, and the HTML body. Normalises Resend's error shape into a discriminated result the caller can switch on. |
| `lib/validations/email.ts` | Zod schema for the form input — a valid email address and a name. Nothing Resend-specific. |
| `lib/actions/email.ts` | `"use server"`. Parses input with the Zod schema, calls the send helper, returns `{ ok: true, id }` or `{ ok: false, error }`. **Never throws to the client.** |
| `components/email-form.tsx` | Client component. Calls the action, shows pending / success / error states. **Only when `starterUi` is true.** |
| `app/api/webhooks/resend/route.ts` | Verifies the Svix signature against the raw body, then handles `email.delivered`, `email.bounced`, `email.complained`. Logs for now — the user wires their own persistence. **Only when `webhooks` is true.** |

### Two things to get right

**Read the raw body in the webhook.** Use `await req.text()`, not `await req.json()`. Re-serialising the body changes the bytes and the signature check fails with no useful message. This is the same trap as the Razorpay webhook in `apps/payments`.

**Throw at import time in the client, not at send time.** A client that constructs fine and fails on first send produces a 401 in production that reads like a Resend outage. Failing at boot means the build catches it.

---

## 6. Steps (draft — refine while building)

Six steps. Each must have a `why` (1–3 sentences, prints in a terminal) and a `verify` (something observable).

| # | id | title | why (draft) | verify (draft) |
|---|---|---|---|---|
| 1 | `client` | Create the Resend client | One shared instance, not one per request. It throws at import if the key is missing, so a misconfiguration fails at boot rather than silently at send time. | Dev server still starts. Import `resend` anywhere — no type errors. |
| 2 | `send-helper` | Add a typed send function | Keeps the `from` address and subject in one place, and turns Resend's error shape into something you can branch on instead of a raw throw. | Call `sendWelcome()` from a server component — you get an id back. |
| 3 | `validation` | Add the input schema | Validate on the server, always. A client-side check is a convenience, not a guard. | Pass a malformed address — the schema rejects it. |
| 4 | `server-action` | Wire the server action | Sending must stay on the server; the API key must never reach the browser. A server action keeps the call next to the form that triggers it. | Call the action from a server component with a bad address — you get `{ ok: false }`, not an exception. |
| 5 | `starter-ui` | Add the email form | Proves the whole path end to end, and gives you something to delete later. | Submit the form. **Check your inbox.** The email arrives within a few seconds. |
| 6 | `webhook` | Receive delivery events | Resend tells you what happened *after* the send — delivered, bounced, marked spam. Without this you're blind to everything past the API call. | Send a test event from the Resend dashboard — your route logs it and returns 200. |

### Ordering constraint

Step 4 imports what steps 2 and 3 create. Step 5 imports step 4. **Every stopping point must still typecheck** — so this order is forced, not stylistic. If you reorder, check that each prefix still builds.

---

## 7. Manual steps

Things no CLI can do. These print at the end of the install and get their own section in the guide.

1. **Create an API key** at `resend.com/api-keys` and put it in `RESEND_API_KEY`.
2. **Either** verify a sending domain at `resend.com/domains` **or** use `onboarding@resend.dev` for local development. See §8 — this is the step everyone trips on.
3. *(webhooks only)* **Add an endpoint** at `resend.com/webhooks` pointing at `https://yourdomain.com/api/webhooks/resend`, and copy the signing secret into `RESEND_WEBHOOK_SECRET`.

---

## 8. Things to find out while building

**This is the most valuable section of the brief.** Every answer here becomes a paragraph in the guide's "When things go wrong." Fill it in as you go — do not skip it.

| Question | Why it matters | Answer (fill in) |
|---|---|---|
| What exactly does Resend return when `from` is an unverified domain? | Expected: a 403 whose message doesn't obviously say "verify your domain." This is the #1 first-run failure. Capture the **verbatim** string. | |
| Does `onboarding@resend.dev` work for any recipient, or only your own account email? | If it's account-only, the manual step must say so — otherwise people think the recipe is broken. | |
| What's the error when `RESEND_API_KEY` is wrong vs missing? | Different failure modes need different advice. | |
| Does the Resend SDK throw, or return `{ data, error }`? | Decides the whole shape of `send.ts`. **Check the current SDK — don't assume.** | |
| What's the exact Svix header name and verification call? | Webhook signature verification is easy to get subtly wrong. | |
| Does the webhook route need `export const runtime = "nodejs"`? | Some crypto operations don't work on edge. | |
| Does anything break in a no-`src/` project? | The recipe must work in both layouts. | |

---

## 9. Dependencies

```
dependencies:  resend@^<current>
devDependencies: (none)
```

*(webhooks only)* — `svix` for signature verification, **if** the Resend SDK doesn't expose a verify helper of its own. **Check this while building.** Prefer the SDK's own helper if it exists — one less dependency.

**Declare these explicitly in `recipe.config.ts`.** Do not derive them from the test app's `package.json` — that file also contains `next`, `react`, `tailwindcss` and everything else, and the recipe needs none of those.

---

## 10. What NOT to build

- **No `components/ui/*`.** Buttons and inputs come from the `@cnippet` registry via `shadcn add`. If the form needs a Button, the recipe declares it as a registry component, it does not ship a copy. Shipping one means every recipe carries a stale fork of Cnippet UI.
- **No database.** No `Email` model, no send log. Someone will want it; it's a different recipe.
- **No queue or retry layer.** Out of scope. Guide #142 (QStash) covers it.
- **No `.md` file inside the recipe.** The guide lives on `next.cnippet.dev`. *(`apps/prisma` currently has a guide `.md` committed inside it — don't repeat that.)*

---

## 11. Definition of done

The recipe is finished when all of these are true:

- [ ] A real email, sent by the form, arrived in a real inbox
- [ ] Every question in §8 has an answer written down
- [ ] `recipe.config.ts` exists, and every `source` path in it points at a file that exists
- [ ] Every file the recipe ships is claimed by exactly one step
- [ ] Every step has a `why` and a `verify`
- [ ] Step ids are descriptive slugs (`client`, `send-helper`), never `step-1`
- [ ] Installing it into a **fresh** Next.js app builds clean — both with and without `src/`
- [ ] Stopping after each step still typechecks
- [ ] Both prompt paths were tested: `starterUi` on/off, `webhooks` on/off
- [ ] `EMAIL_FROM` misconfigured produces an error you've documented, not a mystery

---

## 12. After this — do not skip

Once the recipe is built, **stop and judge the model before building any tooling.** Three questions:

1. **Did the six steps feel natural, or did you force the code into them?** If you kept wanting to split or merge steps, the step granularity rule needs adjusting.
2. **Could a script find every shipped file using only `recipe.config.ts`?** If you'd still need to read the folder to know what's in the recipe, the config is missing a field.
3. **Could someone rebuild this recipe from the step list alone?** If not, the `why` fields are too thin — and the guide will be too.

Answer those three and you'll know whether to build `recipe:dev`, `validate-recipes` and `recipe:sync`, or whether to change the model first.
