"use server";

import { revalidatePath } from "next/cache";
import { getServerCaller } from "@/trpc/server";

export async function createPostActon(data: {
  title: string;
  slug: string;
  content: string;
  tags: string[];
}) {
  const caller = await getServerCaller();
  const post = await caller.posts.create(data);

  revalidatePath("/posts");
  revalidatePath(`/posts/${post.id}`);

  return { data: post, success: true };
}
