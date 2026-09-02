"use server";

import { createClient } from "@/utils/supabase/server";

export async function fetchPostsActions() {
  const supabase = await createClient();
  console.log("hello");

  const { data: posts, error } = await supabase
    .from("posts")
    .select("id, title");

  console.log(posts);
  return posts;
}
