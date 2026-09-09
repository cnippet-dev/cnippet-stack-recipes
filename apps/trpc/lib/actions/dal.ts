"use server";

import { revalidatePath } from "next/cache";
import type z from "zod";
import { getServerCaller } from "@/trpc/server";
import { listPostsQuerySchema } from "../validations/post.schema";

export async function createPostAction(data: {
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

export type ListPostQueryInput = z.input<typeof listPostsQuerySchema>;

export async function getPostsAction(input: ListPostQueryInput) {
  const parsed = listPostsQuerySchema.parse(input);
  const caller = await getServerCaller();
  const post = await caller.posts.list(parsed);

  console.log(post.posts, "TYpe", typeof post.posts);

  return { data: post.posts, success: true };
}
