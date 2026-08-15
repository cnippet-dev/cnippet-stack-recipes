"use client";

import { CircleAlertIcon } from "lucide-react";
import { useState } from "react";
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

  const handleFetch = async () => {
    try {
      setLoading(true);
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_APP_URL}/api/v1/post`,
        {
          cache: "no-store",
        },
      );

      if (!res.ok) {
        throw new Error(`Error fetching posts: ${res.status}`);
      }

      const json = await res.json();
      setPosts(json.data);
    } catch (error) {
      console.log(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="h-fit">
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
              {posts.slice(0, 4).map((post) => (
                <AccordionItem key={post.id} value={String(post.id)}>
                  <AccordionTrigger>
                    <div className="flex items-center gap-2">
                      {post.title}
                      {post.tags.map((tag, id) => (
                        <Badge
                          className="text-muted-foreground"
                          key={id}
                          style={{ fontSize: 11 }}
                          variant="outline"
                        >
                          {tag.name}
                        </Badge>
                      ))}
                    </div>
                  </AccordionTrigger>
                  <AccordionPanel>{post.content}</AccordionPanel>
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
