import Footer from "@/components/layout/footer";
import Header from "@/components/layout/header";
import { AuthProvider } from "@/components/providers/session-provider";
import { AnchoredToastProvider, ToastProvider } from "@/components/ui/toast";

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthProvider>
      <ToastProvider position="top-left">
        <AnchoredToastProvider>
          <Header />
          {children}
          <Footer />
        </AnchoredToastProvider>
      </ToastProvider>
    </AuthProvider>
  );
}
