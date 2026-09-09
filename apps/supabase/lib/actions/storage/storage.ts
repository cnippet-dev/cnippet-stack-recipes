"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/utils/supabase/server";

function sanitizeFileName(name: string) {
  const lastDot = name.lastIndexOf(".");
  const base = lastDot !== -1 ? name.slice(0, lastDot) : name;
  const ext = lastDot !== -1 ? name.slice(lastDot) : "";

  const safeBase = base
    .normalize("NFKD")
    .replace(/[^\w-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");

  return `${safeBase}${ext}`;
}

export async function uploadFileAction(formData: FormData) {
  const file = formData.get("file") as File;

  if (!file) {
    return {
      error: "No file recieved",
      success: false,
    };
  }

  const supabase = await createClient();
  const filePath = `${Date.now()}-${sanitizeFileName(file.name)}`;

  const { data, error } = await supabase.storage
    .from("post-media")
    .upload(filePath, file);

  if (error) {
    return {
      error: error.message,
      success: false,
    };
  }

  const { error: dbError } = await supabase
    .from("post_media")
    .insert({
      bucket: "post-media",
      path: data.path,
      type: file.type.startsWith("video") ? "video" : "image",
    })
    .select();

  if (dbError) {
    return {
      error: dbError.message,
      success: false,
    };
  }

  revalidatePath("/storage");
  return {
    data,
    success: true,
  };
}

export async function fetchFileAction() {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("post_media")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    return { error: error.message, success: false };
  }

  return { data, success: true };
}

export async function deleteFileAction({
  id,
  path,
}: {
  id: string;
  path: string;
}) {
  const supabase = await createClient();

  const { error } = await supabase.storage.from("post_media").remove([path]);
  if (error) {
    return { error: error.message, success: false };
  }

  const { error: dbError } = await supabase
    .from("post_media")
    .delete()
    .eq("id", id);

  if (dbError) {
    return { error: dbError.message, success: false };
  }

  revalidatePath("/storage");
  return { success: true };
}
