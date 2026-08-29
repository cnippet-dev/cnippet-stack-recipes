"use client";

import {
  CircleAlertIcon,
  DownloadIcon,
  InfoIcon,
  Trash2Icon,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { deletePostAction, fetchPostsAction } from "@/lib/actions/dal";
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
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";
import { Spinner } from "../ui/spinner";
import { toastManager } from "../ui/toast";

// TODO Fix accordion shift

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

export function Delete() {
  const [posts, setPosts] = useState<PostType[]>([]);
  const [fetching, setFetching] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deletingPost, setDeletingPost] = useState<PostType | null>(null);

  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    return () => abortRef.current?.abort();
  }, []);

  const handleFetch = async () => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    try {
      setFetching(true);

      const json = await fetchPostsAction();
      setPosts(Array.isArray(json.data) ? json.data : []);
      toastManager.add({ title: "Posts loaded.", type: "success" });
    } catch (error) {
      if ((error as Error).name === "AbortError") return;
      console.error(error);
      toastManager.add({ title: "Failed to load posts.", type: "error" });
    } finally {
      setFetching(false);
    }
  };

  const openDeleteDialog = (post: PostType) => {
    setDeletingPost(post);
  };

  const handleDelete = async () => {
    if (!deletingPost) return;
    const id = deletingPost.id;
    const prevPosts = posts;

    setPosts(posts.filter((post) => post.id !== id));

    try {
      setDeletingId(id);

      await deletePostAction(id);

      toastManager.add({ title: "Post deleted", type: "success" });
      setDeletingPost(null);
    } catch (error) {
      console.error(error);
      setPosts(prevPosts);
      toastManager.add({ title: "Failed to delete post.", type: "error" });
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <Card className="h-fit w-[320px] min-w-0 max-w-full">
      <CardHeader style={{ padding: "16px", paddingBottom: 0 }}>
        <CardTitle className="flex items-end gap-0 tracking-tighter">
          <p className="font-semibold text-4xl">D</p>
          <p className="text-lg">elete</p>
        </CardTitle>
      </CardHeader>
      <CardContent style={{ padding: "16px", paddingTop: 0 }}>
        <CardTitle className="flex items-center gap-1 text-muted-foreground text-sm">
          <Trash2Icon className="size-3 text-red-500" strokeWidth={2} />
          <p className="font-medium tracking-tight">Delete posts.</p>
        </CardTitle>

        <CardPanel className="mb-4 p-0">
          <Accordion className="w-full rounded-lg last:border-b">
            {posts.map((post) => (
              <AccordionItem
                className="mt-2 rounded-lg border p-2"
                key={post.id}
                value={String(post.id)}
              >
                <AccordionTrigger className="w-full py-0">
                  <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
                    <span className="flex min-w-0 items-center gap-2 truncate">
                      <Badge
                        // asChild
                        className="cursor-pointer"
                        variant="destructive"
                      >
                        <span
                          onClick={(e) => {
                            e.stopPropagation();
                            openDeleteDialog(post);
                          }}
                          role="button"
                          tabIndex={0}
                        >
                          <Trash2Icon className="size-3" />
                        </span>
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

                <AccordionPanel className="min-w-0">
                  <div className="wrap-break-word">{post.content}</div>
                </AccordionPanel>
              </AccordionItem>
            ))}
          </Accordion>
        </CardPanel>
        <CardFooter
          className="flex-col gap-2 px-0"
          style={{ padding: "4px 0 0 0" }}
        >
          <Button className="w-full" disabled={fetching} onClick={handleFetch}>
            {fetching ? (
              <Spinner />
            ) : (
              <>
                <DownloadIcon /> Get Posts
              </>
            )}
          </Button>
          <div className="flex gap-1 text-muted-foreground text-xs">
            <CircleAlertIcon className="size-3 h-lh shrink-0" />
            <p>This might take a few seconds to complete.</p>
          </div>
        </CardFooter>
      </CardContent>

      <Dialog
        onOpenChange={(open) => !open && setDeletingPost(null)}
        open={deletingPost !== null}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete post</DialogTitle>
          </DialogHeader>

          <div className="flex items-center px-6 pb-6">
            <Badge variant="info">
              <InfoIcon className="size-4" />
            </Badge>
            <p className="ml-1 text-muted-foreground">
              Are you sure you want to delete this post?
            </p>
          </div>

          <DialogFooter>
            <Button
              disabled={deletingId !== null}
              onClick={() => setDeletingPost(null)}
              variant="outline"
            >
              Cancel
            </Button>
            <Button
              disabled={deletingId !== null}
              onClick={handleDelete}
              variant="destructive"
            >
              {deletingId !== null ? <Spinner /> : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
