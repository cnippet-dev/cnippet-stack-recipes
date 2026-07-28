"use client";

import Footer from "@/components/layout/footer";
import Header from "@/components/layout/header";

export default function Home() {
  return (
    <>
      <Header />
      <div className="h-screen w-screen bg-foreground text-background flex items-center justify-center text-3xl tracking-widest uppercase">
        Public Page
      </div>
      <Footer />
    </>
  );
}
