import { headers } from "next/headers";
import { env } from "@/lib/config/env";

export default async function Profile() {
  const data = await fetch(`${env.NEXT_PUBLIC_APP_URL}/api/v1/me`, {
    headers: await headers(),
  });
  const res = await data.json();

  return (
    <div className="flex h-screen w-screen items-center justify-center bg-foreground text-3xl text-black uppercase tracking-widest">
      {res.email}
    </div>
  );
}
