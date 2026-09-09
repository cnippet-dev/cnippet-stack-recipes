"use client";

import { useQuery } from "@tanstack/react-query";
import { useTRPC } from "@/trpc/client";

export function ClientGreeting() {
  const trpc = useTRPC();

  const posts = useQuery(trpc.posts.list.queryOptions({ limit: 10 }));

  if (posts.isLoading) return <div>Loading...</div>;
  if (posts.error) return <p>{posts.error.message}</p>;
  if (!posts.data) return <p>No posts</p>;

  return (
    <>
      {posts.data.items.map((p) => (
        <article key={p.id}>{p.title}</article>
      ))}
    </>
  );
}
