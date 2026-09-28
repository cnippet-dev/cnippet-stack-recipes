"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/utils/supabase/server";
import {
  type UpdatePostInput,
  updatePostSchema,
} from "../../validations/post.schema";

export async function updatePostActions(id: string, input: UpdatePostInput) {
  const parsed = updatePostSchema.safeParse(input);

  if (!parsed.success) {
    return {
      error: "Invalid input",
      fieldErrors: parsed.error.flatten().fieldErrors,
      success: false,
    };
  }
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("posts")
    .update({ content: parsed.data.content, title: parsed.data.title })
    .eq("id", id)
    .select(`
      id, 
      title, 
      slug, 
      content, 
      metadata, 
      created_at, 
      updated_at, 
      post_tags (
        tags (id, name)
      )`);

  if (error) {
    return {
      error: "Failed to update the post. Please try again.",
      success: false,
    };
  }

  revalidatePath("/posts");
  return { data, success: true };
}
