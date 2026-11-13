export type OAuthProvider = "github" | "google" | "discord";

// The OAuth providers turned on in lib/auth/auth.ts, for the sign-in and profile pages.
export const oauthProviders: { id: OAuthProvider; label: string }[] = [
  // #if answers.providers.includes("github")
  { id: "github", label: "GitHub" },
  // #endif
  // #if answers.providers.includes("google")
  { id: "google", label: "Google" },
  // #endif
  // #if answers.providers.includes("discord")
  { id: "discord", label: "Discord" },
  // #endif
];
