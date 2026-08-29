"use client";

import {
  BookTextIcon,
  CircleAlertIcon,
  DownloadIcon,
  ListIcon,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { fetchPostsAction } from "@/lib/actions/dal";
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

type TagType = {
  id: string;
  name: string;
};

type PostType = {
  id: string;
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
      const json = await fetchPostsAction();

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
    <Card className="h-fit w-[320px] min-w-0 max-w-full">
      <CardHeader style={{ padding: "16px", paddingBottom: 0 }}>
        <CardTitle className="flex items-end gap-0 tracking-tighter">
          <p className="font-semibold text-4xl">R</p>
          <p className="text-lg">ead</p>
        </CardTitle>
      </CardHeader>

      <CardContent
        className="min-w-0"
        style={{ padding: "16px", paddingTop: 0 }}
      >
        <CardTitle className="flex items-center gap-1 text-muted-foreground text-sm">
          <ListIcon className="size-3 text-blue-500" strokeWidth={3} />
          <p className="font-medium tracking-tight">Get all posts.</p>
        </CardTitle>

        <CardPanel className="mb-4 min-w-0 p-0">
          <Accordion className="w-full min-w-0 rounded-lg last:border-b">
            {posts.map((post) => (
              <AccordionItem
                className="mt-2 min-w-0 rounded-lg border p-2"
                key={post.id}
                value={String(post.id)}
              >
                <AccordionTrigger className="w-full min-w-0 py-0">
                  <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
                    <span className="flex min-w-0 items-center gap-2 truncate">
                      <Badge
                        // asChild
                        className="cursor-pointer"
                        variant="success"
                      >
                        <button type="button" tabIndex={0}>
                          <BookTextIcon className="size-3" />
                        </button>
                      </Badge>
                      {post.title}
                    </span>

                    {post.tags?.map((tag) => (
                      <Badge
                        className="shrink-0 text-muted-foreground"
                        key={tag.id}
                        style={{ fontSize: 11 }}
                        variant="outline"
                      >
                        {tag.name}
                      </Badge>
                    ))}
                  </div>
                </AccordionTrigger>

                <AccordionPanel className="min-w-0 max-w-full py-1">
                  <div className="wrap-anywhere max-w-full">{post.content}</div>
                </AccordionPanel>
              </AccordionItem>
            ))}
          </Accordion>
        </CardPanel>

        <CardFooter
          className="flex-col gap-2 px-0"
          style={{ padding: "4px 0 0 0" }}
        >
          <Button className="w-full" disabled={loading} onClick={handleFetch}>
            {loading ? (
              <Spinner />
            ) : (
              <>
                <DownloadIcon /> Get Posts
              </>
            )}
          </Button>

          <div className="flex gap-1 truncate text-muted-foreground text-xs">
            <CircleAlertIcon className="size-3 h-lh shrink-0" />
            <p>This might take a few seconds to complete.</p>
          </div>
        </CardFooter>
      </CardContent>
    </Card>
  );
}
