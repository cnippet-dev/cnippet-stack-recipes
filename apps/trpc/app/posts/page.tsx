import { getQueryClient, trpc } from "@/trpc/server";

export default async function Posts() {
  const queryClient = getQueryClient();

  await queryClient.prefetchQuery(trpc.posts.list.queryOptions({ limit: 10 }));

  const data = queryClient.getQueryData(
    trpc.posts.list.queryKey({ limit: 10 }),
  );

  if (!data) return <div>No posts</div>;

  return (
    <>
      {data.items.map((p) => (
        <article key={p.id}>{p.title}</article>
      ))}
    </>
  );
}
