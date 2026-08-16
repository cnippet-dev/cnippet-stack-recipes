"use client";

import { CircleAlertIcon } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import {
  Accordion,
  AccordionItem,
  AccordionPanel,
  AccordionTrigger,
} from "../ui/accordion";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardPanel,
  CardTitle,
} from "../ui/card";
import { Spinner } from "../ui/spinner";
import { toastManager } from "../ui/toast";

// TODO Fix accordion shift

type TagType = {
  id: string;
  name: string;
};

type PostType = {
  id: number;
  title: string;
  slug: string;
  content: string;
  tags: TagType[];
};

export function Read() {
  const [posts, setPosts] = useState<PostType[]>([]);
  const [loading, setLoading] = useState(false);

  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    return () => abortRef.current?.abort();
  }, []);

  const handleFetch = async () => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    try {
      setLoading(true);
      const res = await fetch("/api/v1/post?page=1&limit=4", {
        cache: "no-store",
        signal: controller.signal,
      });

      if (!res.ok) {
        throw new Error(`Error fetching posts: ${res.status}`);
      }

      const json = await res.json();
      setPosts(Array.isArray(json.data) ? json.data : []);
      toastManager.add({ title: "Posts loaded.", type: "success" });
    } catch (error) {
      if ((error as Error).name === "AbortError") return;
      console.error(error);
      toastManager.add({ title: "Failed to load posts.", type: "error" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="h-fit w-fit">
      <CardHeader>
        <CardTitle className="flex items-end gap-0 tracking-tighter">
          <p className="font-semibold text-4xl">R</p>
          <p className="text-lg">ead</p>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Card className="w-full max-w-xs">
          <CardHeader>
            <CardTitle>Get all posts.</CardTitle>
          </CardHeader>
          <CardPanel>
            <Accordion className="w-full">
              {posts.map((post) => (
                <AccordionItem key={post.id} value={String(post.id)}>
                  <AccordionTrigger className="w-full">
                    <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
                      <span className="min-w-0 truncate">{post.title}</span>

                      {post.tags.map((tag, id) => (
                        <Badge
                          className="shrink-0 text-muted-foreground"
                          key={id}
                          style={{ fontSize: 11 }}
                          variant="outline"
                        >
                          {tag.name}
                        </Badge>
                      ))}
                    </div>
                  </AccordionTrigger>

                  <AccordionPanel className="min-w-0">
                    <div className="break-words">{post.content}</div>
                  </AccordionPanel>
                </AccordionItem>
              ))}
            </Accordion>
          </CardPanel>
          <CardFooter className="flex-col gap-4">
            <Button className="w-full" disabled={loading} onClick={handleFetch}>
              {loading ? <Spinner /> : <>Get</>}
            </Button>
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
