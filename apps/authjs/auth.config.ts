import { NextAuthConfig } from "next-auth";
import GitHub from "next-auth/providers/github";
import Google from "next-auth/providers/google";
import { canAccessRoute } from "./lib/auth/route-guard";

export const authConfig = {
  providers: [Google, GitHub],
  pages: {
    signIn: "/login",
  },
  callbacks: {
    authorized({ auth, request }) {
      return canAccessRoute(auth, request.nextUrl.pathname);
    },
  },
} satisfies NextAuthConfig;
