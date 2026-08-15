import { z } from "zod";

export const createPostSchema = z.object({
  content: z.string().trim().min(1, "Content is required"),
  metadata: z.record(z.string(), z.unknown()).optional(),
  slug: z
    .string()
    .trim()
    .min(1, "Slug is required")
    .max(200)
    .regex(
      /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
      "Slug must be lowercase, alphanumeric, and hyphen-separated",
    ),
  tags: z.array(z.string().trim().min(1).max(20)).optional().default([]),
  title: z
    .string()
    .trim()
    .min(1, "Title is required")
    .max(200, "Title must be 200 characters or fewer"),
});

export type CreatePostInput = z.infer<typeof createPostSchema>;

export const getPostsQuerySchema = z.object({
  limit: z.coerce.number().int().positive().max(100).default(10),
  page: z.coerce.number().int().positive().default(1),
  search: z.string().trim().min(1).max(200).optional(),
  sortBy: z
    .enum(["createdAt", "updatedAt", "views", "title"])
    .default("createdAt"),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
  tag: z.string().trim().min(1).optional(),
});

export const postIdParamSchema = z.object({
  id: z.coerce.number().int().positive(),
});

export const updatePostSchema = createPostSchema.partial();
