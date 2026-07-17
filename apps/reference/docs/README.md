# Stack recipes — getting started

This folder documents how to add a new Next.js app to the `cnippet-stack-recipes` monorepo and wire it up with **Cnippet UI** (`@cnippet/ui`).

The `reference` app in this directory is the working example. Follow the guides below to reproduce the same setup for another app.

## Guides

| Guide | What it covers |
| --- | --- |
| [Create a Next.js app](./create-next-app.md) | Scaffold a new app under `apps/` inside the turborepo |
| [Add Cnippet UI](./add-cnippet-ui.md) | Install all `@cnippet/ui` components via the shadcn CLI |

## Quick start

From the monorepo root:

```bash
cd apps
bun create next-app@latest
```

Then, inside your new app:

```bash
cd <your-app-name>
bunx --bun shadcn@latest add @cnippet/ui
```

Run the dev server from the monorepo root:

```bash
bun run dev
```

Or from the app directory:

```bash
bun dev
```

## Prerequisites

- [Bun](https://bun.sh) 1.3+ (this repo’s package manager)
- Node.js 18+

## Reference app structure

After setup, your app should look similar to `reference`:

```
apps/<your-app>/
├── app/
│   ├── globals.css      # Tailwind + Cnippet theme variables
│   ├── layout.tsx
│   └── page.tsx
├── components/
│   └── ui/              # Cnippet UI components (copied in by shadcn)
├── hooks/
├── lib/
│   └── utils.ts
├── components.json      # shadcn + @cnippet registry config
└── package.json
```
