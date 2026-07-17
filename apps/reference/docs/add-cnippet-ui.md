# Add Cnippet UI to your app

Cnippet UI is distributed through the [shadcn](https://ui.shadcn.com) CLI using a custom registry. The `@cnippet/ui` bundle installs the full component set into your project (same as in the `reference` app).

## Prerequisites

- A Next.js app under `apps/` (see [Create a Next.js app](./create-next-app.md))
- Bun installed

## 1. Go to your app directory

```bash
cd apps/<your-app-name>
```

## 2. Add a `components.json`

Your app isn't registered with shadcn yet (there's no `components.json`), so the `shadcn` CLI has nothing to read the `@cnippet` registry from. Create `components.json` manually in your app root before running the add command:

```json
{
  "$schema": "https://ui.shadcn.com/schema.json",
  "aliases": {
    "components": "@/components",
    "hooks": "@/hooks",
    "lib": "@/lib",
    "ui": "@/components/ui",
    "utils": "@/lib/utils"
  },
  "iconLibrary": "lucide",
  "menuAccent": "subtle",
  "menuColor": "default",
  "registries": {
    "@cnippet": "https://ui.cnippet.dev/r/{name}.json"
  },
  "rsc": true,
  "rtl": false,
  "style": "base-nova",
  "tailwind": {
    "baseColor": "neutral",
    "config": "",
    "css": "app/globals.css",
    "cssVariables": true,
    "prefix": ""
  },
  "tsx": true
}
```

This matches the config used in `apps/reference/components.json` — copy that file directly if you'd rather not type it out. Adjust `tailwind.css` if your global stylesheet lives somewhere other than `app/globals.css`.

## 3. Add the full Cnippet UI bundle

**Recommended — use Bun:**

```bash
bunx --bun shadcn@latest add @cnippet/ui
```

This command will:

1. Check the `@cnippet` registry
2. Install required npm dependencies (`@base-ui/react`, `lucide-react`, `clsx`, etc.)
3. Copy component files into `components/ui/`
4. Add `hooks/use-media-query.ts` and `lib/utils.ts`
5. Create or update `components.json`
6. Update `app/globals.css` with theme variables

Expected output ends with something like:

```
✔ Checking registry.
✔ Installing dependencies.
✔ Created 59 files:
  - components\ui\accordion.tsx
  - components\ui\alert.tsx
  ...
✔ Updating app\globals.css
```

## 4. Confirm `components.json`

After install, `components.json` should include the Cnippet registry:

```json
{
  "registries": {
    "@cnippet": "https://ui.cnippet.dev/r/{name}.json"
  },
  "style": "base-nova",
  "tailwind": {
    "css": "app/globals.css",
    "cssVariables": true
  }
}
```

See `apps/reference/components.json` for the full reference configuration.

## 5. Use a component

Import from the local `components/ui` path (components are copied into your app, not imported from an npm package):

```tsx
import { Button } from "@/components/ui/button";

export default function Page() {
  return <Button>Click me</Button>;
}
```

## 6. Add individual components later

To add or update a single component from the Cnippet registry:

```bash
bunx --bun shadcn@latest add @cnippet/button
bunx --bun shadcn@latest add @cnippet/dialog
```

Replace `button` / `dialog` with any component name from the registry.

## Package manager alternatives

| Tool | Command |
| --- | --- |
| **Bun (recommended)** | `bunx --bun shadcn@latest add @cnippet/ui` |
| pnpm | `pnpm dlx shadcn@latest add @cnippet/ui` |
| npm | `npx shadcn@latest add @cnippet/ui` |

> **Tip:** If `pnpm dlx` appears to hang at “resolved / reused”, cancel and use the Bun command instead.

## What gets installed

The `@cnippet/ui` bundle adds roughly 59 files, including:

- `components/ui/*` — accordion, alert, button, card, dialog, form, input, select, sidebar, table, toast, and more
- `hooks/use-media-query.ts`
- `lib/utils.ts` — `cn()` helper for Tailwind class merging

Dependencies added to `package.json` typically include:

- `@base-ui/react`
- `clsx`, `tailwind-merge`
- `lucide-react`
- `embla-carousel-react`, `react-day-picker`, `recharts` (used by specific components)

## Troubleshooting

**shadcn can’t find the registry**

Ensure `components.json` has the `@cnippet` registry URL. Re-run the add command from your app root.

**Styles look wrong**

Check that `app/globals.css` was updated and that your root layout imports it:

```tsx
import "./globals.css";
```

**TypeScript path aliases**

shadcn sets up `@/components`, `@/lib`, etc. Confirm `tsconfig.json` has:

```json
{
  "compilerOptions": {
    "paths": {
      "@/*": ["./*"]
    }
  }
}
```

## Next steps

- Browse components in `apps/reference/components/ui/` for usage patterns
- Run `bun dev` and build your UI with the installed components
- Return to the [docs index](./README.md)
