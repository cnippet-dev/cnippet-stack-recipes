import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { auth } from "./auth/auth";

export const requireUser = cache(async () => {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) redirect("/login");
  return session.user;
});

export const requireRole = cache(async (role: "admin") => {
  const user = await requireUser();
  if (user.role !== role) redirect("/dashboard");
  return user;
});
