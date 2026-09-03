"use server";

import { createClient } from "@/utils/supabase/server";

export async function deletePostAction({ id }: { id: string }) {
  const supabase = await createClient();

  const { error } = await supabase.from("posts").delete().eq("id", id);

  if (error) {
    return {
      return: "Failed to delete post. Please try again.",
      success: false,
    };
  }

  return {
    error: null,
    success: true,
  };
}
