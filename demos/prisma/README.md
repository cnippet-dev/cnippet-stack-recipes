# prisma demo

> **This is a demo. The recipe source of truth is `recipes/prisma/`. Changes here do not ship.**
>
> To change what the recipe installs, edit `recipes/prisma/recipe.config.ts` and `recipes/prisma/files/`.

A running Prisma 7 CRUD app: route handlers, cached server actions and four cards to create, read, update and delete posts.

## Run it

```bash
bun install
bunx prisma migrate dev
bun run dev
```

Open http://localhost:3000.

## .env variables

```bash
DATABASE_URL="postgresql://user:password@localhost:5432/mydb"
API_URL="http://localhost:3000"   # base URL the server actions call
```
