import { redirect } from "next/navigation";
import { cache } from "react";
import { auth } from "@/auth";

export const getCurrentUser = cache(async () => {
  const session = await auth();
  return session?.user ?? null;
});

export const requireUser = cache(async () => {
  const session = await auth();
  // #if answers.starterUi
  if (!session?.user) redirect("/login");
  // #else
  if (!session?.user) redirect("/api/auth/signin");
  // #endif
  return session.user;
});

export const requireRole = cache(async (role: "ADMIN") => {
  const user = await requireUser();
  if (user.role !== role) redirect("/dashboard");
  return user;
});
