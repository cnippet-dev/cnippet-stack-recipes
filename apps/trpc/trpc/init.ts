import { initTRPC, TRPCError } from "@trpc/server";
import { cache } from "react";
import superjson from "superjson";
import { ZodError } from "zod";
import prisma from "@/lib/db/prisma";

export const createTRPCContext = cache(async (opts: { headers: Headers }) => {
  //   const session = await auth.api?.getSession;
  //     ? await auth.api.getSession({ headers: await headers() })
  //     : await auth();
  //   return { prisma, session };
  const user = { role: "USER", userId: "user123" };
  const session = { user };
  return { prisma, session };
});

const t = initTRPC
  .context<Awaited<ReturnType<typeof createTRPCContext>>>()
  .create({
    errorFormatter({ shape, error }) {
      return {
        ...shape,
        data: {
          ...shape.data,
          zodError:
            error.cause instanceof ZodError ? error.cause.flatten() : null,
        },
      };
    },
    transformer: superjson,
  });

export const createTRPCRouter = t.router;
export const createCallerFactory = t.createCallerFactory;

const timingMiddleware = t.middleware(async ({ path, next }) => {
  const start = Date.now();
  const result = await next();
  console.log(`[trpc] ${path} took ${Date.now() - start}ms`);
  return result;
});

export const baseProcedure = t.procedure.use(timingMiddleware);

export const protectedProcedure = baseProcedure.use(async ({ ctx, next }) => {
  if (!ctx.session?.user) throw new TRPCError({ code: "UNAUTHORIZED" });
  return next({ ctx: { ...ctx, user: ctx.session.user } });
});

export const adminProcedure = protectedProcedure.use(async ({ ctx, next }) => {
  if (ctx.user.role !== "ADMIN") throw new TRPCError({ code: "FORBIDDEN" });

  return next({ ctx });
});
