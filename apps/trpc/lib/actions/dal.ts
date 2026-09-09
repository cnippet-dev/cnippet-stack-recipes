"use server";

import { revalidatePath } from "next/cache";
import type z from "zod";
import { getServerCaller } from "@/trpc/server";
import {
  listPostsQuerySchema,
  updatePostSchema,
} from "../validations/post.schema";

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

export async function getPostsAction(data: ListPostQueryInput) {
  const parsed = listPostsQuerySchema.parse(data);
  const caller = await getServerCaller();
  const post = await caller.posts.list(parsed);

  console.log(post.posts, "TYpe", typeof post.posts);

  return { data: post.posts, success: true };
}

export type UpdatePostQueryInput = z.input<typeof updatePostSchema>;

export async function updatePostAction(data: UpdatePostQueryInput) {
  const parsed = updatePostSchema.parse(data);
  const caller = await getServerCaller();
  if (!parsed) return;
  const post = await caller.posts.update(parsed);

  return { post, success: true };
}

export async function deletePostAction(data: { id: string }) {
  const caller = await getServerCaller();
  await caller.posts.delete(data);

  return { success: true };
}
