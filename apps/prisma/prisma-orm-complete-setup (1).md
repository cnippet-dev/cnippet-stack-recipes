# Prisma ORM Complete Setup (Prisma 7 + Next.js 16)

> **Guide #11 — Implementation & Learning Guide**
> Stack: **Prisma ORM 7 + PostgreSQL + Next.js 16 (App Router) + TypeScript**
> Goal: Go from empty project to a fully modeled, migrated, seeded, and query-optimized database layer — understanding schema design, all three relation types, CRUD, the Client Extensions that replaced middleware, seeding, Prisma Studio, and connection pooling.

---

## 0. What You'll Build (Running Example)

A blog domain reused across the whole guide series — `User`, `Profile`, `Post`, `Category`, `Comment`, `Tag` — chosen because it naturally contains **all three relation types**:

```
User  1───1  Profile           (one-to-one)
User  1───N  Post              (one-to-many)
Post  N───M  Tag               (many-to-many)
Post  1───N  Comment           (one-to-many)
Post  N───1  Category          (many-to-one)
```

By the end you'll have this schema modeled, migrated, seeded with realistic data, and queried with type-safe CRUD — the data layer that Guides #1/#2 (auth) and #21 (REST API) build on top of.

> **A heads-up on versions.** This guide targets **Prisma 7** (current in 2026), which is a significant departure from the Prisma 5/6 tutorials still all over the web. The big three changes: the Rust query engine is gone (replaced by TS + WASM), **driver adapters are now mandatory**, and **`$use` middleware was removed** in favor of Client Extensions. Where older guides in this series show the simpler v6-style `datasource { url = env(...) }`, this guide teaches the current v7 way and flags the differences. If you're on v6, the concepts all transfer — the setup boilerplate is what changed.

### Learning Checklist

- [ ] 1. The Prisma mental model (schema → client → migrations)
- [ ] 2. Setup: install, `prisma.config.ts`, driver adapter, the generated client
- [ ] 3. The Prisma client singleton (Next.js-specific, non-negotiable)
- [ ] 4. Schema design: models, field types, attributes, enums
- [ ] 5. Relations — 1:1, 1:N, M:N (implicit AND explicit)
- [ ] 6. Migrations: dev, deploy, reset, and how they actually work
- [ ] 7. CRUD: create, read, update, delete + upsert
- [ ] 8. Advanced queries: filtering, relations, aggregation, transactions
- [ ] 9. Client Extensions (the replacement for middleware)
- [ ] 10. Seeding with Faker
- [ ] 11. Prisma Studio
- [ ] 12. Connection pooling (the serverless gotcha)
- [ ] 13. N+1 prevention & query performance
- [ ] 14. Production checklist

---

## 1. The Prisma Mental Model

Three artifacts, one loop:

```
   schema.prisma          →   Prisma Client        →   migrations/
   (your data model,          (generated, fully        (SQL history that
    the single source          type-safe query          brings any DB to
    of truth)                  API for that model)       match the schema)
        │                            ▲                         │
        └────── prisma generate ─────┘                         │
        └────── prisma migrate dev ───────────────────────────┘
```

- **You edit `schema.prisma`** — models, fields, relations. This is the source of truth.
- **`prisma generate`** reads the schema and writes a **typed client** — `prisma.user.findMany()` etc., with autocomplete and compile-time safety for every field and relation.
- **`prisma migrate`** diffs the schema against the database and generates SQL migration files to reconcile them.

The payoff: your database shape, your TypeScript types, and your query API can never silently drift apart — change the schema, regenerate, and the compiler flags every place that no longer fits.

---

## 2. Setup (Prisma 7)

Assumes a Next.js 16 + TypeScript project and a running Postgres (see Guide #21 §2.3 for the Docker Compose Postgres setup).

### 2.1 Install

```bash
npm install prisma tsx --save-dev
npm install @prisma/client @prisma/adapter-pg
```

- `@prisma/adapter-pg` — the **driver adapter** for PostgreSQL. In Prisma 7 this is **mandatory** (the Rust engine that used to connect directly is gone). Other databases have their own: `@prisma/adapter-libsql` (Turso), `@prisma/adapter-planetscale`, etc.
- `tsx` — runs TypeScript files directly (for the seed script).

### 2.2 Initialize

```bash
npx prisma init --datasource-provider postgresql
```

This creates `prisma/schema.prisma` and a `.env`. In Prisma 7, config also lives in a `prisma.config.ts` at the project root.

### 2.3 `prisma.config.ts` and env loading

> **v7 change:** environment variables are **not auto-loaded** anymore — you load them yourself (e.g. with `dotenv`). Datasource `url` is configured via the config file / adapter rather than only inline.

```bash
npm install --save-dev dotenv
```

```ts
// prisma.config.ts (project root)
import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    seed: "tsx prisma/seed.ts",   // v7 removed auto-seeding — declare it here
  },
});
```

```env
# .env
DATABASE_URL="postgresql://dev:dev@localhost:5432/blog?schema=public"
```

### 2.4 The schema header (generator + datasource)

```prisma
// prisma/schema.prisma
generator client {
  provider = "prisma-client"          // v7: was "prisma-client-js"
  output   = "../src/generated/prisma" // v7: output is REQUIRED, no longer in node_modules
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}
```

Two v7-specific things to internalize:
1. **`provider = "prisma-client"`** (not `prisma-client-js`) — the new generator.
2. **`output` is required** and points *inside your source tree*, not `node_modules`. You import from that path (below). This makes the generated client explicit and bundler-friendly.

### 2.5 The driver-adapter client

Because the engine is gone, you wire the client to the adapter yourself:

```ts
// src/lib/db.ts  — generated types + driver adapter + Next.js singleton
import { PrismaClient } from "@/generated/prisma";  // ← your generated output path
import { PrismaPg } from "@prisma/adapter-pg";

const connectionString = process.env.DATABASE_URL!;

function makeClient() {
  const adapter = new PrismaPg({ connectionString });
  return new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === "development" ? ["query", "warn", "error"] : ["error"],
  });
}

// --- Next.js singleton (see §3 for WHY) ---
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };
export const prisma = globalForPrisma.prisma ?? makeClient();
if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
```

### 2.6 Generate

```bash
npx prisma generate
```

Run this after every schema change (migrate runs it automatically). Now `prisma.` is fully typed.

> **v6 vs v7 quick map:** if a tutorial says `import { PrismaClient } from "@prisma/client"`, no adapter, and `generator client { provider = "prisma-client-js" }` — that's v6. The concepts (models, relations, queries) are identical; only §2.1–2.5 boilerplate differs.

---

## 3. The Client Singleton (Next.js Non-Negotiable)

Already in §2.5, but it deserves its own explanation because skipping it is the #1 Prisma-in-Next.js production incident.

**The problem:** Next.js hot-reloads modules in dev on every file save. A module-level `new PrismaClient()` would create a *new* client (and a new connection pool) on every reload, quickly exhausting Postgres's connection limit (`FATAL: too many connections`).

**The fix:** stash the client on `globalThis`, which survives hot reloads:

```ts
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };
export const prisma = globalForPrisma.prisma ?? makeClient();
if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
```

In production there's no hot reload, so the guard is dev-only. **Always import `prisma` from this one module** — never `new PrismaClient()` anywhere else. (Serverless adds a second, different connection problem — that's §12.)

---

## 4. Schema Design

### 4.1 A model, annotated

```prisma
model Post {
  id        String   @id @default(cuid())   // primary key; cuid() = collision-resistant, URL-safe
  title     String   @db.VarChar(200)       // native DB type override
  slug      String   @unique                // unique constraint
  content   String                          // maps to TEXT
  published  Boolean  @default(false)
  views     Int      @default(0)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt             // auto-set on every update
  metadata  Json?                           // nullable JSON column

  @@index([published, createdAt])           // composite index for common queries
  @@map("posts")                            // actual table name (snake_case convention)
}
```

### 4.2 Field types & the attributes that matter

| Prisma type | Postgres | Notes |
|---|---|---|
| `String` | `text` | `@db.VarChar(n)` to cap length |
| `Int` / `BigInt` | `integer` / `bigint` | |
| `Float` / `Decimal` | `double` / `decimal` | **Use `Decimal` for money** — never `Float` |
| `Boolean` | `boolean` | |
| `DateTime` | `timestamp` | `@default(now())`, `@updatedAt` |
| `Json` | `jsonb` | flexible/unstructured data |
| `Bytes` | `bytea` | |
| enum | native `enum` | see below |

Field-level attributes worth knowing: `@id`, `@unique`, `@default(...)`, `@updatedAt`, `@map("col_name")`, `@db.X` (native type), `@ignore`. Block-level: `@@id([...])` (composite PK), `@@unique([...])` (composite unique), `@@index([...])`, `@@map("table")`.

### 4.3 ID strategies (pick deliberately)

```prisma
id String @id @default(cuid())    // ✅ default choice: sortable-ish, URL-safe, no enumeration
id String @id @default(uuid())    // standard UUID v4 (random)
id Int    @id @default(autoincrement())  // simple, but exposes row counts & is enumerable
```

Prefer `cuid()`/`uuid()` for anything user-facing — auto-increment integers leak how many records you have and let attackers guess `/posts/1`, `/posts/2`, …

### 4.4 Enums

```prisma
enum Role {
  USER
  ADMIN
  EDITOR
}

model User {
  id   String @id @default(cuid())
  role Role   @default(USER)
}
```

Enums become native Postgres enum types and fully typed TS unions — a clean way to model fixed sets.

---
## 5. Relations (The Part People Get Wrong)

Every relation has two sides: a **relation field** (a virtual field Prisma uses in queries — no column) and a **scalar foreign-key field** (the actual column). Getting these straight is the whole game.

### 5.1 One-to-many (1:N) — the most common

A `User` has many `Post`s; each `Post` belongs to one `User`.

```prisma
model User {
  id    String @id @default(cuid())
  posts Post[]                       // relation field (the "many" side) — no column
}

model Post {
  id       String @id @default(cuid())
  title    String
  author   User   @relation(fields: [authorId], references: [id], onDelete: Cascade)
  authorId String                    // scalar FK — THIS is the real column
}
```

**Read it as:** `Post.author` links via `Post.authorId` → `User.id`. The `@relation` attribute always lives on the side that holds the foreign key (the "belongs to" side). `onDelete: Cascade` = deleting a user deletes their posts (other options: `SetNull`, `Restrict`, `NoAction`).

### 5.2 One-to-one (1:1)

A `User` has one `Profile`. Identical to 1:N but the FK side is marked `@unique`:

```prisma
model User {
  id      String   @id @default(cuid())
  profile Profile?                     // optional relation field
}

model Profile {
  id     String @id @default(cuid())
  bio    String?
  user   User   @relation(fields: [userId], references: [id], onDelete: Cascade)
  userId String @unique                // @unique is what makes it 1:1 (not 1:N)
}
```

The `@unique` on `userId` is the ONLY structural difference from 1:N — it stops a second Profile pointing at the same User.

### 5.3 Many-to-many (M:N) — two ways

**Implicit (Prisma manages the join table):** simplest when the relationship carries no extra data.

```prisma
model Post {
  id   String @id @default(cuid())
  tags Tag[]                           // just arrays on both sides
}

model Tag {
  id    String @id @default(cuid())
  name  String @unique
  posts Post[]
}
```

Prisma silently creates and maintains a `_PostToTag` join table. You query naturally: `post.tags`, `tag.posts`. You never touch the join table.

**Explicit (you model the join table):** required when the relationship itself has attributes (e.g. *when* a tag was added, *who* added it).

```prisma
model Post {
  id   String    @id @default(cuid())
  tags PostTag[]
}

model Tag {
  id    String    @id @default(cuid())
  name  String    @unique
  posts PostTag[]
}

model PostTag {                        // the join model YOU own
  post      Post     @relation(fields: [postId], references: [id], onDelete: Cascade)
  postId    String
  tag       Tag      @relation(fields: [tagId], references: [id], onDelete: Cascade)
  tagId     String
  assignedAt DateTime @default(now())  // ← the extra data that forces "explicit"
  assignedBy String?

  @@id([postId, tagId])                // composite PK prevents duplicate pairings
}
```

**The decision rule:** no metadata on the link → implicit (less code). Any metadata, or you need to query the links directly → explicit. Migrating implicit → explicit later is painful, so if there's *any* chance you'll want "date added," start explicit.

### 5.4 Self-relations (bonus — comments replying to comments)

```prisma
model Comment {
  id        String    @id @default(cuid())
  body      String
  parent    Comment?  @relation("Replies", fields: [parentId], references: [id])
  parentId  String?
  replies   Comment[] @relation("Replies")
}
```

The named `@relation("Replies")` disambiguates the two directions of the same self-link.

---

## 6. Migrations

### 6.1 The commands and when to use each

```bash
# DEV: create + apply a migration from schema changes, regenerate client
npx prisma migrate dev --name add_posts

# PROD/CI: apply existing migration files, never generate new ones
npx prisma migrate deploy

# Nuke and rebuild the dev DB from scratch (⚠️ deletes all data), re-runs seed
npx prisma migrate reset

# Preview the SQL a change would produce, without applying
npx prisma migrate dev --create-only

# Push schema to DB WITHOUT migration files (prototyping only — no history!)
npx prisma db push
```

### 6.2 How it actually works (so you can debug it)

`migrate dev` diffs your `schema.prisma` against a shadow database, writes a timestamped SQL file under `prisma/migrations/`, applies it, and records it in a `_prisma_migrations` table in your DB. That table is how Prisma knows which migrations have run.

**The golden rules:**
- **`migrate dev` in development, `migrate deploy` in production/CI.** Never run `migrate dev` against prod — it can prompt, reset, or generate — chaos in CI.
- **Commit your `prisma/migrations/` folder.** It's the version history of your database; teammates and CI replay it.
- **`db push` has no history** — fine for a throwaway spike, dangerous anywhere real. Use migrations for anything you'll keep.
- Never hand-edit an already-applied migration. To change course, create a new migration.

> Migration *strategy* — rollbacks, data migrations, CI/CD pipelines, `expand-and-contract` for zero-downtime column changes — is Guide #18. This section is the mechanics you need daily.

---

## 7. CRUD Operations

All fully typed. Import `prisma` from your singleton (§3).

### 7.1 Create

```ts
// single
const post = await prisma.post.create({
  data: { title: "Hello", slug: "hello", content: "…", authorId },
});

// nested create (create a post AND its tags in one call)
const post2 = await prisma.post.create({
  data: {
    title: "Nested",
    slug: "nested",
    content: "…",
    author: { connect: { id: authorId } },          // link existing
    tags: {
      connectOrCreate: [                             // link if exists, else create
        { where: { name: "prisma" }, create: { name: "prisma" } },
        { where: { name: "nextjs" }, create: { name: "nextjs" } },
      ],
    },
  },
  include: { tags: true },
});

// bulk
await prisma.post.createMany({ data: [ /* … */ ], skipDuplicates: true });
```

`connect`, `connectOrCreate`, and nested `create` are the relation-writing verbs — learn them; they replace a pile of manual FK juggling.

### 7.2 Read

```ts
await prisma.post.findUnique({ where: { id } });          // by unique field, or null
await prisma.post.findUniqueOrThrow({ where: { id } });   // throws P2025 if missing
await prisma.post.findFirst({ where: { published: true }, orderBy: { createdAt: "desc" } });
await prisma.post.findMany({
  where: { published: true },
  select: { id: true, title: true, author: { select: { name: true } } }, // shape output
  orderBy: [{ views: "desc" }, { id: "asc" }],            // stable tiebreaker
  take: 20,
  skip: 0,
});
```

> **`select` vs `include`:** `include` adds relations to the *full* model; `select` returns *only* the listed fields (and you can nest relations inside it). Prefer `select` in app code — it's the difference between leaking a `passwordHash` and not, and it reduces payload size. (This is the exact pattern the Guide #21 service layer leans on.)

### 7.3 Update

```ts
await prisma.post.update({ where: { id }, data: { title: "New" } });     // throws if missing
await prisma.post.update({ where: { id }, data: { views: { increment: 1 } } }); // atomic!
await prisma.post.updateMany({ where: { published: false }, data: { published: true } });
```

Atomic operators (`increment`, `decrement`, `multiply`, `set`, `push` for arrays) update *relative to the current value in the DB* — no read-modify-write race. Use them for counters.

### 7.4 Delete & upsert

```ts
await prisma.post.delete({ where: { id } });                    // throws P2025 if missing
await prisma.post.deleteMany({ where: { authorId, published: false } });

await prisma.post.upsert({
  where: { slug: "hello" },
  create: { title: "Hello", slug: "hello", content: "…", authorId },
  update: { views: { increment: 1 } },
});
```

`upsert` = "insert or update in one atomic query" — perfect for idempotent seeds and "create-if-not-exists" flows.

---

## 8. Advanced Queries

### 8.1 Filtering operators

```ts
await prisma.post.findMany({
  where: {
    OR: [
      { title: { contains: "next", mode: "insensitive" } },   // case-insensitive LIKE
      { content: { contains: "prisma", mode: "insensitive" } },
    ],
    views: { gte: 100 },                                       // gt, gte, lt, lte
    createdAt: { gte: new Date("2026-01-01") },
    author: { role: "ADMIN" },                                 // filter BY relation
    tags: { some: { name: "featured" } },                      // some / every / none
    status: { in: ["PUBLISHED", "ARCHIVED"] },                 // in / notIn
    slug: { not: null },
  },
});
```

`some`/`every`/`none` on relations and the boolean combinators `AND`/`OR`/`NOT` compose into surprisingly rich queries without raw SQL.

### 8.2 Aggregation & grouping

```ts
const stats = await prisma.post.aggregate({
  where: { published: true },
  _count: true,
  _avg: { views: true },
  _max: { views: true },
});

const byCategory = await prisma.post.groupBy({
  by: ["categoryId"],
  _count: { _all: true },
  having: { views: { _avg: { gt: 50 } } },
});

const count = await prisma.post.count({ where: { published: true } });
```

### 8.3 Transactions (two flavors)

```ts
// 1) Sequential array — all succeed or all roll back (great for read-consistency)
const [total, page] = await prisma.$transaction([
  prisma.post.count({ where }),
  prisma.post.findMany({ where, take: 20 }),
]);

// 2) Interactive — logic between queries; return value commits, throw rolls back
await prisma.$transaction(async (tx) => {
  const from = await tx.account.update({ where: { id: a }, data: { balance: { decrement: 100 } } });
  if (from.balance < 0) throw new Error("Insufficient funds");   // ← rolls everything back
  await tx.account.update({ where: { id: b }, data: { balance: { increment: 100 } } });
});
```

Use the array form for the count+page pagination pattern (Guide #21 §6); use the interactive form for money movements and any multi-step invariant.

### 8.4 Raw SQL (escape hatch)

```ts
// Parameterized (safe from injection) — use the tagged template, never string concat
const rows = await prisma.$queryRaw`SELECT id, title FROM posts WHERE views > ${100}`;
await prisma.$executeRaw`UPDATE posts SET views = views + 1 WHERE id = ${id}`;
```

Reach for raw SQL only for things the query API can't express (window functions, full-text search — Guide #58). **Always** use the tagged-template form so values are parameterized; never interpolate user input into `$queryRawUnsafe`.

---

## 9. Client Extensions (What Replaced Middleware)

> **The catalog says "middleware" — here's the critical update.** Prisma's old `$use()` middleware was **deprecated in 4.16 and removed in Prisma 7**. The replacement is **Client Extensions** (`$extends`), which are more powerful and type-safe. If you find a tutorial using `prisma.$use(async (params, next) => …)`, it will not run on Prisma 7. Learn extensions instead.

Extensions add behavior across four components: `query` (intercept operations — the old middleware use case), `model` (custom methods on models), `result` (computed fields), and `client` (top-level helpers).

### 9.1 `query` — logging / timing (the classic middleware example)

```ts
// src/lib/db.ts — extend the base client
export const prisma = makeClient().$extends({
  query: {
    $allModels: {
      async $allOperations({ model, operation, args, query }) {
        const start = performance.now();
        const result = await query(args);          // run the actual query
        const ms = performance.now() - start;
        if (ms > 100) console.warn(`[slow] ${model}.${operation} took ${ms.toFixed(0)}ms`);
        return result;
      },
    },
  },
});
```

This is the direct equivalent of what `$use` did — intercept every query, wrap it, log/measure/transform.

### 9.2 `result` — computed fields

```ts
.$extends({
  result: {
    user: {
      displayName: {
        needs: { name: true, email: true },
        compute: (user) => user.name || user.email.split("@")[0],
      },
    },
  },
});
// now every user query can select `displayName` as if it were a column
```

### 9.3 `model` — custom model methods (e.g. soft delete)

```ts
.$extends({
  model: {
    post: {
      async softDelete(id: string) {
        return prisma.post.update({ where: { id }, data: { deletedAt: new Date() } });
      },
    },
  },
});
// usage: await prisma.post.softDelete(id)
```

**Type gotcha with the singleton:** `$extends` returns a *new, differently-typed* client. Export the extended instance and derive its type so your app uses the extended type everywhere:

```ts
const base = makeClient();
export const prisma = base.$extends({ /* … */ });
export type ExtendedPrisma = typeof prisma;
```

Common real extensions: soft deletes, automatic `updatedBy`/audit stamping, field-level encryption, per-tenant row filtering, automatic retry on deadlock. The community catalog (`prisma-client-extensions`) has ready-made ones.

---

## 10. Seeding with Faker

Realistic seed data makes every other feature (pagination, search, filtering) testable.

```bash
npm install --save-dev @faker-js/faker
```

```ts
// prisma/seed.ts
import { PrismaClient } from "../src/generated/prisma";
import { PrismaPg } from "@prisma/adapter-pg";
import { faker } from "@faker-js/faker";
import "dotenv/config";

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }) });

async function main() {
  console.log("🌱 Seeding…");

  // Idempotent: clean in FK-safe order so re-running seed is safe
  await prisma.comment.deleteMany();
  await prisma.post.deleteMany();
  await prisma.user.deleteMany();

  const categories = await Promise.all(
    ["Tech", "Design", "Business"].map((name) =>
      prisma.category.create({ data: { name, slug: name.toLowerCase() } })
    )
  );

  for (let i = 0; i < 10; i++) {
    const user = await prisma.user.create({
      data: {
        email: faker.internet.email().toLowerCase(),
        name: faker.person.fullName(),
        profile: { create: { bio: faker.lorem.sentence() } },   // nested 1:1
        posts: {
          create: Array.from({ length: faker.number.int({ min: 1, max: 5 }) }, () => ({
            title: faker.lorem.sentence(),
            slug: faker.helpers.slugify(faker.lorem.words(3)) + "-" + faker.string.nanoid(6),
            content: faker.lorem.paragraphs(3),
            published: faker.datatype.boolean(),
            views: faker.number.int({ min: 0, max: 5000 }),
            categoryId: faker.helpers.arrayElement(categories).id,
          })),
        },
      },
    });
    console.log(`  created user ${user.email}`);
  }
  console.log("✅ Done");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
```

```bash
npx prisma db seed    # runs the command declared in prisma.config.ts (§2.3)
```

**Seed patterns to internalize:** make it **idempotent** (delete-then-create, or `upsert`) so it's safe to re-run; delete in **FK-dependency order**; use `faker.seed(123)` if you want deterministic data across runs. (Deeper seeding strategy + CI pipelines → Guide #18.)

---

## 11. Prisma Studio

```bash
npx prisma studio      # opens http://localhost:5555
```

A visual DB browser: view/edit/filter/create/delete rows, follow relations by clicking, and sanity-check that your migrations and seeds did what you expected. Use it constantly while learning — *seeing* the join table Prisma created for an implicit M:N relation (§5.3), or watching seed rows appear, cements the model far faster than reading docs.

Caveats: it's a **dev tool** — don't expose it in production; edits bypass your application logic and validation, so treat it as raw DB access.

---

## 12. Connection Pooling (The Serverless Gotcha)

The concept that separates "works on my machine" from "survives production."

### 12.1 The problem

Each `PrismaClient` opens a **pool** of DB connections. Postgres has a hard cap (often ~100). Two ways to blow past it:
- **Dev hot-reload** → many clients → many pools. (Fixed by the §3 singleton.)
- **Serverless** (Vercel functions, Lambda) → each concurrent invocation is its own isolated instance with its own pool. 100 concurrent requests can mean hundreds of connections → `FATAL: too many connections`. The singleton does **not** save you here — instances don't share memory.

### 12.2 The solutions

| Solution | What it is | When |
|---|---|---|
| **PgBouncer** | External connection pooler in front of Postgres | Self-hosted / VPS |
| **Prisma Accelerate** | Prisma's managed pooler + global cache | Serverless, minimal setup |
| **Supabase / Neon pooler** | Provider-built poolers (transaction mode) | Using those hosts |
| Direct connection | No pooler | Long-lived servers only (not serverless) |

Typical pooled setup uses **two** URLs — a pooled one for the app, a direct one for migrations (which need real session connections):

```env
DATABASE_URL="postgres://…@pooler.host:6543/db?pgbouncer=true"   # app queries (pooled)
DIRECT_URL="postgres://…@db.host:5432/db"                        # prisma migrate
```

You can also cap Prisma's own pool via the connection string: `?connection_limit=5` — in serverless, a *small* per-instance limit (say 1–5) plus an external pooler is the winning combination.

> This is the daily-driver version. Deep pooling — PgBouncer transaction vs session mode, Accelerate caching, read replicas — is Guide #17.

---

## 13. N+1 Prevention & Query Performance

### 13.1 The N+1 trap

```ts
// ❌ 1 query for posts + N queries for each post's author = N+1 round trips
const posts = await prisma.post.findMany();
for (const post of posts) {
  const author = await prisma.user.findUnique({ where: { id: post.authorId } });
}

// ✅ ONE query with a join
const posts = await prisma.post.findMany({
  include: { author: { select: { id: true, name: true } } },
});
```

The fix is almost always `include`/`select` to fetch relations in the same query. Turn on `log: ["query"]` (§2.5) and **read your query log** — if you see the same query firing in a loop, that's an N+1.

### 13.2 Performance habits

- **Index what you filter/sort/join on.** `@@index([published, createdAt])` for a "published posts, newest first" list. Match the index to the query's `where` + `orderBy`.
- **`select` only what you need** — smaller payloads, and it lets Postgres use covering indexes.
- **Paginate always** — never an unbounded `findMany()`; cap `take` (Guide #21 caps at 100).
- **Cursor pagination** for deep/infinite lists — `OFFSET 100000` scans and discards; cursors don't (Guide #21 §7, Guide #25 §8.2).
- **Batch** with `createMany`/`updateMany` instead of loops.
- Read `EXPLAIN ANALYZE` for hot queries in `psql` when something's slow.

> Full optimization — read replicas, query batching, `@@index` design deep-dive — is Guide #132. The rule for now: fetch relations in one query, index your filters, always paginate.

---

## 14. Production Checklist

**Setup & safety**
- [ ] Single `PrismaClient` via the `globalThis` singleton; imported everywhere, never re-`new`ed
- [ ] Driver adapter wired (v7 mandatory); generated client output committed-path is correct
- [ ] `DATABASE_URL` (+ `DIRECT_URL` if pooled) in host env, never committed
- [ ] `prisma/migrations/` committed; `migrate deploy` in CI/CD, never `migrate dev` in prod
- [ ] `db push` used only for throwaway prototyping

**Schema & data**
- [ ] `Decimal` for money, `cuid()`/`uuid()` for user-facing IDs
- [ ] `onDelete` behavior set intentionally on every relation
- [ ] Indexes on all filter/sort/join columns; composite indexes match hot queries
- [ ] Seed script idempotent and declared in `prisma.config.ts`

**Runtime & performance**
- [ ] Connection pooler (PgBouncer/Accelerate/provider) in front of Postgres for serverless; small per-instance `connection_limit`
- [ ] `select`/`include` used to shape output (no leaked columns, no N+1)
- [ ] Every list endpoint paginated with a hard cap
- [ ] Atomic operators (`increment`) for counters; transactions for multi-step invariants
- [ ] Query logging reviewed for N+1 before shipping
- [ ] Prisma Studio not exposed in production

---

## 15. Learning Path & Exercises

**Suggested build order:**
1. Mental model (§1), then setup through `prisma generate` (§2) — confirm the client is typed in your editor
2. Add the singleton (§3); prove it by removing it and watching connections climb (advanced)
3. Model `User` + `Post` (1:N), migrate, inspect in Studio (§4–6, §11)
4. Add `Profile` (1:1) and `Tag` (implicit M:N); in Studio, find the `_PostToTag` join table Prisma made (§5)
5. Convert tags to an explicit `PostTag` with `assignedAt` — feel why the choice matters (§5.3)
6. CRUD every model by hand; use nested `create` + `connectOrCreate` (§7)
7. Filtering, aggregation, both transaction styles (§8)
8. Write a `query` extension that logs slow queries; a `model` extension for soft delete (§9)
9. Seed 10 users with posts via Faker; make it idempotent; re-run it (§10)
10. Turn on query logging, write a deliberate N+1, then fix it with `include` (§13)

**Stretch exercises:**
- `result` extension for a computed `readingTime` on posts
- Self-relation threaded comments (§5.4) + a recursive query to build the tree
- Two-URL pooled setup against Neon/Supabase; compare connection counts under load (§12)
- Field-level encryption via a `query` extension on a `Profile.ssn` field
- Wire this schema into Guide #21's API and Guide #1/#2's auth — the whole point of the series

**Reference reading:**
- prisma.io/docs — Prisma schema reference, Client CRUD, Client Extensions, and the **v7 upgrade guide** (for the engine/adapter/middleware changes)
- Related guides in this series: #17 (pooling deep-dive), #18 (migration & seeding strategy), #58 (full-text search), #132 (query optimization)

---

*Built for the next.cnippet.dev guide series — Guide #11: Prisma ORM Complete Setup. The data layer beneath Guides #1, #2, #21, and #25.*
