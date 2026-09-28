"use server";

import { cacheLife, cacheTag, revalidateTag } from "next/cache";

export async function createPostAction(data: {
  title: string;
  slug: string;
  content: string;
  tags: string[];
}) {
  const res = await fetch(`${process.env.API_URL}/api/v1/post`, {
    body: JSON.stringify(data),
    headers: {
      "Content-Type": "application/json",
    },
    method: "POST",
  });

  if (!res.ok) {
    const errBody = await res.json().catch(() => null);
    throw new Error(errBody?.error ?? `Error creating post: ${res.status}`);
  }

  revalidateTag("posts", "max");
  return res.json();
}

export async function fetchPostsAction() {
  "use cache";
  cacheTag("posts");
  cacheLife("minutes");

  const res = await fetch(`${process.env.API_URL}/api/v1/post?page=1&limit=4`);
  if (!res.ok) throw new Error(`Error fetching posts: ${res.status}`);

  return res.json();
}

export async function updatePostsAction(
  id: string,
  data: { title: string; content: string },
) {
  const res = await fetch(`${process.env.API_URL}/api/v1/post/${id}`, {
    body: JSON.stringify(data),
    headers: { "Content-Type": "application/json" },
    method: "PATCH",
  });

  if (!res.ok) {
    throw new Error(`Failed to update post: ${res.status} ${res.statusText}`);
  }

  const json = await res.json();
  revalidateTag("posts", "max");
  return json.data;
}

export async function deletePostAction(id: string) {
  const res = await fetch(`${process.env.API_URL}/api/v1/post/${id}`, {
    method: "DELETE",
  });

  if (!res.ok) {
    throw new Error(`Failed to delete post: ${res.status}`);
  }
  revalidateTag("posts", "max");
}
