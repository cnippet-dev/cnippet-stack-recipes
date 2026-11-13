import { headers } from "next/headers";
import { Suspense } from "react";
import { LinkedAccounts } from "@/components/auth/linked-accounts";
import { TwoFactorSettings } from "@/components/auth/two-factor-settings";
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
import { requireUser } from "@/lib/auth/session";

export default async function ProfilePage() {
  const user = await requireUser();
  const accounts = await auth.api.listUserAccounts({
    headers: await headers(),
  });
  // "credential" is the email and password account.
  const providers = accounts.map((account) => account.providerId);
  const hasPassword = providers.includes("credential");

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center gap-4">
          <Avatar className="size-12">
            {user.image && <AvatarImage alt={user.name} src={user.image} />}
            <AvatarFallback>{user.name.charAt(0).toUpperCase()}</AvatarFallback>
          </Avatar>
          <div>
            <CardTitle>{user.name}</CardTitle>
            <CardDescription>{user.email}</CardDescription>
          </div>
        </CardHeader>
        <CardContent className="grid gap-3 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Role</span>
            <Badge variant={user.role === "admin" ? "default" : "secondary"}>
              {user.role}
            </Badge>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Sign-in methods</span>
            <div className="flex gap-1">
              {providers.map((provider) => (
                <Badge key={provider} variant="outline">
                  {provider}
                </Badge>
              ))}
            </div>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Member since</span>
            <span>{user.createdAt.toLocaleDateString()}</span>
          </div>
        </CardContent>
      </Card>
      <TwoFactorSettings
        enabled={user.twoFactorEnabled ?? false}
        hasPassword={hasPassword}
      />
      {/* LinkedAccounts reads ?error= from the URL. */}
      <Suspense>
        <LinkedAccounts accounts={accounts} />
      </Suspense>
    </>
  );
}
