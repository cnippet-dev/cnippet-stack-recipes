"use server";

import { revalidateTag } from "next/cache";

export async function createPostActon(data: {
  title: string;
  slug: string;
  content: string;
  tags: string[];
}) {
  const res = await fetch(`${process.env.API_URL}/api/v1/posts`, {
    body: JSON.stringify(data),
    headers: { "Content-Type": "application/json" },
    method: "POST",
  });

  if (!res.ok) {
    const errBody = await res.json().catch(() => null);
    throw new Error(errBody?.error ?? `Error creating post: ${res.status}`);
  }

  revalidateTag("posts", "max");
  return res.json();
}
