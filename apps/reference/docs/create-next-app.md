# Create a Next.js app in the monorepo

This guide walks through creating a new Next.js app under `apps/`, matching how the `reference` app was scaffolded.

## 1. Go to the apps directory

From the monorepo root (`cnippet-stack-recipes`):

```bash
cd apps
```

## 2. Scaffold with create-next-app

Use Bun to create the app (recommended for this repo):

```bash
bun create next-app@latest
```

Answer the prompts:

| Prompt | Recommended answer |
| --- | --- |
| What is your project named? | Your app name, e.g. `my-app` |
| Would you like to use the recommended Next.js defaults? | **No, customize settings** |
| Would you like to use TypeScript? | **Yes** |
| Which linter would you like to use? | **None** |
| Would you like to use React Compiler? | **No** |
| Would you like to use Tailwind CSS? | **Yes** |
| Would you like your code inside a `src/` directory? | **No** |
| Would you like to use App Router? (recommended) | **Yes** |
| Would you like to customize the import alias (`@/*` by default)? | **No** |
| Would you like to include AGENTS.md to guide coding agents to write up-to-date Next.js code? | **Yes** |

This creates `apps/<your-app-name>/` with:

- Next.js App Router
- TypeScript
- Tailwind CSS v4

The app is automatically picked up by the monorepo workspace (`apps/*` in the root `package.json`).

## 3. Verify the app was created

```bash
cd <your-app-name>
ls
```

You should see at least:

```
app/
package.json
tsconfig.json
next.config.ts
postcss.config.mjs
```

## 4. Install dependencies (if needed)

Dependencies are usually installed during `create-next-app`. If you need to reinstall from the monorepo root:

```bash
cd ../..   # back to monorepo root
bun install
```

## 5. Run the dev server

From the monorepo root:

```bash
bun run dev
```

Turbo runs `dev` for all apps. To run only your app:

```bash
cd apps/<your-app-name>
bun dev
```

Open [http://localhost:3000](http://localhost:3000) (or the port shown in the terminal).

## 6. Add Cnippet UI

Your app is ready for UI components. Continue with [Add Cnippet UI](./add-cnippet-ui.md).

## Notes

- **Package manager:** This monorepo uses Bun (`devEngines.packageManager` in the root `package.json`). Prefer `bun` over `npm`, `yarn`, or `pnpm` for consistency.
- **Turborepo:** Build, lint, and dev tasks are orchestrated by Turbo. New apps under `apps/` are included automatically.
- **Naming:** Use lowercase kebab-case for app folder names (e.g. `my-dashboard`, `admin`).
