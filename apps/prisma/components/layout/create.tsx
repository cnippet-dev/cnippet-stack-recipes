"use client";

import { CircleAlertIcon } from "lucide-react";
import { useState } from "react";
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
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const form = e.currentTarget;
    const formData = new FormData(form);

    try {
      setLoading(true);

      const res = await fetch(
        `${process.env.NEXT_PUBLIC_APP_URL}/api/v1/post`,
        {
          body: JSON.stringify(Object.fromEntries(formData)),
          cache: "no-store",
          method: "POST",
        },
      );

      if (!res.ok) {
        throw new Error(
          `Failed to create post: ${res.status} ${res.statusText}`,
        );
      }

      form.reset();
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
        {/* <CardDescription>Create a new post.</CardDescription> */}
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
                  type="text"
                />
              </Field>
              <Field>
                <FieldLabel>Slug</FieldLabel>
                <Input
                  name="slug"
                  placeholder="slug-of-your-post"
                  type="text"
                />
              </Field>
              <Field>
                <FieldLabel>Content</FieldLabel>
                <Input
                  name="content"
                  placeholder="Title of your post"
                  type="text"
                />
              </Field>

              <Button className="w-full" type="submit">
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
