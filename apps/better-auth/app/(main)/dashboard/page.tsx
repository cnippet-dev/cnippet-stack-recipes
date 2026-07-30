import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth/auth";

export default async function Dashboard() {
  const session = await auth.api.getSession({ headers: await headers() });

  if (!session) redirect("/login");

  return (
    <div className="flex h-screen w-screen items-center justify-center bg-foreground text-3xl text-black uppercase tracking-widest">
      Welcome {session.user.name}
    </div>
  );
}
