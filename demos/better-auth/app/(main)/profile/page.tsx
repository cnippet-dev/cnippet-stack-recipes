import { ShieldCheck } from "lucide-react";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { UserRole } from "@/app/generated/prisma/enums";
import { Enable2FA } from "@/components/auth/enable-2fa";
import { LinkedAccounts } from "@/components/auth/linked-accounts";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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

  // Just an example of fetching data from the api routes
  const res = await data.json();

  const hasCredentialAccount = accounts.some(
    (account) => account.providerId === "credential",
  );
  const signInMethods = accounts.map((account) => account.providerId);
  const initials = (session.user.name ?? session.user.email)
    .charAt(0)
    .toUpperCase();

  return (
    <div className="flex min-h-screen w-screen flex-col items-center gap-6 bg-black px-4 py-24 text-white">
      <Card className="w-full max-w-md">
        <CardHeader className="items-center text-center">
          <Avatar className="mb-2 size-16 text-xl">
            {session.user.image && (
              <AvatarImage
                alt={session.user.name ?? session.user.email}
                src={session.user.image}
              />
            )}
            <AvatarFallback>{initials}</AvatarFallback>
          </Avatar>
          <CardTitle>{session.user.name ?? "Unnamed user"}</CardTitle>
          <CardDescription>{res.email}</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Role</span>
            <Badge
              variant={
                session.user.role === UserRole.admin ? "default" : "secondary"
              }
            >
              {session.user.role}
            </Badge>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Email verified</span>
            <Badge variant={session.user.emailVerified ? "success" : "warning"}>
              {session.user.emailVerified ? "Verified" : "Not verified"}
            </Badge>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Sign-in methods</span>
            <div className="flex flex-wrap justify-end gap-1">
              {signInMethods.map((method) => (
                <Badge className="capitalize" key={method} variant="outline">
                  {method}
                </Badge>
              ))}
            </div>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">
              Two Factor Authentication
            </span>
            <div className="flex flex-wrap justify-end gap-1">
              <Badge className="capitalize" variant="outline">
                {session.user.twoFactorEnabled ? (
                  <span className="flex items-center gap-1">
                    <ShieldCheck className="h-3.5 w-3.5" />
                    Enabled
                  </span>
                ) : (
                  "Disabled"
                )}
              </Badge>
            </div>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Member since</span>
            <span>
              {session.user.createdAt.toLocaleDateString("en-US", {
                day: "numeric",
                month: "long",
                year: "numeric",
              })}
            </span>
          </div>
          {hasCredentialAccount && (
            <Enable2FA
              hasPassword={hasCredentialAccount}
              twoFactorEnabled={session.user.twoFactorEnabled ?? false}
            />
          )}
        </CardContent>
      </Card>
      <div className="w-full max-w-md">
        <LinkedAccounts linkedProviders={signInMethods} />
      </div>
    </div>
  );
}
