import { redirect } from "next/navigation";
import { cache } from "react";
import { auth } from "@/auth";

export const getCurrentUser = cache(async () => {
  const session = await auth();
  return session?.user ?? null;
});

export const requireUser = cache(async () => {
  const session = await auth();
  if (!session?.user) redirect("/login");
  return session.user;
});

export const requireRole = cache(async (role: "ADMIN") => {
  const user = await requireUser();
  if (user.role !== role) redirect("/dashboard");
  return user;
});
