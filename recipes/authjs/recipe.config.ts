import type { RecipeManifestInput } from "@cnippet/recipe-kit";

// `app/...` sources land in the app dir, everything else under srcDir.
const create = (source: string) => ({
  source,
  strategy: "create" as const,
  target: source.startsWith("app/")
    ? `{{appDir}}${source.slice("app/".length)}`
    : `{{srcDir}}${source}`,
});

export default {
  category: "auth",
  cnippetUiComponents: [
    "avatar",
    "badge",
    "button",
    "card",
    "field",
    "input",
    "input-group",
    "separator",
    "toast",
  ],
  dependencies: [
    // Auth.js v5 is still in beta — pinned to the version this code is tested on.
    "next-auth@5.0.0-beta.32",
    "@auth/prisma-adapter@~2.11.3",
    "bcryptjs@^3.0.3",
    "zod@^4.4.3",
  ],
  description:
    "Auth.js v5 with GitHub, Google and email/password sign-in, JWT sessions, a Prisma adapter, roles and route protection.",
  envVars: [
    {
      description: "PostgreSQL connection string (validated by lib/env.ts).",
      example: "postgresql://user:password@localhost:5432/mydb",
      name: "DATABASE_URL",
    },
    {
      description: "Secret used to encrypt session JWTs.",
      generate: "secret32",
      name: "AUTH_SECRET",
    },
    {
      description:
        "GitHub OAuth app client ID (read automatically by Auth.js).",
      example: "your-github-client-id",
      name: "AUTH_GITHUB_ID",
    },
    {
      description: "GitHub OAuth app client secret.",
      example: "your-github-client-secret",
      name: "AUTH_GITHUB_SECRET",
    },
    {
      description: "Google OAuth client ID (read automatically by Auth.js).",
      example: "your-google-client-id",
      name: "AUTH_GOOGLE_ID",
    },
    {
      description: "Google OAuth client secret.",
      example: "your-google-client-secret",
      name: "AUTH_GOOGLE_SECRET",
    },
  ],
  hosts: ["with-prisma"],
  name: "authjs",
  requires: ["prisma"],

  steps: [
    {
      files: [
        {
          source: "prisma/auth-models.prisma",
          strategy: "append",
          target: "prisma/schema.prisma",
        },
      ],
      id: "schema-append",
      manualSteps: [
        {
          blocking: true,
          description:
            "Run `prisma migrate dev --name authjs` to create the auth tables.",
          title: "Migrate the auth tables",
          when: "after",
        },
      ],
      postInstall: [
        {
          command: "prisma generate",
          description: "Regenerate the Prisma Client",
        },
      ],
      title: "Add the auth tables to your Prisma schema",
      verify:
        "Open `prisma studio` — you should see User, Account and VerificationToken tables.",
      why: "The Prisma adapter stores OAuth accounts and users in your database. A passwordHash column and a Role enum support credentials sign-in and admin checks.",
    },
    {
      files: [
        create("auth.config.ts"),
        create("lib/auth/route-guard.ts"),
        create("types/next-auth.d.ts"),
      ],
      id: "auth-config",
      manualSteps: [
        {
          blocking: true,
          description:
            "Create OAuth apps on GitHub and Google with the callback URLs `<your-url>/api/auth/callback/github` and `/api/auth/callback/google`, then set AUTH_GITHUB_ID/SECRET and AUTH_GOOGLE_ID/SECRET.",
          title: "Create GitHub and Google OAuth apps",
          when: "before",
        },
      ],
      title: "Add the edge-safe auth config",
      verify: "Import `authConfig` — no TypeScript errors.",
      why: "Providers and the route guard live apart from the database adapter, so proxy.ts can import them without pulling Prisma into the proxy runtime.",
    },
    {
      files: [
        create("lib/env.ts"),
        create("lib/validations/auth.schema.ts"),
        create("lib/errors/auth-errors.ts"),
        create("lib/auth/authorize-credentials.ts"),
      ],
      id: "credentials",
      title: "Verify email and password credentials",
      verify: "Import `authorizeCredentials` — no TypeScript errors.",
      why: "Credentials are parsed with Zod and checked against a bcrypt hash. A wrong password throws a typed error instead of returning a vague null.",
    },
    {
      files: [create("auth.ts"), create("lib/dal.ts")],
      id: "server-instance",
      title: "Create the Auth.js instance",
      verify:
        "Import `auth` from `@/auth` in a server component — no TypeScript errors.",
      why: "Combines the config with the Prisma adapter and credentials provider. JWT sessions are required because Auth.js disallows database sessions with credentials.",
    },
    {
      files: [create("app/api/auth/[...nextauth]/route.ts")],
      id: "route-handler",
      title: "Mount the auth route handler",
      verify:
        "`curl localhost:3000/api/auth/providers` lists github, google and credentials.",
      why: "Every Auth.js endpoint — OAuth callbacks, sign-in, session — is served from this one catch-all route.",
    },
    {
      files: [
        create("lib/rate-limit.ts"),
        create("lib/errors/handle-auth-errors.ts"),
        create("lib/actions/login.ts"),
        create("lib/actions/register.ts"),
        create("lib/actions/signout.ts"),
      ],
      id: "server-actions",
      title: "Add login, register and sign-out actions",
      verify:
        "Register with a 3-character password — it is rejected before reaching the database.",
      why: "Server actions rate-limit by IP, hash new passwords and map Auth.js errors to readable messages.",
    },
    {
      files: [
        create("components/providers/session-provider.tsx"),
        create("components/auth/login-form.tsx"),
        create("components/auth/register-form.tsx"),
        create("components/auth/oauth-buttons.tsx"),
        create("components/auth/signout-button.tsx"),
        create("components/layout/header.tsx"),
        create("components/layout/footer.tsx"),
        create("app/(auth)/layout.tsx"),
        create("app/(auth)/login/page.tsx"),
        create("app/(auth)/register/page.tsx"),
      ],
      id: "starter-ui",
      title: "Add the login and register pages",
      verify: "Visit /register, create an account, and land on /dashboard.",
      why: "Forms wired to the server actions, plus GitHub and Google buttons. The session provider lets client components react to sign-in without a reload.",
    },
    {
      files: [
        create("proxy.ts"),
        create("app/(main)/layout.tsx"),
        create("app/(main)/dashboard/page.tsx"),
        create("app/(main)/dashboard/admin/layout.tsx"),
        create("app/(main)/dashboard/admin/page.tsx"),
        create("app/(main)/profile/page.tsx"),
        create("app/api/v1/me/route.ts"),
      ],
      id: "route-protection",
      title: "Protect routes and add role checks",
      verify:
        "Signed out, visit /dashboard — you are redirected to /login. As a USER, /dashboard/admin redirects to /dashboard.",
      why: "proxy.ts blocks protected paths before they render, and pages re-check through the DAL. The admin layout gates on the ADMIN role.",
    },
  ],
  supports: {
    next: ["16"],
    orm: ["prisma"],
    router: ["app"],
  },
  tier: "free",
  title: "Auth.js (NextAuth v5)",
  version: "0.2.0",
} satisfies RecipeManifestInput;
