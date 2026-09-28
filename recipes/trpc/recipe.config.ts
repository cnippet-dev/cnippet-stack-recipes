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
  category: "api",
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
    "@tanstack/react-query@^5.102.8",
    "@trpc/client@^11.18.0",
    "@trpc/server@^11.18.0",
    "@trpc/tanstack-react-query@^11.18.0",
    "superjson@^2.2.6",
    "zod@^4.5.4",
  ],
  description:
    "End-to-end typed API with tRPC v11 and TanStack Query over Prisma: a posts router, protected procedures, server-side prefetching and a starter CRUD UI.",
  envVars: [
    {
      description: "PostgreSQL connection string.",
      example: "postgresql://user:password@localhost:5432/mydb",
      name: "DATABASE_URL",
    },
  ],
  hosts: ["with-prisma"],
  name: "trpc",
  requires: ["prisma"],

  steps: [
    {
      files: [
        {
          source: "prisma/post-models.prisma",
          strategy: "append",
          target: "prisma/schema.prisma",
        },
      ],
      id: "schema-append",
      manualSteps: [
        {
          blocking: true,
          description:
            "Run `prisma migrate dev --name posts` to create the posts and tags tables.",
          title: "Migrate the posts tables",
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
      why: "The example resource the router serves: posts with a many-to-many relation to tags.",
    },
    {
      files: [create("lib/validations/post.schema.ts")],
      id: "validation",
      title: "Add Zod input schemas",
      verify: "Import `createPostSchema` — no TypeScript errors.",
      why: "tRPC validates every procedure input with these schemas. The same schemas type the client, so a bad input fails before it leaves the browser.",
    },
    {
      files: [create("trpc/init.ts"), create("trpc/query-client.ts")],
      id: "trpc-init",
      manualSteps: [
        {
          blocking: false,
          description:
            "createTRPCContext in trpc/init.ts returns a hard-coded placeholder user. Replace it with your auth library's session before shipping, or every protected procedure is open.",
          title: "Replace the placeholder session",
          when: "after",
        },
      ],
      title: "Initialise tRPC",
      verify: "Import `protectedProcedure` — no TypeScript errors.",
      why: "One tRPC instance with superjson and Zod error formatting. Context carries Prisma and the session, and procedures build on it for auth and admin checks.",
    },
    {
      files: [create("trpc/routers/posts.ts"), create("trpc/routers/app.ts")],
      id: "routers",
      title: "Add the posts router",
      verify: "Import `AppRouter` — no TypeScript errors.",
      why: "CRUD procedures over the Post model. Prisma error codes map to tRPC error codes, and the root router's type is what the client infers from.",
    },
    {
      files: [create("app/api/trpc/[trpc]/route.ts")],
      id: "route-handler",
      title: "Mount tRPC on a route handler",
      verify:
        "`curl localhost:3000/api/trpc/health.check` returns `ok` inside the result JSON.",
      why: "The fetch adapter serves every procedure from one catch-all route.",
    },
    {
      files: [create("trpc/client.tsx"), create("trpc/server.ts")],
      id: "clients",
      title: "Add the client provider and server helpers",
      verify: "Import `useTRPC` and `trpc` — no TypeScript errors.",
      why: "The provider gives client components typed TanStack Query hooks. The server helpers prefetch the same queries during render and call procedures directly.",
    },
    {
      files: [create("lib/action-result.ts"), create("lib/actions/dal.ts")],
      id: "server-actions",
      title: "Add server actions that call tRPC",
      verify: "Import `createPostAction` — no TypeScript errors.",
      why: "Optional. Server actions call procedures through the server caller and map tRPC errors to form-friendly results, for forms that post without the client hooks.",
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
      why: "Four cards built on useTRPC mutations and queries. The page prefetches the post list on the server, so it renders without a loading flash.",
    },
  ],
  supports: {
    next: ["16"],
    orm: ["prisma"],
    router: ["app"],
  },
  tier: "free",
  title: "tRPC",
  version: "0.1.0",
});
