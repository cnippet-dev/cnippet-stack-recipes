import { Footer } from "@/components/layout/footer";
import { Header } from "@/components/layout/header";
import { AnchoredToastProvider, ToastProvider } from "@/components/ui/toast";

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ToastProvider position="bottom-right">
      <AnchoredToastProvider>
        <main className="overflow-hidden">
          <Header />
          {children}
          <Footer />
        </main>
      </AnchoredToastProvider>
    </ToastProvider>
  );
}
