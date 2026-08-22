import { defineRelations } from "drizzle-orm";
import * as schema from "./schema";

export const relations = defineRelations(schema, (r) => ({
  posts: {
    tags: r.many.tags({
      from: r.posts.id.through(r.postsToTags.postId),
      to: r.tags.id.through(r.postsToTags.tagId),
    }),
  },
  tags: {
    posts: r.many.posts({
      from: r.tags.id.through(r.postsToTags.tagId),
      to: r.posts.id.through(r.postsToTags.postId),
    }),
  },
}));
