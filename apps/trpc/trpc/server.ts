"use server";

import { createTRPCOptionsProxy } from "@trpc/tanstack-react-query";
import { headers } from "next/headers";
import { cache } from "react";
import { createCallerFactory, createTRPCContext } from "./init";
import { makeQueryClient } from "./query-client";
import { appRouter } from "./routers/app";

export const getQueryClient = cache(makeQueryClient);

export const trpc = createTRPCOptionsProxy({
  ctx: async () => createTRPCContext({ headers: await headers() }),
  queryClient: getQueryClient,
  router: appRouter,
});

const createCaller = createCallerFactory(appRouter);

export async function getServerCaller() {
  const ctx = await createTRPCContext({ headers: await headers() });
  return createCaller(ctx);
}
