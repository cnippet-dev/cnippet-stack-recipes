"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/utils/supabase/server";

export async function fetchPostsAction() {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("posts")
    .select(`
    id,
    title,
    slug,
    content,
    metadata,
    created_at,
    updated_at,
    post_tags (
      tags ( id, name )
    )
  `)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[fetchPostsAction]", error);
    return {
      error: "Failed to fetch posts. Please try again.",
      success: false,
    };
  }
  revalidatePath("/posts");
  return { data, success: true };
}
