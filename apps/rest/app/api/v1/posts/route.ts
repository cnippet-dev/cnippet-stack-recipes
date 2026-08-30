import { withErrorHandler } from "@/lib/api/handler";
import { created, ok } from "@/lib/api/responses";
import { parseBody, parseQuery } from "@/lib/api/validate";
import { postService } from "@/lib/services/post.service";
import {
  createPostSchema,
  listPostsQuerySchema,
} from "@/lib/validations/post.schema";

export const GET = withErrorHandler(
  async (request) => {
    const query = await parseQuery(request, listPostsQuerySchema);
    const { posts, meta } = await postService.listPosts(query);

    return ok(posts, meta);
  },
  { rateLimit: { limit: 60 } },
);

export const POST = withErrorHandler(
  async (request) => {
    const input = await parseBody(request, createPostSchema);
    const post = await postService.createPost(input);

    return created(post, `/api/v1/posts/${post.id}`);
  },
  { rateLimit: { limit: 20 } },
);
