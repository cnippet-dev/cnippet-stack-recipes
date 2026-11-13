import { adminClient, twoFactorClient } from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";

// No baseURL: the browser calls /api/auth on the same origin.
export const authClient = createAuthClient({
  plugins: [adminClient(), twoFactorClient()],
});
