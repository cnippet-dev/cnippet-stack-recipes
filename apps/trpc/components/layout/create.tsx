"use client";

import { CircleAlertIcon, PlusIcon, XIcon } from "lucide-react";
import type { KeyboardEvent } from "react";
import { useState } from "react";
import { createPostActon } from "@/lib/actions/dal";
import { Button } from "../ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "../ui/card";
import { Field, FieldLabel } from "../ui/field";
import { Form } from "../ui/form";
import { Input } from "../ui/input";
import { Spinner } from "../ui/spinner";
import { Textarea } from "../ui/textarea";
import { toastManager } from "../ui/toast";

export function Create() {
  const [loading, setLoading] = useState<boolean>(false);
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState<string>("");

  const addTag = (value: string) => {
    const trimmed = value.trim();
    if (!trimmed) return;

    setTags((prev) =>
      prev.some((t) => t.toLowerCase() === trimmed.toLowerCase())
        ? prev
        : [...prev, trimmed],
    );
    setTagInput("");
  };

  const removeTag = (tagToRemove: string) => {
    setTags((prev) => prev.filter((t) => t !== tagToRemove));
  };

  const handleTagKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === ",") {
      e.preventDefault();
      addTag(tagInput);
    } else if (e.key === "Backspace" && !tagInput && tags.length > 0) {
      removeTag(tags[tags.length - 1]);
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const form = e.currentTarget;
    const formData = new FormData(form);

    const payload = {
      content: String(formData.get("content") ?? ""),
      slug: String(formData.get("slug") ?? ""),
      tags,
      title: String(formData.get("title") ?? ""),
    };

    try {
      setLoading(true);

      await createPostActon({
        content: payload.content,
        slug: payload.slug,
        tags: payload.tags,
        title: payload.title,
      });

      toastManager.add({
        title: "Post created successfully.",
        type: "success",
      });

      form.reset();
      setTags([]);
      setTagInput("");
    } catch (error) {
      toastManager.add({ title: "Failed to create post.", type: "error" });
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="h-fit w-[320px] min-w-0 max-w-full">
      <CardHeader style={{ padding: "16px", paddingBottom: 0 }}>
        <CardTitle className="flex items-end gap-0 tracking-tighter">
          <p className="font-semibold text-4xl">C</p>
          <p className="text-lg">reate</p>
        </CardTitle>
      </CardHeader>
      <CardContent style={{ padding: "16px", paddingTop: 0 }}>
        <CardTitle className="flex items-center gap-1 text-muted-foreground text-sm">
          <PlusIcon className="size-3 text-blue-500" strokeWidth={3} />
          <p className="font-medium tracking-tight">Create a new posts.</p>
        </CardTitle>

        <Form
          className="mt-4 flex w-full flex-col gap-4"
          onSubmit={handleSubmit}
        >
          <Field className="gap-0">
            <FieldLabel className="text-muted-foreground tracking-tight">
              Title
            </FieldLabel>
            <Input
              name="title"
              placeholder="Title of your post"
              required
              type="text"
            />
          </Field>
          <Field className="gap-0">
            <FieldLabel className="text-muted-foreground tracking-tight">
              Slug
            </FieldLabel>
            <Input
              name="slug"
              placeholder="slug-of-your-post"
              required
              type="text"
            />
          </Field>
          <Field className="gap-0">
            <FieldLabel className="text-muted-foreground tracking-tight">
              Content
            </FieldLabel>
            <Textarea
              name="content"
              placeholder="Content of your post"
              required
              rows={10}
            />
          </Field>
          <Field className="gap-0">
            <FieldLabel className="text-muted-foreground tracking-tight">
              Tags
            </FieldLabel>
            <Input
              onBlur={() => addTag(tagInput)}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={handleTagKeyDown}
              placeholder="Press , to add"
              type="text"
              value={tagInput}
            />
            {tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5 pt-1">
                {tags.map((tag) => (
                  <span
                    className="flex items-center gap-1 rounded-full bg-muted px-2.5 py-1 text-xs"
                    key={tag}
                  >
                    {tag}
                    <button
                      aria-label={`Remove ${tag}`}
                      className="text-muted-foreground hover:text-foreground"
                      onClick={() => removeTag(tag)}
                      type="button"
                    >
                      <XIcon className="size-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </Field>

          <Button className="w-full" disabled={loading} type="submit">
            {loading ? (
              <Spinner />
            ) : (
              <>
                <PlusIcon className="size-3" strokeWidth={3} />
                Create Post
              </>
            )}
          </Button>
        </Form>

        <CardFooter className="px-0" style={{ padding: "4px 0 0 0" }}>
          <div className="flex gap-1 truncate text-muted-foreground text-xs">
            <CircleAlertIcon className="size-3 h-lh shrink-0" />
            <p>This might take a few seconds to complete.</p>
          </div>
        </CardFooter>
      </CardContent>
    </Card>
  );
}
