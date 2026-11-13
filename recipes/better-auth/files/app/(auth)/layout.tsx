import { redirect } from "next/navigation";
import { Header } from "@/components/layout/header";
import { AnchoredToastProvider, ToastProvider } from "@/components/ui/toast";
import { getSession } from "@/lib/auth/session";

export default async function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Already signed in: nothing to do on these pages.
  if (await getSession()) redirect("/dashboard");

  return (
    <ToastProvider position="top-left">
      <AnchoredToastProvider>
        <Header />
        <main className="mx-auto flex w-full max-w-sm flex-1 flex-col items-center justify-center px-4 py-12">
          {children}
        </main>
      </AnchoredToastProvider>
    </ToastProvider>
  );
}
