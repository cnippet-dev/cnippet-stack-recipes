import { z } from "zod";
import { baseProcedure, createTRPCRouter } from "../init";

export const postsRouter = createTRPCRouter({
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
});
