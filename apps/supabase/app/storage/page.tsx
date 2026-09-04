import { UploadCloud } from "lucide-react";
import MediaZone from "@/components/layout/mediaZone";
import UploadForm from "@/components/layout/uploadForm";
import { fetchFileAction } from "@/lib/actions/storage/storage";

export default async function Storage() {
  const data = await fetchFileAction();

  if (data.error) {
    return (
      <div className="p-6">
        <p className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-600 text-sm">
          Failed to load media: {data.error.message}
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black p-10">
      <div className="mx-auto mt-20 max-w-4xl space-y-6">
        <div className="rounded-3xl bg-white p-8">
          <h1 className="font-serif text-5xl leading-none tracking-tight">
            <span className="text-6xl">S</span>torage
          </h1>
          <p className="mt-2 flex items-center gap-1.5 text-muted-foreground text-sm">
            <UploadCloud className="h-4 w-4" />
            Upload a new image or video.
          </p>

          <div className="mt-6 border-t pt-6">
            <UploadForm />
          </div>
        </div>

        <MediaZone media={data.data} />
      </div>
    </div>
  );
}
