import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { requireUser } from "@/lib/dal";
import prisma from "@/lib/prisma";

export default async function Profile() {
  const authUser = await requireUser();

  const user = await prisma.user.findUniqueOrThrow({
    include: { accounts: { select: { provider: true } } },
    where: { id: authUser.id },
  });

  const signInMethods = user.accounts.map((account) => account.provider);
  if (user.passwordHash) signInMethods.unshift("credentials");

  const initials = (user.name ?? user.email).charAt(0).toUpperCase();

  return (
    <div className="flex min-h-screen w-screen items-center justify-center bg-black px-4 py-24 text-white">
      <Card className="w-full max-w-md">
        <CardHeader className="items-center text-center">
          <Avatar className="mb-2 size-16 text-xl">
            {user.image && (
              <AvatarImage alt={user.name ?? user.email} src={user.image} />
            )}
            <AvatarFallback>{initials}</AvatarFallback>
          </Avatar>
          <CardTitle>{user.name ?? "Unnamed user"}</CardTitle>
          <CardDescription>{user.email}</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Role</span>
            <Badge variant={user.role === "ADMIN" ? "default" : "secondary"}>
              {user.role}
            </Badge>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Email verified</span>
            <Badge variant={user.emailVerified ? "success" : "warning"}>
              {user.emailVerified ? "Verified" : "Not verified"}
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
            <span className="text-muted-foreground">Member since</span>
            <span>
              {user.createdAt.toLocaleDateString("en-US", {
                day: "numeric",
                month: "long",
                year: "numeric",
              })}
            </span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
