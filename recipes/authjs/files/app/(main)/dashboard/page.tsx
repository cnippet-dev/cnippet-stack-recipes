import { requireUser } from "@/lib/dal";

export default async function Dashboard() {
  const user = await requireUser();

  return (
    <div className="flex min-h-[60vh] w-full items-center justify-center text-3xl uppercase tracking-widest">
      Welcome back, {user.name}
    </div>
  );
}
