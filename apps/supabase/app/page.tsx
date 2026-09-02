"use client";

import { useState } from "react";
import { fetchPostsActions } from "@/lib/actions/dal";

export default function Home() {
  const [posts, setPosts] = useState<{ id: string; title: string }[] | null>(
    [],
  );

  const fetchPosts = async () => {
    const res = await fetchPostsActions();
    setPosts(res);
  };

  return (
    <div>
      <div>
        {posts?.map((post) => (
          <p key={post.id}>{post.title}</p>
        ))}
      </div>
      <button onClick={fetchPosts}>Fetch</button>
    </div>
  );
}
