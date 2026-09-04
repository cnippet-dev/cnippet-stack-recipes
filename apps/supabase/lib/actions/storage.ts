"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/utils/supabase/server";

export async function uploadFile(formData: FormData) {
  const file = formData.get("file") as File;

  if (!file) {
    throw new Error("Missing file.");
  }

  const supabase = await createClient();
  const filePath = `${Date.now()}-${file.name}`;

  const { data, error } = await supabase.storage
    .from("post-media")
    .upload(filePath, file);

  if (error) throw error;

  const { error: dbError } = await supabase.from("post_media").insert({
    bucket: "post-media",
    path: data.path,
    type: file.type.startsWith("video") ? "video" : "image",
  });

  if (dbError) throw dbError;

  revalidatePath("/storage");
}
