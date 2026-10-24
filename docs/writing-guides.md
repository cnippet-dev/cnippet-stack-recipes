# Writing the guide (`guide.mdx`)

Each recipe gets a beginner guide on next.cnippet.dev. It teaches the **same steps** the CLI installs.

> **Status:** next.cnippet.dev doesn't render `guide.mdx` and the `<Step>` component doesn't exist yet.
> This page describes how guides will work, so guides written now won't need rewriting.

---

## 1. The one rule

**The guide never contains pasted code.** It shows code with `<Step id="…" />`, which reads that step's files
straight from `files/`. So the guide always shows the code CI tested, and it can't drift.

A short inline snippet (one or two lines inside a sentence, like `` `auth()` ``) is fine.
A code block longer than a few lines is not. Use `<Step>`.

---

## 2. When to write it

1. **Steps** (ids + one line each), before any code.
2. **Code**, built and tested for real. Steps may change here.
3. **`why` and `verify`** in `recipe.config.ts`.
4. **The guide words, last.** By now the code is stable, so you won't rewrite them.

Keep the "break it on purpose" notes you made while building (exact error messages). They're the most useful part of the guide.

---

## 3. What `<Step>` shows

`<Step id="client" />` renders, in this order:

1. the step's `title`
2. its `manualSteps` marked `before`
3. every file of the step, with its target path
4. the `why`
5. the `verify` box
6. its `manualSteps` marked `after`

You write the words **around** it: what the concept is, why it's done this way, what to watch out for.

---

## 4. Shape of a guide

`bun run recipe guide <name>` writes this shape for you, with TODOs where the words go.

```mdx
---
title: Add authentication to Next.js with Auth.js v5
description: GitHub, Google and email/password sign-in, roles and protected routes.
recipe: authjs
---

## What you'll build
A screenshot, then 3–5 bullets of what works at the end.

## Before you start
What the reader needs: Node version, a database, accounts to create.
Mention the shortcut: `npx cnippet-stack init authjs` installs all of this.

## How it works
The 2-minute idea behind the library. One diagram is worth more than three paragraphs.

## Step 1: Add the auth tables
<Step id="schema-append" />
Plain explanation of what was just added and why.

## Step 2: …
<Step id="auth-config" />

## When things go wrong
One entry per error from your notes: the exact message, why it happens, the fix.

## Next steps
Related recipes and guides.
```

- **One `##` section per step, in step order.** Each section has exactly one `<Step>`.
- Every step id appears in the guide, and nothing else uses `<Step>`.
- Frontmatter, components (`Callout` and others) and MDX escaping follow the **cnippet-mdx** convention used by every cnippet.dev site.

---

## 5. Writing style

- Write for someone who has built a Next.js page but never used this library.
- Short sentences. Explain a word the first time you use it.
- Say **why** before **how**.
- Show the thing working: what they should see after each step (that's `verify`, so you can build on it).
- No "simply", "just", "easy". If it were easy, they wouldn't need a guide.

---

## 6. Free and pro

`tier` in `recipe.config.ts` decides both. A pro guide is only shown to readers with a Stack Pro licence,
the same licence that unlocks pro recipes in the CLI. Pro guides live in the private pro repo, next to their code.
