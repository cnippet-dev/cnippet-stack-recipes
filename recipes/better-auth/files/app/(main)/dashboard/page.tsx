import { requireUser } from "@/lib/auth/session";

export default async function DashboardPage() {
  const user = await requireUser();

  return (
    <div className="grid gap-2">
      <h1 className="font-semibold text-2xl">Welcome, {user.name}</h1>
      <p className="text-muted-foreground text-sm">
        Signed in as {user.email} with the {user.role} role.
      </p>
    </div>
  );
}
