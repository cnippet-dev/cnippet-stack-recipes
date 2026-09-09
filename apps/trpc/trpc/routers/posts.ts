import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { Prisma } from "@/app/generated/prisma/client";
import {
  createPostSchema,
  listPostsQuerySchema,
  updatePostSchema,
} from "@/lib/validations/post.schema";
import { baseProcedure, createTRPCRouter, protectedProcedure } from "../init";

function handlePrismaError(
  error: unknown,
  fallbackMessage: string,
  uniqueFieldMessages: Record<string, string> = {},
): never {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    switch (error.code) {
      case "P2002": {
        const target = (error.meta?.target as string[] | undefined) ?? [];
        const field = target[0];
        const message =
          (field && uniqueFieldMessages[field]) ??
          "A record with these unique fields already exists";
        throw new TRPCError({ cause: error, code: "CONFLICT", message });
      }

      case "P2025":
        throw new TRPCError({
          cause: error,
          code: "NOT_FOUND",
          message: "Post not found",
        });

      case "P2023":
        throw new TRPCError({
          cause: error,
          code: "BAD_REQUEST",
          message: "Invalid identifier format",
        });
    }
  }

  throw new TRPCError({
    cause: error,
    code: "INTERNAL_SERVER_ERROR",
    message: fallbackMessage,
  });
}

const idSchema = z.object({ id: z.string().uuid() });
const updatePostInputSchema = updatePostSchema.extend({
  id: z.string().uuid(),
});

export const postsRouter = createTRPCRouter({
  create: protectedProcedure
    .input(createPostSchema)
    .mutation(async ({ ctx, input }) => {
      try {
        return await ctx.prisma.post.create({
          data: {
            content: input.content,
            metadata: input.metadata as Prisma.InputJsonValue | undefined,
            slug: input.slug,
            tags: input.tags?.length
              ? {
                  connectOrCreate: input.tags.map((name) => ({
                    create: { name },
                    where: { name },
                  })),
                }
              : undefined,
            title: input.title,
          },
          include: {
            tags: true,
          },
        });
      } catch (error) {
        handlePrismaError(error, "Failed to create post");
      }
    }),

  delete: protectedProcedure
    .input(idSchema)
    .mutation(async ({ ctx, input }) => {
      try {
        await ctx.prisma.post.delete({
          where: {
            id: input.id,
          },
        });

        return {
          id: input.id,
        };
      } catch (error) {
        handlePrismaError(error, "Failed to delete post");
      }
    }),

  list: baseProcedure
    .input(listPostsQuerySchema)
    .query(async ({ ctx, input }) => {
      const { cursor, limit, page, search, sortBy, sortOrder, tag } = input;

      const where: Prisma.PostWhereInput = {
        ...(input.tag && { tags: { some: { name: tag } } }),
        ...(search && {
          OR: [
            { title: { contains: search, mode: "insensitive" } },
            { content: { contains: search, mode: "insensitive" } },
          ],
        }),
      };

      const posts = await ctx.prisma.post.findMany({
        ...(cursor && { cursor: { id: cursor }, skip: 1 }),
        include: { tags: true },
        orderBy: { [sortBy]: sortOrder },
        skip: (page - 1) * limit,
        take: limit + 1,
        where,
      });

      let nextCursor: string | null = null;

      if (posts.length > limit) {
        const nextItem = posts.pop();
        if (nextItem) {
          nextCursor = nextItem.id;
        }
      }

      return {
        nextCursor,
        posts,
      };
    }),

  update: protectedProcedure
    .input(updatePostInputSchema)
    .mutation(async ({ ctx, input }) => {
      try {
        return await ctx.prisma.post.update({
          data: {
            content: input.content,
            title: input.title,
          },
          include: { tags: true },
          where: {
            id: input.id,
          },
        });
      } catch (error) {
        handlePrismaError(error, "Failed to update post");
      }
    }),
});

export const PostsRouter = typeof postsRouter;
