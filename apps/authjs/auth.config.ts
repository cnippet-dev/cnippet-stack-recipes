import type { NextAuthConfig } from "next-auth";
import GitHub from "next-auth/providers/github";
import Google from "next-auth/providers/google";
import { canAccessRoute } from "./lib/auth/route-guard";

export const authConfig = {
  callbacks: {
    authorized({ auth, request }) {
      return canAccessRoute(auth, request.nextUrl.pathname);
    },
  },
  pages: {
    signIn: "/login",
  },
  providers: [Google, GitHub],
} satisfies NextAuthConfig;
