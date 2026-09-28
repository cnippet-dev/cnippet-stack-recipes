import { Create } from "@/components/layout/create";
import { Delete } from "@/components/layout/delete";
import { Read } from "@/components/layout/read";
import { Update } from "@/components/layout/update";

export default function Home() {
  return (
    <div className="flex h-screen w-screen items-center justify-center bg-foreground text-background">
      <div className="w-7xl max-w-7xl">
        <h1 className="mb-5 flex items-end text-4xl tracking-tighter">
          <p className="text-6xl">C</p>
          <p className="text-2xl">nippet</p>
        </h1>
        <div className="flex items-center justify-between">
          <Create />
          <Read />
          <Update />
          <Delete />
        </div>
      </div>
    </div>
  );
}
