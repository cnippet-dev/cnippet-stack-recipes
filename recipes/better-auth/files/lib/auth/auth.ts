import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { nextCookies } from "better-auth/next-js";
import { admin, twoFactor } from "better-auth/plugins";
import { env } from "@/lib/auth/env";
import prisma from "@/lib/db/prisma";

export const auth = betterAuth({
  // Shown as the account name in authenticator apps.
  appName: "My App",
  baseURL: env.BETTER_AUTH_URL,
  database: prismaAdapter(prisma, { provider: "postgresql" }),
  emailAndPassword: {
    enabled: true,
    maxPasswordLength: 128,
    minPasswordLength: 8,
  },
  plugins: [
    admin({ adminRoles: ["admin"], defaultRole: "user" }),
    twoFactor(),
    // Last: lets server actions set auth cookies.
    nextCookies(),
  ],
  secret: env.BETTER_AUTH_SECRET,
  session: {
    // Reads the session from a signed cookie for 5 minutes before asking the database again.
    cookieCache: { enabled: true, maxAge: 5 * 60 },
  },
  socialProviders: {
    // #if answers.providers.includes("github")
    github: {
      clientId: env.GITHUB_CLIENT_ID,
      clientSecret: env.GITHUB_CLIENT_SECRET,
    },
    // #endif
    // #if answers.providers.includes("google")
    google: {
      clientId: env.GOOGLE_CLIENT_ID,
      clientSecret: env.GOOGLE_CLIENT_SECRET,
    },
    // #endif
    // #if answers.providers.includes("discord")
    discord: {
      clientId: env.DISCORD_CLIENT_ID,
      clientSecret: env.DISCORD_CLIENT_SECRET,
    },
    // #endif
  },
});
