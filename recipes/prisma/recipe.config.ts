import type { RecipeManifestInput } from "@cnippet/recipe-kit";

export default {
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
    "@prisma/adapter-pg@^7.9.1",
    "@prisma/client@^7.9.1",
    "dotenv@^17.4.2",
    "pg@^8.22.0",
    "zod@^4.4.3",
  ],
  description:
    "Prisma 7 with the Postgres driver adapter, a singleton client, and a full CRUD example: route handlers, cached server actions and a starter UI.",
  devDependencies: ["prisma@^7.9.1", "@types/pg@^8.20.4"],
  envVars: [
    {
      description: "PostgreSQL connection string.",
      example: "postgresql://user:password@localhost:5432/mydb",
      name: "DATABASE_URL",
    },
    {
      description:
        "Base URL the server actions use to call this app's own /api/v1 routes.",
      example: "http://localhost:3000",
      name: "API_URL",
    },
  ],
  gitignore: ["/{{srcDir}}app/generated/prisma"],
  hosts: ["app-router-src", "app-router-no-src"],
  name: "prisma",

  steps: [
    {
      files: [
        {
          source: "prisma.config.ts",
          strategy: "create",
          target: "prisma.config.ts",
        },
        {
          source: "prisma/schema.prisma",
          strategy: "create",
          target: "prisma/schema.prisma",
        },
      ],
      id: "prisma-setup",
      manualSteps: [
        {
          blocking: true,
          description:
            "Provision a PostgreSQL database (Neon, Supabase, Railway or local Docker) and set DATABASE_URL in your .env file.",
          title: "Provision a PostgreSQL database",
          when: "before",
        },
      ],
      postInstall: [
        {
          command: "prisma generate",
          description: "Generate the Prisma Client",
        },
      ],
      title: "Configure Prisma",
      verify:
        "`prisma generate` succeeds and app/generated/prisma/client.ts exists.",
      why: "Prisma 7 reads its settings from prisma.config.ts instead of the schema. The generated client is written inside your app so the @/ alias can import it.",
    },
    {
      files: [
        {
          source: "lib/db/prisma.ts",
          strategy: "create",
          target: "{{srcDir}}lib/db/prisma.ts",
        },
      ],
      id: "client-singleton",
      title: "Create the Prisma client singleton",
      verify: "Import `@/lib/db/prisma` anywhere — no TypeScript errors.",
      why: "One shared client through the pg driver adapter. Hot reload in development would otherwise open a new connection pool on every change.",
    },
    {
      files: [
        {
          source: "prisma/post-models.prisma",
          strategy: "append",
          target: "prisma/schema.prisma",
        },
      ],
      id: "post-model",
      manualSteps: [
        {
          blocking: true,
          description:
            "Run `prisma migrate dev --name init` to create the posts and tags tables.",
          title: "Run the first migration",
          when: "after",
        },
      ],
      postInstall: [
        {
          command: "prisma generate",
          description: "Regenerate the Prisma Client",
        },
      ],
      title: "Add the Post and Tag models",
      verify:
        "Open `prisma studio` — you should see the posts and tags tables.",
      why: "The example data model: posts with a many-to-many relation to tags. It is appended so it sits alongside any models you already have.",
    },
    {
      files: [
        {
          source: "lib/validation/post.ts",
          strategy: "create",
          target: "{{srcDir}}lib/validation/post.ts",
        },
      ],
      id: "validation",
      title: "Add Zod validation schemas",
      verify: "Import `createPostSchema` — no TypeScript errors.",
      why: "Every request body and query string is parsed before it reaches Prisma. Invalid input becomes a 422 instead of a database error.",
    },
    {
      files: [
        {
          source: "app/api/v1/post/route.ts",
          strategy: "create",
          target: "{{appDir}}api/v1/post/route.ts",
        },
        {
          source: "app/api/v1/post/[id]/route.ts",
          strategy: "create",
          target: "{{appDir}}api/v1/post/[id]/route.ts",
        },
      ],
      id: "route-handlers",
      title: "Add the CRUD route handlers",
      verify:
        "`curl localhost:3000/api/v1/post` returns `{ data: [], pagination: {…} }`.",
      why: "A versioned REST API over the Post model with pagination, search and tag filtering. Prisma error codes map to proper HTTP statuses.",
    },
    {
      files: [
        {
          source: "lib/actions/dal.ts",
          strategy: "create",
          target: "{{srcDir}}lib/actions/dal.ts",
        },
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
        {
          source: "components/layout/create.tsx",
          strategy: "create",
          target: "{{srcDir}}components/layout/create.tsx",
        },
        {
          source: "components/layout/read.tsx",
          strategy: "create",
          target: "{{srcDir}}components/layout/read.tsx",
        },
        {
          source: "components/layout/update.tsx",
          strategy: "create",
          target: "{{srcDir}}components/layout/update.tsx",
        },
        {
          source: "components/layout/delete.tsx",
          strategy: "create",
          target: "{{srcDir}}components/layout/delete.tsx",
        },
        {
          source: "components/layout/header.tsx",
          strategy: "create",
          target: "{{srcDir}}components/layout/header.tsx",
        },
        {
          source: "components/layout/footer.tsx",
          strategy: "create",
          target: "{{srcDir}}components/layout/footer.tsx",
        },
        {
          source: "app/posts/layout.tsx",
          strategy: "create",
          target: "{{appDir}}posts/layout.tsx",
        },
        {
          source: "app/posts/page.tsx",
          strategy: "create",
          target: "{{appDir}}posts/page.tsx",
        },
      ],
      id: "starter-ui",
      title: "Add the starter CRUD UI",
      verify:
        "Visit /posts — create, read, update and delete a post from the four cards.",
      why: "Four cards that exercise every server action. Built from Cnippet UI components, which the CLI installs from the @cnippet registry.",
    },
  ],
  supports: {
    next: ["16"],
    orm: ["none"],
    router: ["app"],
  },
  tier: "free",
  title: "Prisma ORM",
  trustedBuildScripts: ["prisma", "@prisma/client", "@prisma/engines"],
  version: "0.1.1",
} satisfies RecipeManifestInput;
