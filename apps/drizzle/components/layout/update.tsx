"use client";

import { CircleAlertIcon, DownloadIcon, PenBox, PenIcon } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { fetchPostsAction, updatePostsAction } from "@/lib/actions/dal";
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
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Spinner } from "../ui/spinner";
import { Textarea } from "../ui/textarea";
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

export function Update() {
  const [posts, setPosts] = useState<PostType[]>([]);
  const [fetching, setFetching] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const [editingPost, setEditingPost] = useState<PostType | null>(null);
  const [draftTitle, setDraftTitle] = useState("");
  const [draftContent, setDraftContent] = useState("");

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
      if (posts.length > 0) {
        toastManager.add({ title: "Posts loaded.", type: "success" });
      }
      toastManager.add({ title: "No posts available.", type: "success" });
    } catch (error) {
      if ((error as Error).name === "AbortError") return;
      console.error(error);
      toastManager.add({ title: "Failed to load posts.", type: "error" });
    } finally {
      setFetching(false);
    }
  };

  const openEditDialog = (post: PostType) => {
    setEditingPost(post);
    setDraftTitle(post.title);
    setDraftContent(post.content);
  };

  const handleUpdate = async () => {
    if (!editingPost) return;
    const id = editingPost.id;

    try {
      setUpdatingId(id);

      const updatedPost = await updatePostsAction(id, {
        content: draftContent,
        title: draftTitle,
      });

      setPosts((currentPosts) =>
        currentPosts.map((post) => (post.id === id ? updatedPost : post)),
      );
      toastManager.add({ title: "Post updated", type: "success" });
      setEditingPost(null);
    } catch (error) {
      console.error(error);
      toastManager.add({ title: "Failed to update post.", type: "error" });
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <Card className="h-fit w-[320px] min-w-0 max-w-full">
      <CardHeader style={{ padding: "16px", paddingBottom: 0 }}>
        <CardTitle className="flex items-end gap-0 tracking-tighter">
          <p className="font-semibold text-4xl">U</p>
          <p className="text-lg">pdate</p>
        </CardTitle>
      </CardHeader>
      <CardContent style={{ padding: "16px", paddingTop: 0 }}>
        <CardTitle className="flex items-center gap-1 text-muted-foreground text-sm">
          <PenBox className="size-3 text-blue-500" strokeWidth={2} />
          <p className="font-medium tracking-tight">Update posts.</p>
        </CardTitle>
        <CardPanel className="mb-4 p-0">
          <Accordion className="w-full rounded-lg last:border-b-1">
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
                        variant="info"
                      >
                        <span
                          onClick={(e) => {
                            e.stopPropagation();
                            openEditDialog(post);
                          }}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" || e.key === " ") {
                              e.stopPropagation();
                              e.preventDefault();
                              openEditDialog(post);
                            }
                          }}
                          role="button"
                          tabIndex={0}
                        >
                          <PenIcon className="size-3" />
                        </span>
                      </Badge>

                      {post.title}
                    </span>

                    {post.tags.map((tag) => (
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
                  <div className="break-words">{post.content}</div>
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
          <div className="flex gap-1 truncate text-muted-foreground text-xs">
            <CircleAlertIcon className="size-3 h-lh shrink-0" />
            <p>This might take a few seconds to complete.</p>
          </div>
        </CardFooter>
      </CardContent>

      <Dialog
        onOpenChange={(open) => !open && setEditingPost(null)}
        open={editingPost !== null}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit post</DialogTitle>
          </DialogHeader>

          <div className="flex flex-col gap-4 px-6 pb-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                onChange={(e) => setDraftTitle(e.target.value)}
                value={draftTitle}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="content">Content</Label>
              <Textarea
                id="content"
                onChange={(e) => setDraftContent(e.target.value)}
                rows={6}
                value={draftContent}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              disabled={updatingId !== null}
              onClick={() => setEditingPost(null)}
              variant="outline"
            >
              Cancel
            </Button>
            <Button disabled={updatingId !== null} onClick={handleUpdate}>
              {updatingId !== null ? <Spinner /> : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
