"use client";

import Footer from "@/components/layout/footer";
import Header from "@/components/layout/header";

export default function Home() {
  return (
    <>
      <Header />
      <div className="flex h-screen w-screen items-center justify-center bg-foreground text-3xl text-background uppercase tracking-widest">
        Public Page
      </div>
      <Footer />
    </>
  );
}
