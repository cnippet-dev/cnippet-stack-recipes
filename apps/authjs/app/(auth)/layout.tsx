import Header from "@/components/layout/header";
import { getCurrentUser } from "@/lib/dal";
import { redirect } from "next/navigation";

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
      <main className="mx-auto max-w-sm flex flex-col items-center justify-center  text-white px-4 py-4 rounded-sm mt-[15%]">
        {children}
      </main>
    </>
  );
}
