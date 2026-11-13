import { headers } from "next/headers";
import { Badge } from "@/components/ui/badge";
import { auth } from "@/lib/auth/auth";
import { requireAdmin } from "@/lib/auth/session";

export default async function AdminPage() {
  // In the page, not a layout: Next.js renders layouts and pages in parallel,
  // so a layout's redirect doesn't stop the page from running.
  await requireAdmin();
  // An admin plugin endpoint: it also refuses anyone without the admin role.
  const { users, total } = await auth.api.listUsers({
    headers: await headers(),
    query: { limit: 20, sortBy: "createdAt", sortDirection: "desc" },
  });

  return (
    <div className="grid gap-4">
      <h1 className="font-semibold text-2xl">Users ({total})</h1>
      <ul className="grid gap-2">
        {users.map((user) => (
          <li
            className="flex items-center justify-between rounded-md border p-3 text-sm"
            key={user.id}
          >
            <span>{user.email}</span>
            <Badge variant={user.role === "admin" ? "default" : "secondary"}>
              {user.role}
            </Badge>
          </li>
        ))}
      </ul>
    </div>
  );
}
