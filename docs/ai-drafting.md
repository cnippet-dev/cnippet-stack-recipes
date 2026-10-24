# Drafting the words with AI (optional)

The code and the step list are yours. An AI can draft the **words** around them: each step's `why` and
`verify`, and the guide text. You always edit what it writes before the PR.

Paste the prompt below into your AI tool, from the root of this repo, once `bun run recipe check <name>`
passes except for TODOs.

```text
Read recipes/<name>/recipe.config.ts, every file under recipes/<name>/files/, docs/recipe-format.md,
docs/writing-guides.md and my error notes below. Then draft, without changing any code, file list,
step id or step order:

1. For each step: `why` (1–3 short sentences: why this step exists) and `verify` (one thing the user
   can see when it works). Replace only fields that say TODO.
2. For each env var with a TODO description: what it is and where to get it, plus a fake `example`.
3. recipes/<name>/guide.mdx (run `bun run recipe guide <name>` first if it doesn't exist): replace
   each {/* TODO */} with words. Follow the cnippet-mdx convention. Never paste code: the <Step>
   tags show it. "When things go wrong" uses only the errors from my notes, quoted exactly.

Write for someone who has built a Next.js page but never used this library. Short sentences.
No "simply", "just" or "easy". Don't invent library APIs; if unsure, leave a TODO.

My error notes:
<paste the exact error messages you hit while building>
```

Then read every line it wrote, fix what's wrong, and run `bun run recipe check <name>` again.
