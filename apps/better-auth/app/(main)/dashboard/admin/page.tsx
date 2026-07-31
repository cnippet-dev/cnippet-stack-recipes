import { headers } from "next/headers";
import { auth } from "@/lib/auth/auth";

export default async function AdminDashboard() {
  const session = await auth.api.getSession({ headers: await headers() });

  if (!session) return;
  if (session.user.role !== "admin") return;

  return (
    <div className="flex h-screen w-screen items-center justify-center bg-foreground text-3xl text-black uppercase tracking-widest">
      Welcome {session.user.name} • {session.user.role}
    </div>
  );
}
