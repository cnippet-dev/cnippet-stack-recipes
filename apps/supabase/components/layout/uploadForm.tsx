"use client";

import { useRef, useState, useTransition } from "react";
import { uploadFile } from "@/lib/actions/storage";

export default function UploadForm() {
  const formRef = useRef<HTMLFormElement>(null);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      try {
        await uploadFile(formData);
        formRef.current?.reset();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Upload failed");
      }
    });
  }

  return (
    <form
      action={handleSubmit}
      className="flex items-center gap-2"
      ref={formRef}
    >
      <input
        accept="image/*,video/*"
        className="text-sm"
        name="file"
        required
        type="file"
      />
      <button
        className="rounded bg-black px-3 py-1.5 text-sm text-white disabled:opacity-50"
        disabled={isPending}
        type="submit"
      >
        {isPending ? "Uploading..." : "Upload"}
      </button>
      {error && <p className="text-red-600 text-sm">{error}</p>}
    </form>
  );
}
