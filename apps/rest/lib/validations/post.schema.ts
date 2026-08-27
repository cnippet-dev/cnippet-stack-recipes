import z from "zod";

export const listPostsQuerySchema = z.object({
  // For offset pagination:
  // page: z.coerce.number().int().min(1).default(1),

  // For cursor pagination
  cursor: z.string().cuid().optional(),
  limit: z.coerce.number().int().min(1).max(20).default(10),
  order: z.enum(["asc", "desc"]).default("desc"),
  search: z.string().trim().max(200).optional(),
  sort: z.enum(["createdAt", "updatedAt", "title"]).default("createdAt"),
  status: z.enum(["DRAFT", "ARCHIVED", "PUBLISHED"]).default("PUBLISHED"),
});

export const createPostSchema = z.object({
  authorId: z.string().uuid(),
  content: z.string().min(1),
  status: z.enum(["DRAFT", "PUBLISHED"]).default("DRAFT"),
  title: z.string().min(3).max(200),
});

export const updatePostSchema = createPostSchema
  .partial()
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one field must be provided.",
  });

export type ListPostQuery = z.infer<typeof listPostsQuerySchema>;
export type CreatePostInput = z.infer<typeof createPostSchema>;
export type UpdatePostInput = z.infer<typeof updatePostSchema>;
