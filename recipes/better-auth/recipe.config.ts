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
  category: "auth",
  cnippetUiComponents: [
    "avatar",
    "badge",
    "button",
    "card",
    "dialog",
    "field",
    "input",
    "input-group",
    "input-otp",
    "label",
    "separator",
    "spinner",
    "toast",
  ],
  dependencies: ["better-auth@~1.6.29", "qrcode.react@^4.2.0", "zod@^4.4.3"],
  description:
    "Email/password and GitHub/Google sign-in with database sessions, admin roles, route protection and TOTP two-factor auth.",
  envVars: [
    {
      description:
        "PostgreSQL connection string (validated by lib/config/env.ts).",
      example: "postgresql://user:password@localhost:5432/mydb",
      name: "DATABASE_URL",
    },
    {
      description: "Secret used to sign sessions and tokens.",
      generate: "secret32",
      name: "BETTER_AUTH_SECRET",
    },
    {
      description: "Your app's base URL, used by the auth server.",
      example: "http://localhost:3000",
      name: "BETTER_AUTH_URL",
    },
    {
      description:
        "Your app's base URL, used by the auth client in the browser.",
      example: "http://localhost:3000",
      name: "NEXT_PUBLIC_BETTER_AUTH_URL",
    },
    {
      description: "Your app's base URL, used for server-side API calls.",
      example: "http://localhost:3000",
      name: "NEXT_PUBLIC_APP_URL",
    },
    {
      description: "OAuth app client ID from github.com/settings/developers.",
      example: "your-github-client-id",
      name: "GITHUB_CLIENT_ID",
    },
    {
      description:
        "OAuth app client secret from github.com/settings/developers.",
      example: "your-github-client-secret",
      name: "GITHUB_CLIENT_SECRET",
    },
    {
      description: "OAuth client ID from console.cloud.google.com.",
      example: "your-google-client-id",
      name: "GOOGLE_CLIENT_ID",
    },
    {
      description: "OAuth client secret from console.cloud.google.com.",
      example: "your-google-client-secret",
      name: "GOOGLE_CLIENT_SECRET",
    },
  ],
  hosts: ["with-prisma"],
  name: "better-auth",
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
            "Run `prisma migrate dev --name better-auth` to create the auth tables.",
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
        "Open `prisma studio` — you should see user, session, account, verification and twoFactor tables.",
      why: "Better Auth stores users in your database rather than owning a separate one. Five models and a role enum go into your existing schema.",
    },
    {
      files: [create("lib/config/env.ts"), create("lib/auth/auth.ts")],
      id: "server-instance",
      manualSteps: [
        {
          blocking: true,
          description:
            "Create OAuth apps on GitHub and Google with the callback URLs `<BETTER_AUTH_URL>/api/auth/callback/github` and `/api/auth/callback/google`, then fill in the client IDs and secrets.",
          title: "Create GitHub and Google OAuth apps",
          when: "before",
        },
      ],
      title: "Create the auth server instance",
      verify: "Import `@/lib/auth/auth` anywhere — no TypeScript errors.",
      why: "One shared instance with the Prisma adapter, admin and two-factor plugins. The env schema fails fast at startup if a variable is missing.",
    },
    {
      files: [create("app/api/auth/[...all]/route.ts")],
      id: "route-handler",
      title: "Mount the auth route handler",
      verify:
        "`curl localhost:3000/api/auth/get-session` returns `null`, not a 404.",
      why: "Every Better Auth endpoint is served from one catch-all route. It must be `[...all]` — a `[...nextauth]` folder never fires.",
    },
    {
      files: [create("lib/auth/auth-client.ts")],
      id: "client-instance",
      title: "Create the auth client",
      verify:
        "Import `authClient` in a client component — no TypeScript errors.",
      why: "The browser-side client, with plugins that mirror the server's. Components use it for sessions, OAuth and 2FA calls.",
    },
    {
      files: [
        create("lib/validations/auth.schema.ts"),
        create("lib/rate-limit.ts"),
        create("lib/actions/sign-in.ts"),
        create("lib/actions/sign-up.ts"),
        create("lib/actions/sign-out.ts"),
      ],
      id: "server-actions",
      title: "Add sign-in, sign-up and sign-out actions",
      verify:
        "Submit sign-up with a 3-character password — it is rejected before reaching the database.",
      why: "Server actions validate with Zod and rate-limit by IP and email before calling the auth API. Better Auth errors map to friendly messages.",
    },
    {
      files: [
        create("components/auth/signin-form.tsx"),
        create("components/auth/signup-form.tsx"),
        create("components/auth/oauth-buttons.tsx"),
        create("components/auth/signout-button.tsx"),
        create("components/layout/header.tsx"),
        create("components/layout/footer.tsx"),
        create("app/(auth)/layout.tsx"),
        create("app/(auth)/login/page.tsx"),
        create("app/(auth)/register/page.tsx"),
      ],
      id: "starter-ui",
      title: "Add the sign-in and sign-up pages",
      verify: "Visit /register, create an account, and land on /dashboard.",
      why: "Forms wired to the server actions, plus GitHub and Google buttons. Signed-in visitors are redirected away from the auth pages.",
    },
    {
      files: [
        create("proxy.ts"),
        create("lib/dal.ts"),
        create("app/(main)/layout.tsx"),
        create("app/(main)/dashboard/page.tsx"),
        create("app/(main)/dashboard/admin/layout.tsx"),
        create("app/(main)/dashboard/admin/page.tsx"),
        create("app/api/v1/me/route.ts"),
      ],
      id: "route-protection",
      title: "Protect routes and add role checks",
      verify:
        "Signed out, visit /dashboard — you are redirected to /login. As a non-admin, /dashboard/admin redirects to /dashboard.",
      why: "proxy.ts redirects before a protected page renders, and the DAL re-checks on the server. Checking in only one place leaves a gap.",
    },
    {
      files: [
        create("app/(auth)/two-factor/page.tsx"),
        create("components/auth/enable-2fa.tsx"),
        create("components/auth/linked-accounts.tsx"),
        create("app/(main)/profile/page.tsx"),
      ],
      id: "two-factor",
      title: "Add two-factor auth and the profile page",
      verify:
        "On /profile, enable 2FA and scan the QR code. Sign out and back in — you are asked for a 6-digit code.",
      why: "Users with a password can turn on TOTP from their profile. Sign-in then pauses at /two-factor until a code or backup code is verified.",
    },
  ],
  supports: {
    next: ["16"],
    orm: ["prisma"],
    router: ["app"],
  },
  tier: "free",
  title: "Better Auth",
  version: "0.1.0",
});
