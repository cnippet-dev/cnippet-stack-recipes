import { PrismaAdapter } from "@auth/prisma-adapter";
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { authConfig } from "./auth.config";
import { authorizeCredentials } from "./lib/auth/authorize-credentials";
import prisma from "./lib/prisma";

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  adapter: PrismaAdapter(prisma),
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
  providers: [
    ...authConfig.providers,
    Credentials({
      authorize: authorizeCredentials,
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
    }),
  ],
  session: { strategy: "jwt" },
});
