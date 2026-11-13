import { Header } from "@/components/layout/header";
import { AnchoredToastProvider, ToastProvider } from "@/components/ui/toast";

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ToastProvider position="top-left">
      <AnchoredToastProvider>
        <Header />
        <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-6 px-4 py-12">
          {children}
        </main>
      </AnchoredToastProvider>
    </ToastProvider>
  );
}
