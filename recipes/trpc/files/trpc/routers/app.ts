import { baseProcedure, createTRPCRouter } from "../init";
import { postsRouter } from "./posts";

export const appRouter = createTRPCRouter({
  health: createTRPCRouter({
    check: baseProcedure.query(() => ({ status: "ok" as const })),
  }),
  posts: postsRouter,
});

export type AppRouter = typeof appRouter;
