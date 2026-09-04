"use client";

import { Plus } from "lucide-react";
import { useRef, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { uploadFileAction } from "@/lib/actions/storage/storage";

export default function UploadForm() {
  const formRef = useRef<HTMLFormElement>(null);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      try {
        await uploadFileAction(formData);
        formRef.current?.reset();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Upload failed");
      }
    });
  }

  return (
    <form action={handleSubmit} className="space-y-3" ref={formRef}>
      <div className="space-y-2">
        <Label htmlFor="file">File</Label>
        <Input
          accept="image/*,video/*"
          id="file"
          name="file"
          required
          type="file"
        />
      </div>

      <Button className="w-full" disabled={isPending} type="submit">
        <Plus className="h-4 w-4" />
        {isPending ? "Uploading..." : "Upload"}
      </Button>

      <p className="text-muted-foreground text-xs">
        This might take a few seconds to complete.
      </p>

      {error && <p className="text-red-600 text-sm">{error}</p>}
    </form>
  );
}
