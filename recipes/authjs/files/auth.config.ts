import type { NextAuthConfig } from "next-auth";
import type { Provider } from "next-auth/providers";
import * as oauth from "@/lib/auth/oauth-providers";
import { canAccessRoute } from "@/lib/auth/route-guard";

export const oauthProviders: Provider[] = Object.values(oauth);

export const authConfig = {
  callbacks: {
    authorized({ auth, request }) {
      return canAccessRoute(auth, request.nextUrl.pathname);
    },
  },
  // #if answers.starterUi
  pages: {
    signIn: "/login",
  },
  // #endif
  providers: oauthProviders,
  trustHost: true,
} satisfies NextAuthConfig;
