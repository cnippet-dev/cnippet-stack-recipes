"use server";

import { revalidateTag } from "next/cache";
import type z from "zod";
import { getServerCaller } from "@/trpc/server";
import { handleActionError } from "../action-result";
import {
  createPostSchema,
  deletePostSchema,
  listPostsQuerySchema,
  updatePostSchema,
} from "../validations/post.schema";

export type CreatePostQueryInput = z.input<typeof createPostSchema>;

export async function createPostAction(data: CreatePostQueryInput) {
  try {
    const parsed = createPostSchema.parse(data);
    const caller = await getServerCaller();
    const post = await caller.posts.create(parsed);

    revalidateTag("posts", "max");

    return { data: post, success: true };
  } catch (err) {
    return handleActionError(err);
  }
}

export type ListPostQueryInput = z.input<typeof listPostsQuerySchema>;

export async function getPostsAction(data: ListPostQueryInput) {
  try {
    const parsed = listPostsQuerySchema.parse(data);
    const caller = await getServerCaller();
    const result = await caller.posts.list(parsed);

    revalidateTag("posts", "max");

    return { data: result.posts, success: true };
  } catch (err) {
    return handleActionError(err);
  }
}

export type UpdatePostQueryInput = z.input<typeof updatePostSchema>;

export async function updatePostAction(data: UpdatePostQueryInput) {
  try {
    const parsed = updatePostSchema.parse(data);
    const caller = await getServerCaller();
    const post = await caller.posts.update(parsed);

    revalidateTag("posts", "max");

    return { data: post, success: true };
  } catch (err) {
    return handleActionError(err);
  }
}

export type DeletePostQueryInput = z.input<typeof deletePostSchema>;

export async function deletePostAction(data: { id: string }) {
  try {
    const parsed = deletePostSchema.parse(data);
    const caller = await getServerCaller();
    await caller.posts.delete(parsed);

    revalidateTag("posts", "max");

    return { data: { id: parsed.id }, success: true };
  } catch (err) {
    return handleActionError(err);
  }
}
