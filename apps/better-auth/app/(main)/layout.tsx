import { Footer } from "@/components/layout/footer";
import { Header } from "@/components/layout/header";

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <main className="overflow-hidden">
      <Header />
      {children}
      <Footer />
    </main>
  );
}
