"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { PenBox, PenIcon } from "lucide-react";
import { useState } from "react";
import { useTRPC } from "@/trpc/client";
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

const listInput = { limit: 4, page: 1 };

export function Update() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  const { data, isFetching } = useQuery(
    trpc.posts.list.queryOptions(listInput),
  );
  const posts = data?.posts ?? [];

  const [editingPost, setEditingPost] = useState<PostType | null>(null);
  const [draftTitle, setDraftTitle] = useState("");
  const [draftContent, setDraftContent] = useState("");

  const updatePost = useMutation(
    trpc.posts.update.mutationOptions({
      onError: () => {
        toastManager.add({ title: "Failed to update post.", type: "error" });
      },
      onSuccess: () => {
        queryClient.invalidateQueries({
          queryKey: trpc.posts.list.queryKey(listInput),
        });
        toastManager.add({ title: "Post updated", type: "success" });
        setEditingPost(null);
      },
    }),
  );

  const openEditDialog = (post: PostType) => {
    setEditingPost(post);
    setDraftTitle(post.title);
    setDraftContent(post.content);
  };

  const handleUpdate = () => {
    if (!editingPost) return;
    updatePost.mutate({
      content: draftContent,
      id: editingPost.id,
      title: draftTitle,
    });
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
                      <Badge className="cursor-pointer" variant="info">
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
          {isFetching && (
            <div className="flex items-center gap-2 text-muted-foreground text-xs">
              <Spinner /> Syncing...
            </div>
          )}
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
              disabled={updatePost.isPending}
              onClick={() => setEditingPost(null)}
              variant="outline"
            >
              Cancel
            </Button>
            <Button disabled={updatePost.isPending} onClick={handleUpdate}>
              {updatePost.isPending ? <Spinner /> : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
