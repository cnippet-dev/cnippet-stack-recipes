"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { InfoIcon, Trash2Icon } from "lucide-react";
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

const listInput = { limit: 4, page: 1 };
export function Delete() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  const { data, isFetching } = useQuery(
    trpc.posts.list.queryOptions(listInput),
  );

  const posts = data?.posts ?? [];

  const [deletingPost, setDeletingPost] = useState<PostType | null>(null);

  const deletePost = useMutation(
    trpc.posts.delete.mutationOptions({
      onError: () => {
        toastManager.add({ title: "Failed to update post", type: "error" });
        setDeletingPost(null);
      },
      onSuccess: () => {
        queryClient.invalidateQueries({
          queryKey: trpc.posts.list.queryKey(listInput),
        });
        toastManager.add({ title: "Post deleted", type: "success" });
        setDeletingPost(null);
      },
    }),
  );

  const openDeleteDialog = (post: PostType) => {
    setDeletingPost(post);
  };

  const handleDelete = () => {
    if (!deletingPost) return;
    deletePost.mutate({ id: deletingPost.id });
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
                          onKeyDown={(event) => {
                            if (event.key === "Enter" || event.key === " ") {
                              event.preventDefault();
                              openDeleteDialog(post);
                            }
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
          {isFetching && (
            <div className="flex items-center gap-2 text-muted-foreground text-xs">
              <Spinner /> Syncing...
            </div>
          )}
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
              disabled={deletePost.isPending}
              onClick={() => setDeletingPost(null)}
              variant="outline"
            >
              Cancel
            </Button>
            <Button
              disabled={deletePost.isPending}
              onClick={handleDelete}
              variant="destructive"
            >
              {deletePost.isPending ? <Spinner /> : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
