import type { RecipeManifestInput } from "@cnippet/recipe-kit";

// `app/...` sources land in the app dir, everything else under srcDir.
const create = (source: string, when?: string) => ({
  source,
  strategy: "create" as const,
  target: source.startsWith("app/")
    ? `{{appDir}}${source.slice("app/".length)}`
    : `{{srcDir}}${source}`,
  ...(when ? { when } : {}),
});

const UI = "answers.starterUi";
const picked = (provider: string) =>
  `answers.providers.includes("${provider}")`;

const providerEnv = (id: string, label: string, where: string) => [
  {
    description: `${label} OAuth client ID, from ${where}.`,
    example: `your-${id}-client-id`,
    name: `${id.toUpperCase()}_CLIENT_ID`,
    when: picked(id),
  },
  {
    description: `${label} OAuth client secret, from ${where}.`,
    example: `your-${id}-client-secret`,
    name: `${id.toUpperCase()}_CLIENT_SECRET`,
    when: picked(id),
  },
];

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
    "input-otp",
    "separator",
    "spinner",
    "toast",
  ],
  dependencies: [
    // Minor releases of better-auth can change the schema: stay on the tested minor.
    "better-auth@~1.7.22",
    "qrcode.react@^4.2.0",
    "zod@^4.6.7",
  ],
  description:
    "Better Auth with email/password plus your pick of GitHub, Google and Discord, database sessions in Postgres through Prisma, admin roles, route protection and two-factor auth.",
  envVars: [
    {
      description:
        "PostgreSQL connection string, read by the Prisma client the auth tables live in.",
      example: "postgresql://user:password@localhost:5432/mydb",
      name: "DATABASE_URL",
    },
    {
      description: "Secret that signs session cookies. At least 32 characters.",
      generate: "secret32",
      name: "BETTER_AUTH_SECRET",
    },
    {
      description:
        "Your app's URL. Better Auth builds OAuth callback URLs from it and only trusts requests from it.",
      example: "http://localhost:3000",
      name: "BETTER_AUTH_URL",
    },
    ...providerEnv("github", "GitHub", "github.com/settings/developers"),
    ...providerEnv("google", "Google", "console.cloud.google.com"),
    ...providerEnv("discord", "Discord", "discord.com/developers/applications"),
  ],
  hosts: ["with-prisma", "with-prisma-src"],
  name: "better-auth",
  prompts: [
    {
      default: ["github", "google"],
      id: "providers",
      message: "Which OAuth providers? (email and password is always on)",
      options: [
        { label: "GitHub", value: "github" },
        { label: "Google", value: "google" },
        { label: "Discord", value: "discord" },
      ],
      type: "multiselect",
    },
    {
      default: true,
      id: "starterUi",
      message:
        "Add sign-in, register, two-factor, dashboard, admin and profile pages?",
      type: "confirm",
    },
  ],
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
        "Open `prisma studio`: you see the user, session, account, verification and twoFactor tables.",
      why: "Better Auth keeps users, sessions and linked accounts in your own database. These models are what `npx auth generate` writes for email/password, the admin plugin and two-factor.",
    },
    {
      files: [create("lib/auth/env.ts"), create("lib/auth/auth.ts")],
      id: "server-instance",
      manualSteps: [
        {
          blocking: true,
          condition: "answers.providers.length > 0",
          description:
            "Create an OAuth app for each provider you picked, with the callback URL `<BETTER_AUTH_URL>/api/auth/callback/<provider>` (e.g. `http://localhost:3000/api/auth/callback/github`), then set its CLIENT_ID and CLIENT_SECRET.",
          title: "Create the OAuth apps",
          when: "before",
        },
      ],
      title: "Create the auth server",
      verify: "Import `auth` from `@/lib/auth/auth`: no TypeScript errors.",
      why: "One betterAuth() instance holds everything: the Prisma adapter, email/password, your OAuth providers and the admin and two-factor plugins. lib/auth/env.ts fails at startup if a variable is missing.",
    },
    {
      files: [create("app/api/auth/[...all]/route.ts")],
      id: "route-handler",
      title: "Mount the auth route handler",
      verify: '`curl localhost:3000/api/auth/ok` returns `{"ok":true}`.',
      why: "Every Better Auth endpoint (sign-up, sign-in, OAuth callbacks, 2FA) is served from this one catch-all route under /api/auth.",
    },
    {
      files: [create("lib/auth/auth-client.ts")],
      id: "client-instance",
      title: "Create the auth client",
      verify: "Import `authClient` in a client component: no TypeScript errors.",
      why: "The browser side of Better Auth. Its plugins mirror the server's, so authClient.twoFactor and the admin calls are typed.",
    },
    {
      files: [
        create("lib/auth/session.ts"),
        create("proxy.ts"),
        create("app/api/v1/me/route.ts"),
      ],
      id: "route-protection",
      title: "Protect routes and check roles",
      verify:
        "Signed out, `curl -i localhost:3000/api/v1/me` returns 401, and visiting /dashboard redirects to /login.",
      why: "proxy.ts cheaply turns away visitors without a session cookie. Pages and routes then check the real session with requireUser() and requireAdmin().",
    },
    {
      files: [
        create("lib/auth/validation.ts", UI),
        create("lib/auth/providers.ts", UI),
        create("components/auth/oauth-buttons.tsx", UI),
        create("components/auth/signin-form.tsx", UI),
        create("components/auth/signup-form.tsx", UI),
        create("components/auth/signout-button.tsx", UI),
        create("components/layout/header.tsx", UI),
        create("app/(auth)/layout.tsx", UI),
        create("app/(auth)/login/page.tsx", UI),
        create("app/(auth)/register/page.tsx", UI),
        create("app/(main)/layout.tsx", UI),
        create("app/(main)/dashboard/page.tsx", UI),
        create("app/(main)/dashboard/admin/page.tsx", UI),
      ],
      id: "starter-ui",
      title: "Add the sign-in, register and dashboard pages",
      verify:
        "Visit /register, create an account, and land on /dashboard with the user role.",
      why: "Forms that call authClient directly, a button per OAuth provider you picked, and a dashboard plus an admin-only user list.",
    },
    {
      files: [
        create("app/(auth)/two-factor/page.tsx", UI),
        create("components/auth/two-factor-settings.tsx", UI),
        create("components/auth/linked-accounts.tsx", UI),
        create("app/(main)/profile/page.tsx", UI),
      ],
      id: "two-factor",
      title: "Add two-factor auth and the profile page",
      verify:
        "On /profile, turn on two-factor and scan the QR code. Sign out and back in: you are asked for a 6-digit code.",
      why: "Users with a password can turn on authenticator-app codes from their profile. Sign-in then stops at /two-factor until a code or backup code is verified.",
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
} satisfies RecipeManifestInput;
