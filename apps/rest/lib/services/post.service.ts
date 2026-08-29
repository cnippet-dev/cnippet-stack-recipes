import type { Prisma } from "@/app/generated/prisma/client";
import { NotFound } from "../api/errors";
import prisma from "../db/prisma";
import type {
  CreatePostInput,
  ListPostQuery,
  UpdatePostInput,
} from "../validations/post.schema";

export const postService = {
  async createPost(data: CreatePostInput) {
    return prisma.post.create({
      data: {
        content: data.content,
        metadata: data.metadata as Prisma.InputJsonValue | undefined,
        slug: data.slug,
        tags: data.tags?.length
          ? {
              connectOrCreate: data.tags.map((name) => ({
                create: { name },
                where: { name },
              })),
            }
          : undefined,
        title: data.title,
      },
      include: {
        tags: true,
      },
    });
  },
  async deletePost(id: string) {
    return prisma.post.delete({ where: { id } });
  },

  // Offset Pagination
  // const [totalItems, posts] = await prisma.$transaction([
  //   prisma.post.count({ where }),
  //   prisma.post.findMany({
  //     where,
  //     orderBy: { [sort]: order },
  //     skip: (page - 1) * limit,
  //     take: limit,
  //     include: {
  //       author: {
  //         select: {
  //           id: true,
  //           name: true,
  //         },
  //       },
  //     },
  //   }),
  // ]);

  // return {
  //   page,
  //   posts,
  //   meta: {
  //     limit,
  //     totalItems,
  //     totalPages: Math.ceil(totalItems / limit),
  //   },
  // };

  async getPost(id: string) {
    const post = await prisma.post.findUnique({
      where: { id },
    });

    if (!post) {
      throw NotFound("Post");
    }

    return { post };
  },

  async listPosts(query: ListPostQuery) {
    const { cursor, limit, page, search, sortBy, sortOrder, tag } = query;

    const where: Prisma.PostWhereInput = {
      ...(query.tag && { tags: { some: { name: tag } } }),
      ...(search && {
        OR: [
          { title: { contains: search, mode: "insensitive" } },
          { content: { contains: search, mode: "insensitive" } },
        ],
      }),
    };

    const [totalItems, posts] = await prisma.$transaction([
      prisma.post.count({ where }),
      prisma.post.findMany({
        ...(cursor && { cursor: { id: cursor }, skip: 1 }),
        orderBy: { [sortBy]: sortOrder },
        skip: (page - 1) * limit,
        take: limit + 1,
        where,
      }),
    ]);

    let nextCursor: string | null = null;

    if (posts.length > limit) {
      const nextItem = posts.pop()!;
      nextCursor = nextItem.id;
    }

    return {
      meta: {
        limit,
        nextCursor,
        totalItems,
        totalPages: Math.ceil(totalItems / limit),
      },
      posts,
    };
  },

  async updatePost(id: string, input: UpdatePostInput) {
    return prisma.post.update({ data: input, where: { id } });
  },
};
