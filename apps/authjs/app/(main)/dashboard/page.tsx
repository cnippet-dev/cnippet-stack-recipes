import { requireUser } from "@/lib/dal";

export default async function Dashboard() {
  const user = await requireUser();

  return (
    <>
      <div className="h-screen w-screen text-white flex items-center justify-center text-3xl tracking-widest uppercase">
        Welcome back, {user.name}
      </div>
    </>
  );
}
