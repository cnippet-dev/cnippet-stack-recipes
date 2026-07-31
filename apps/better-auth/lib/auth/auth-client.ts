import { twoFactorClient } from "better-auth/plugins";
import { createAuthClient } from "better-auth/react";

// TODO NEXT_PUBLIC_BETTER_AUTH_URL
export const authClient = createAuthClient({
  baseURL: process.env.NEXT_PUBLIC_BETTER_AUTH_URL,
  plugins: [twoFactorClient()],
});

export const { signIn, signUp, signOut, useSession } = authClient;
