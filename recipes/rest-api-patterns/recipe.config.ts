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
    "@upstash/ratelimit@^2.0.8",
    "@upstash/redis@^1.38.3",
    "zod@^4.4.3",
  ],
  description:
    "Production REST API patterns: typed errors, a consistent response envelope, Zod request parsing, Upstash rate limiting, a service layer and CORS.",
  envVars: [
    {
      description:
        "PostgreSQL connection string (checked by lib/utils/env.ts).",
      example: "postgresql://user:password@localhost:5432/mydb",
      name: "DATABASE_URL",
    },
    {
      description: "Upstash Redis REST URL from console.upstash.com.",
      example: "https://your-db.upstash.io",
      name: "UPSTASH_REDIS_REST_URL",
    },
    {
      description: "Upstash Redis REST token from console.upstash.com.",
      example: "your-upstash-token",
      name: "UPSTASH_REDIS_REST_TOKEN",
    },
    {
      description:
        "Base URL the server actions use to call this app's own /api/v1 routes.",
      example: "http://localhost:3000",
      name: "API_URL",
    },
  ],
  hosts: ["with-prisma"],
  name: "rest-api-patterns",
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
      why: "The example resource the API serves: posts with a many-to-many relation to tags.",
    },
    {
      files: [
        create("lib/api/errors.ts"),
        create("lib/api/responses.ts"),
        create("lib/api/validate.ts"),
        create("lib/validations/post.schema.ts"),
      ],
      id: "api-toolkit",
      title: "Add typed errors, responses and request parsing",
      verify: "Import `parseBody` and `ok` — no TypeScript errors.",
      why: "Every route returns the same `{ success, data | error }` envelope. Handlers throw an ApiError instead of hand-building error responses.",
    },
    {
      files: [
        create("lib/utils/env.ts"),
        create("lib/api/rate-limit.ts"),
        create("lib/api/handler.ts"),
      ],
      id: "error-handler",
      manualSteps: [
        {
          blocking: false,
          description:
            "Create a Redis database at console.upstash.com and copy its REST URL and token into .env. Without them rate limiting fails open.",
          title: "Create an Upstash Redis database",
          when: "before",
        },
      ],
      title: "Wrap handlers with error mapping and rate limits",
      verify: "Import `withErrorHandler` — no TypeScript errors.",
      why: "One wrapper maps ApiErrors and Prisma error codes to HTTP statuses and applies a per-route sliding-window rate limit.",
    },
    {
      files: [create("lib/services/post.service.ts")],
      id: "service-layer",
      title: "Add the post service",
      verify: "Import `postService` — no TypeScript errors.",
      why: "Database access lives in a service, not in route files. Routes stay thin and the queries are reusable from server actions or jobs.",
    },
    {
      files: [
        create("app/api/v1/posts/route.ts"),
        create("app/api/v1/posts/[id]/route.ts"),
        create("app/api/health/route.ts"),
      ],
      id: "route-handlers",
      title: "Add the versioned routes",
      verify:
        "`curl -i localhost:3000/api/v1/posts` returns `{ success: true, data: [] }` with X-RateLimit headers.",
      why: "Each route is a few lines: parse, call the service, respond. The wrapper handles every failure path.",
    },
    {
      files: [create("proxy.ts")],
      id: "cors",
      title: "Add CORS for the API",
      verify:
        "An OPTIONS request from http://localhost:3000 gets Access-Control-Allow-Origin back.",
      why: "proxy.ts answers preflight requests and sets CORS headers for allowed origins on every /api route.",
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
      why: "Four cards that exercise every server action against the API. Built from Cnippet UI components.",
    },
  ],
  supports: {
    next: ["16"],
    orm: ["prisma"],
    router: ["app"],
  },
  tier: "free",
  title: "REST API Patterns",
  version: "0.1.0",
});
