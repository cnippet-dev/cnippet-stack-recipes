import { defineRecipe } from "../../scripts/define-recipe";

// `app/...` sources land in the app dir, everything else under srcDir.
const create = (source: string) => ({
  source,
  strategy: "create" as const,
  target: source.startsWith("app/")
    ? `{{appDir}}${source.slice("app/".length)}`
    : `{{srcDir}}${source}`,
});

export default defineRecipe({
  category: "database",
  cnippetUiComponents: [
    "accordion",
    "badge",
    "button",
    "card",
    "dialog",
    "field",
    "form",
    "input",
    "label",
    "spinner",
    "textarea",
    "toast",
  ],
  dependencies: [
    // Drizzle 1.0 is a release candidate — pinned to the build this code is tested on.
    "drizzle-orm@1.0.0-rc.5-ab785fc",
    "@neondatabase/serverless@^1.1.0",
    "ws@^8.21.3",
    "dotenv@^17.4.2",
    "zod@^4.4.3",
  ],
  description:
    "Drizzle ORM on Neon serverless Postgres: a typed schema with many-to-many relations, the v2 relational query API, and a full CRUD example.",
  devDependencies: ["drizzle-kit@1.0.0-rc.5-ab785fc", "@types/ws@^8.18.1"],
  envVars: [
    {
      description: "Neon (or any Postgres) connection string.",
      example: "postgresql://user:password@ep-example.neon.tech/neondb",
      name: "DATABASE_URL",
    },
    {
      description:
        "Base URL the server actions use to call this app's own /api/v1 routes.",
      example: "http://localhost:3000",
      name: "API_URL",
    },
  ],
  hosts: ["app-router-src", "app-router-no-src"],
  name: "drizzle",

  steps: [
    {
      files: [
        {
          source: "drizzle.config.ts",
          strategy: "create",
          target: "drizzle.config.ts",
        },
        create("lib/db/schema.ts"),
      ],
      id: "schema",
      manualSteps: [
        {
          blocking: true,
          description:
            "Create a Neon project at console.neon.tech and set DATABASE_URL in your .env file.",
          title: "Provision a Neon database",
          when: "before",
        },
        {
          blocking: true,
          description:
            "Run `drizzle-kit generate` then `drizzle-kit migrate` to create the posts, tags and posts_to_tags tables.",
          title: "Generate and apply the first migration",
          when: "after",
        },
      ],
      title: "Define the schema and drizzle-kit config",
      verify: "`drizzle-kit generate` writes a migration under ./migrations.",
      why: "The schema is plain TypeScript, and drizzle-kit diffs it to produce SQL migrations. Posts and tags are joined by a posts_to_tags table.",
    },
    {
      files: [create("lib/db/relations.ts"), create("lib/db/drizzle.ts")],
      id: "client",
      title: "Create the relations and the database client",
      verify: "Import `db` from `@/lib/db/drizzle` — no TypeScript errors.",
      why: "defineRelations powers `db.query.*` with nested `with` loading. The Neon pool needs a WebSocket constructor on Node.",
    },
    {
      files: [create("lib/validation/post.ts")],
      id: "validation",
      title: "Add Zod validation schemas",
      verify: "Import `createPostSchema` — no TypeScript errors.",
      why: "Request bodies and query strings are parsed before they reach the database. Invalid input becomes a 422 instead of a Postgres error.",
    },
    {
      files: [
        create("app/api/v1/post/route.ts"),
        create("app/api/v1/post/[id]/route.ts"),
      ],
      id: "route-handlers",
      title: "Add the CRUD route handlers",
      verify:
        "`curl localhost:3000/api/v1/post` returns `{ data: [], pagination: {…} }`.",
      why: "Create and update run in transactions so a post and its tags land together. Postgres error codes map to HTTP statuses.",
    },
    {
      files: [
        create("lib/actions/dal.ts"),
        {
          injection: { anchor: "nextConfig", kind: "add-object-property" },
          source: "next.config.cache-components.txt",
          strategy: "ast-inject",
          target: "next.config.ts",
        },
      ],
      id: "server-actions",
      title: "Add cached server actions",
      verify:
        "Create a post, then fetch — the list updates without a full reload.",
      why: "Server actions call the API and tag the cached post list. Mutations revalidate the tag, which needs cacheComponents enabled in next.config.ts.",
    },
    {
      files: [
        create("components/layout/create.tsx"),
        create("components/layout/read.tsx"),
        create("components/layout/update.tsx"),
        create("components/layout/delete.tsx"),
        create("components/layout/header.tsx"),
        create("components/layout/footer.tsx"),
        create("app/posts/layout.tsx"),
        create("app/posts/page.tsx"),
      ],
      id: "starter-ui",
      title: "Add the starter CRUD UI",
      verify:
        "Visit /posts — create, read, update and delete a post from the four cards.",
      why: "Four cards that exercise every server action. Built from Cnippet UI components.",
    },
  ],
  supports: {
    next: ["16"],
    orm: ["none"],
    router: ["app"],
  },
  tier: "pro",
  title: "Drizzle ORM with Neon",
  version: "0.1.0",
});
