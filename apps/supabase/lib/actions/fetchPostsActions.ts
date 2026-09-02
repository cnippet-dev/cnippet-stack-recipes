"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/utils/supabase/server";
import {
  type CreatePostInput,
  createPostSchema,
} from "../validations/post.schema";

export async function fetchPostsAction(input: CreatePostInput) {
  const parsed = createPostSchema.safeParse(input);

  if (!parsed.success) {
    return {
      error: "Invalid input",
      fieldErrors: parsed.error.flatten().fieldErrors,
      success: false,
    };
  }

  const supabase = await createClient();

  const { data, error } = await supabase
    .rpc("create_post_with_tags", {
      p_content: parsed.data.content,
      p_metadata: parsed.data.metadata ?? null,
      p_slug: parsed.data.slug,
      p_tags: parsed.data.tags,
      p_title: parsed.data.title,
    })
    .single();

  if (error) {
    if (error.code === "23505") {
      return {
        error: "A post with this slug already exists.",
        fieldErrors: { slug: ["Slug already in use"] },
        success: false,
      };
    }

    console.error("[createPostAction]", error);
    return {
      error: "Failed to create post. Please try again.",
      success: false,
    };
  }

  revalidatePath("/posts");
  return { data, success: true };
}
