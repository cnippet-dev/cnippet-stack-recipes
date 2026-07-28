import { auth } from "@/auth";
import { cache } from "react";

export const getCurrentUser = cache(async () => {
  const session = await auth();
  return session?.user ?? null;
});

export const requireUser = cache(async () => {
  const session = await auth();
  if (!session?.user) throw new Error("UNAUTHORIZED");
  return session.user;
});

export const requireRole = cache(async (role: "ADMIN") => {
  const user = await requireUser();
  if (user.role !== role) throw new Error("FORBIDDEN");
  return user;
});
