"use client";

import { CircleAlertIcon, XIcon } from "lucide-react";
import { type KeyboardEvent, useState } from "react";
import { Button } from "../ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardPanel,
  CardTitle,
} from "../ui/card";
import { Field, FieldLabel } from "../ui/field";
import { Form } from "../ui/form";
import { Input } from "../ui/input";
import { Spinner } from "../ui/spinner";

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

      const res = await fetch("/api/v1/post", {
        body: JSON.stringify(payload),
        cache: "no-store",
        headers: {
          "Content-Type": "application/json",
        },
        method: "POST",
      });

      if (!res.ok) {
        throw new Error(
          `Failed to create post: ${res.status} ${res.statusText}`,
        );
      }

      form.reset();
      setTags([]);
      setTagInput("");
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="h-fit">
      <CardHeader>
        <CardTitle className="flex items-end gap-0 tracking-tighter">
          <p className="font-semibold text-4xl">C</p>
          <p className="text-lg">reate</p>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Card className="w-full max-w-xs">
          <CardHeader>
            <CardTitle>Create a new post.</CardTitle>
          </CardHeader>
          <CardPanel>
            <Form
              className="flex w-full flex-col gap-4"
              onSubmit={handleSubmit}
            >
              <Field>
                <FieldLabel>Title</FieldLabel>
                <Input
                  name="title"
                  placeholder="Title of your post"
                  required
                  type="text"
                />
              </Field>
              <Field>
                <FieldLabel>Slug</FieldLabel>
                <Input
                  name="slug"
                  placeholder="slug-of-your-post"
                  required
                  type="text"
                />
              </Field>
              <Field>
                <FieldLabel>Content</FieldLabel>
                <Input
                  className="h-24"
                  name="content"
                  placeholder="Content of your post"
                  required
                  type="text"
                />
              </Field>
              <Field>
                <FieldLabel>Tags</FieldLabel>
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
                {loading ? <Spinner /> : <>Create</>}
              </Button>
            </Form>
          </CardPanel>
          <CardFooter>
            <div className="flex gap-1 text-muted-foreground text-xs">
              <CircleAlertIcon className="size-3 h-lh shrink-0" />
              <p>This might take a few seconds to complete.</p>
            </div>
          </CardFooter>
        </Card>
      </CardContent>
    </Card>
  );
}
