import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { nextCookies } from "better-auth/next-js";
import { admin, twoFactor } from "better-auth/plugins";
import { env } from "../config/env";
import prisma from "../db/prisma";

export const auth = betterAuth({
  database: prismaAdapter(prisma, { provider: "postgresql" }),

  emailAndPassword: {
    enabled: true,
    maxPasswordLength: 120,
    minPasswordLength: 8,
    // requireEmailVerification: true, (Once email sending is wired)
  },

  plugins: [
    admin({ adminRoles: ["admin"], defaultRole: "user" }),
    twoFactor(),
    nextCookies(),
  ],

  session: {
    cookieCache: { enabled: true, maxAge: 5 * 60 },
    expiresIn: 60 * 60 * 24 * 7,
    updateAge: 60 * 60 * 24,
  },

  socialProviders: {
    github: {
      clientId: env.GITHUB_CLIENT_ID,
      clientSecret: env.GITHUB_CLIENT_SECRET,
    },
    google: {
      clientId: env.GOOGLE_CLIENT_ID,
      clientSecret: env.GOOGLE_CLIENT_SECRET,
    },
  },
});
