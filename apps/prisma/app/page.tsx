import { Create } from "@/components/layout/create";
import { Delete } from "@/components/layout/delete";
import { Footer } from "@/components/layout/footer";
import { Header } from "@/components/layout/header";
import { Read } from "@/components/layout/read";
import { Update } from "@/components/layout/update";

export default function Home() {
  return (
    <>
      <Header />
      <div className="flex h-screen w-screen justify-center bg-foreground text-background">
        <div className="w-7xl max-w-7xl">
          <h1>Cnippet</h1>
          <div className="flex flex-1 shrink-0 justify-between">
            <Create />
            <Read />
            <Update />
            <Delete />
          </div>
        </div>
      </div>
      <Footer />
    </>
  );
}
