import { requireUser } from "@/lib/dal";

export default async function Dashboard() {
  const user = await requireUser();

  return (
    <div className="flex h-screen w-screen items-center justify-center text-3xl text-white uppercase tracking-widest">
      Welcome back, {user.name}
    </div>
  );
}
