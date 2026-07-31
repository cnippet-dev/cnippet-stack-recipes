import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { Enable2FA } from "@/components/auth/enable-2fa";
import { auth } from "@/lib/auth/auth";
import { env } from "@/lib/config/env";

export default async function Profile() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/login");

  const [data, accounts] = await Promise.all([
    fetch(`${env.NEXT_PUBLIC_APP_URL}/api/v1/me`, {
      headers: await headers(),
    }),
    auth.api.listUserAccounts({ headers: await headers() }),
  ]);
  const res = await data.json();

  const hasCredentialAccount = accounts.some(
    (account) => account.providerId === "credential",
  );

  return (
    <div className="flex h-screen w-screen flex-col items-center justify-center bg-black">
      <p className="text-white text-xl uppercase tracking-widest">
        {res.email}
      </p>

      {hasCredentialAccount && (
        <Enable2FA twoFactorEnabled={session.user.twoFactorEnabled ?? false} />
      )}
    </div>
  );
}
