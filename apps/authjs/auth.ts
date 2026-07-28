import NextAuth from "next-auth";
import { authConfig } from "./auth.config";
import { PrismaAdapter } from "@auth/prisma-adapter";
import Credentials from "next-auth/providers/credentials";
import { authorizeCredentials } from "./lib/auth/authorize-credentials";
import prisma from "./lib/prisma";

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  adapter: PrismaAdapter(prisma),
  session: { strategy: "jwt" },
  providers: [
    ...authConfig.providers,
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      authorize: authorizeCredentials,
    }),
  ],
  callbacks: {
    ...authConfig.callbacks,

    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
      }
      return token;
    },
    async session({ session, token }) {
      if (token?.id && token?.role) {
        session.user.id = token.id;
        session.user.role = token.role;
      }
      return session;
    },
  },
});
