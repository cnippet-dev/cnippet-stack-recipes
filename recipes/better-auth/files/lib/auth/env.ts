import { z } from "zod";

// Fails at startup with the name of the missing variable, not at the first sign-in.
const schema = z.object({
  BETTER_AUTH_SECRET: z
    .string()
    .min(32, "BETTER_AUTH_SECRET must be at least 32 characters"),
  BETTER_AUTH_URL: z.url(
    "BETTER_AUTH_URL must be your app's URL, e.g. http://localhost:3000",
  ),
  // #if answers.providers.includes("discord")
  DISCORD_CLIENT_ID: z.string().min(1, "DISCORD_CLIENT_ID is required"),
  DISCORD_CLIENT_SECRET: z.string().min(1, "DISCORD_CLIENT_SECRET is required"),
  // #endif
  // #if answers.providers.includes("github")
  GITHUB_CLIENT_ID: z.string().min(1, "GITHUB_CLIENT_ID is required"),
  GITHUB_CLIENT_SECRET: z.string().min(1, "GITHUB_CLIENT_SECRET is required"),
  // #endif
  // #if answers.providers.includes("google")
  GOOGLE_CLIENT_ID: z.string().min(1, "GOOGLE_CLIENT_ID is required"),
  GOOGLE_CLIENT_SECRET: z.string().min(1, "GOOGLE_CLIENT_SECRET is required"),
  // #endif
});

export const env = schema.parse(process.env);
