# better-auth demo

> **This is a demo. The recipe source of truth is `recipes/better-auth/`. Changes here do not ship.**
>
> To change what the recipe installs, edit `recipes/better-auth/recipe.config.ts` and `recipes/better-auth/files/`.

A running Better Auth app: email/password and GitHub/Google sign-in, two-factor auth, linked accounts, an admin-only dashboard and route protection in `proxy.ts`.

## Run it

```bash
bun install
bunx prisma migrate dev
bun run dev
```

Open http://localhost:3000.

## .env variables

All of these are required. `lib/config/env.ts` validates them at startup.

```bash
DATABASE_URL="postgresql://user:password@localhost:5432/mydb"
NEXT_PUBLIC_APP_URL="http://localhost:3000"

BETTER_AUTH_SECRET="random 32+ character string"
BETTER_AUTH_URL="http://localhost:3000"
NEXT_PUBLIC_BETTER_AUTH_URL="http://localhost:3000"

GOOGLE_CLIENT_ID="from console.cloud.google.com (OAuth)"
GOOGLE_CLIENT_SECRET="from console.cloud.google.com (OAuth)"

GITHUB_CLIENT_ID="from github.com/settings/developers (OAuth app)"
GITHUB_CLIENT_SECRET="from github.com/settings/developers (OAuth app)"
```
