import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import { Create } from "@/components/layout/create";
import { Delete } from "@/components/layout/delete";
import { Footer } from "@/components/layout/footer";
import Header from "@/components/layout/header";
import { Read } from "@/components/layout/read";
import { Update } from "@/components/layout/update";
import { getQueryClient, trpc } from "@/trpc/server";

export default async function Home() {
  const queryClient = getQueryClient();
  const listInput = { limit: 4, page: 1 } as const;

  await queryClient.prefetchQuery(trpc.posts.list.queryOptions(listInput));

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <Header />
      <div className="flex min-h-screen w-screen items-center justify-center bg-foreground text-background">
        <div className="w-7xl max-w-7xl px-4 py-8 lg:px-0 lg:py-0">
          <h1 className="mb-5 flex items-end text-4xl tracking-tighter">
            <p className="text-6xl">C</p>
            <p className="text-2xl">nippet</p>
          </h1>
          <div className="flex flex-col items-center justify-between gap-2 md:flex-row md:items-start xl:items-center xl:gap-0">
            <Create />

            <div className="flex flex-col items-center gap-2 md:gap-2 xl:contents">
              <Read />
              <Update />
            </div>

            <Delete />
          </div>
        </div>
      </div>
      <Footer />
    </HydrationBoundary>
  );
}
