// The OAuth providers you picked at install. Each one reads its keys from
// AUTH_<PROVIDER>_ID and AUTH_<PROVIDER>_SECRET on its own.
// To add or remove one, add or remove its line.
// #if answers.providers.includes("github")
export { default as GitHub } from "next-auth/providers/github";
// #endif
// #if answers.providers.includes("google")
export { default as Google } from "next-auth/providers/google";
// #endif
// #if answers.providers.includes("discord")
export { default as Discord } from "next-auth/providers/discord";
// #endif
// Keeps this file a module when no provider is picked.
export {};
