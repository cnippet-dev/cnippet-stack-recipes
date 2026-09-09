"use client";

import { ImageIcon, Trash2Icon } from "lucide-react";
import Image from "next/image";
import { deleteFileAction } from "@/lib/actions/storage/storage";
import { createClient } from "@/utils/supabase/client";

type MediaProps = {
  bucket: string;
  created_at: string;
  id: string;
  path: string;
  type: string;
}[];

export default function MediaZone({ media }: { media: MediaProps }) {
  const supabase = createClient();

  async function deleteFileHandler(id: string, path: string) {
    await deleteFileAction({ id, path });
  }

  return (
    <>
      {media?.length > 0 ? (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          {media.map((item) => {
            const { data } = supabase.storage
              .from(item.bucket)
              .getPublicUrl(item.path);

            return (
              <div
                className="group relative overflow-hidden rounded-xl bg-white"
                key={item.id}
              >
                <button
                  className="absolute top-2 right-2 z-10 cursor-pointer rounded-sm bg-white p-1"
                  onClick={() => deleteFileHandler(item.id, item.path)}
                  type="button"
                >
                  <Trash2Icon
                    className="size-3.5 text-red-500"
                    strokeWidth={2}
                  />
                </button>

                {item.type === "image" ? (
                  <Image
                    alt="Post media"
                    className="h-40 w-full object-cover transition-transform duration-300 group-hover:scale-105"
                    height={450}
                    src={data.publicUrl}
                    width={800}
                  />
                ) : (
                  // biome-ignore lint/a11y/useMediaCaption: no track
                  <video
                    className="h-40 w-full object-cover"
                    controls
                    src={data.publicUrl}
                  />
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="flex flex-col items-center gap-2 rounded-3xl bg-white py-16 text-center">
          <ImageIcon className="h-6 w-6 text-muted-foreground" />
          <p className="text-muted-foreground text-sm">
            No media uploaded yet.
          </p>
        </div>
      )}
    </>
  );
}
