import Image from "next/image";
import UploadForm from "@/components/layout/uploadForm";
import { createClient } from "@/utils/supabase/server";

export default async function Storage() {
  const supabase = await createClient();

  const { data: media, error } = await supabase
    .from("post_media")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    return (
      <p className="p-6 text-red-600">Failed to load media: {error.message}</p>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <UploadForm />

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        {media?.map((item) => {
          const { data } = supabase.storage
            .from(item.bucket)
            .getPublicUrl(item.path);

          return item.type === "image" ? (
            <Image
              alt="Post media"
              className="h-auto w-full rounded object-cover"
              height={450}
              key={item.id}
              src="https://naaoqefyrpkekqpbrcap.supabase.co/storage/v1/object/public/post-media/Screenshot%202026-09-04%20at%2011.46.11%20AM.png"
              width={800}
            />
          ) : (
            <video
              className="w-full rounded"
              controls
              key={item.id}
              src={data.publicUrl}
            />
          );
        })}
      </div>

      {media?.length === 0 && (
        <p className="text-gray-500 text-sm">No media uploaded yet.</p>
      )}
    </div>
  );
}
