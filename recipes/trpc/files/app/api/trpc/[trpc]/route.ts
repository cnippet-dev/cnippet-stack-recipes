import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { createTRPCContext } from "@/trpc/init";
import { appRouter } from "@/trpc/routers/app";

const handler = (req: Request) =>
  fetchRequestHandler({
    createContext: () => createTRPCContext({ headers: req.headers }),
    endpoint: "/api/trpc",
    req,
    router: appRouter,
  });

export { handler as GET, handler as POST };
