import Footer from "@/components/layout/footer";
import Header from "@/components/layout/header";
import { AnchoredToastProvider, ToastProvider } from "@/components/ui/toast";

export default function SupabaseLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ToastProvider position="bottom-right">
      <AnchoredToastProvider>
        <Header />
        {children}
        <Footer />
      </AnchoredToastProvider>
    </ToastProvider>
  );
}
