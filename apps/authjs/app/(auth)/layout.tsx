import { redirect } from "next/navigation";
import Header from "@/components/layout/header";
import { getCurrentUser } from "@/lib/dal";

export default async function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();

  if (user) {
    redirect("/dashboard");
  }
  return (
    <>
      <Header />
      <main className="mx-auto mt-[15%] flex max-w-sm flex-col items-center justify-center rounded-sm px-4 py-4 text-white">
        {children}
      </main>
    </>
  );
}
