import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { baseProcedure, createTRPCRouter, protectedProcedure } from "../init";

export const postsRouter = createTRPCRouter({
  byId: baseProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const post = await ctx.prisma.post.findUnique({
        where: { id: input.id },
      });

      if (!post)
        throw new TRPCError({ code: "NOT_FOUND", message: "Post not found" });
      return post;
    }),

  create: protectedProcedure
    .input(
      z.object({
        content: z.string().min(1),
        slug: z.string().min(1),
        title: z.string().min(3).max(300),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.post.create({ data: { ...input } });
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const result = await ctx.prisma.post.deleteMany({
        where: { id: input.id },
      });

      if (result.count === 0) throw new TRPCError({ code: "NOT_FOUND" });
      return { id: input.id };
    }),
  list: baseProcedure
    .input(
      z.object({
        cursor: z.string().nullish(),
        limit: z.number().min(1).max(100).default(20),
      }),
    )
    .query(async ({ ctx, input }) => {
      const items = await ctx.prisma.post.findMany({
        take: input.limit + 1,
        ...(input.cursor && { cursor: { id: input.cursor }, skip: 1 }),
        orderBy: { createdAt: "desc" },
      });

      let nextCursor: string | undefined;

      if (items.length > input.limit) nextCursor = items.pop()!.id;
      return { items, nextCursor };
    }),
  update: protectedProcedure
    .input(z.object({ id: z.string(), title: z.string().min(3).optional() }))
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;

      const result = await ctx.prisma.post.updateMany({ data, where: { id } });
      if (result.count === 0)
        throw new TRPCError({ code: "NOT_FOUND", message: "Post not found" });

      return { id };
    }),
});

export const PostsRouter = typeof postsRouter;
