# Cache and query optimizations

This note is a scan of the tRPC template as it exists today: Next.js 16 App Router, tRPC v11 with `@trpc/tanstack-react-query`, TanStack Query v5, Prisma 7, and a single home page that demos create / read / update / delete.

The stack is already **wired** for caching. Almost none of it is **used** for the actual post lookups. The biggest wins are: prefetch + hydrate the list, share one TanStack Query instead of three local `useState` copies, and make Next.js invalidation match real routes and tags.

---

## Current state (what is already in place)

| Layer           | What you have                                                                           | What it actually does                                                                                              |
| --------------- | --------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| React `cache()` | `createTRPCContext` in `trpc/init.ts`, `getQueryClient` in `trpc/server.ts`             | Dedupes context and QueryClient **within one server request**. Good. Does not cache across requests or users.      |
| TanStack Query  | `makeQueryClient()` with `staleTime: 30s`, dehydrate pending queries, SuperJSON hydrate | Client QueryClient is a singleton in the browser. Defaults never apply to posts because UI never calls `useQuery`. |
| Hydration       | `HydrationBoundary` + `dehydrate(queryClient)` on `app/page.tsx`                        | Empty payload. Nothing is `prefetch`ed before dehydrate.                                                           |
| tRPC HTTP       | `httpBatchLink` to `/api/trpc`                                                          | Ready for client queries. Unused by Read / Update / Delete.                                                        |
| Server actions  | `getPostsAction` / CRUD in `lib/actions/dal.ts`                                         | Every “Get Posts” click is a full round trip: client → Server Action → tRPC caller → Prisma.                       |
| Next.js cache   | `revalidatePath("/posts")` and `revalidatePath(\`/posts/${id}\`)`                       | Those routes do not exist. The app only has `/`. Invalidation is a no-op.                                          |

Read, Update, and Delete each keep their own `posts` array in `useState` and call `getPostsAction({ limit: 4, page: 1 })` independently. Create does not invalidate any client cache. AbortControllers in those components never get passed into the action.

---

## Highest-impact changes (do these first)

### 1. Prefetch `posts.list` on the server and hydrate it

**Where:** `app/page.tsx` (already has `getQueryClient` + `HydrationBoundary`).

**Why:** First paint of Read / Update / Delete can be instant. You already pay for SuperJSON dehydrate/hydrate and pending-query dehydrate in `trpc/query-client.ts`.

```ts
import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import { getQueryClient, trpc } from "@/trpc/server";

export default async function Home() {
  const queryClient = getQueryClient();
  const listInput = { limit: 4, page: 1 } as const;

  await queryClient.prefetchQuery(trpc.posts.list.queryOptions(listInput));

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      {/* ... */}
    </HydrationBoundary>
  );
}
```

Pair this with `useQuery` / `useSuspenseQuery` in the client cards using the **same input object** so keys match.

Also add SuperJSON serialize on dehydrate (hydrate already deserializes). Without it, `Date` / Prisma JSON can round-trip incorrectly:

```ts
// trpc/query-client.ts
dehydrate: {
  serializeData: superjson.serialize,
  shouldDehydrateQuery: (query) =>
    defaultShouldDehydrateQuery(query) || query.state.status === "pending",
},
```

**Next.js note:** `headers()` inside `createTRPCContext` makes this page dynamic. That is fine for an authenticated template. If the list is public, consider a context that does not read headers for public procedures so the page can stay static / PPR-friendly.

### 2. Replace three `useState` lists with one TanStack Query

**Where:** `components/layout/read.tsx`, `update.tsx`, `delete.tsx`.

**Why:** Today three clicks = three identical Prisma queries. With one `queryKey` (tRPC generates it from `posts.list` + input), the second and third cards are **cache hits** for 30s (`staleTime`). Mutations in one card can update the others without a refetch.

```tsx
"use client";

import { useQuery } from "@tanstack/react-query";
import { useTRPC } from "@/trpc/client";

const listInput = { limit: 4, page: 1 };

export function Read() {
  const trpc = useTRPC();
  const { data, isFetching, refetch } = useQuery(
    trpc.posts.list.queryOptions(listInput),
  );
  const posts = data?.posts ?? [];
  // Button can call refetch() if you still want an explicit “Get Posts”.
}
```

For a demo that should look instant after SSR, use `useSuspenseQuery` and wrap the three cards in a single `<Suspense>` on the page (one fallback, shared cache).

### 3. Drive mutations through TanStack Query, then patch the list cache

**Where:** `create.tsx`, `update.tsx`, `delete.tsx` (and optionally keep Server Actions only if you need progressive enhancement).

**Why:** Server Actions today return data but never `invalidateQueries` / `setQueryData`. Create succeeds while Read still shows the old local state until the user clicks Get Posts again.

Use `useMutation` with tRPC options, then:

- **Create:** `queryClient.invalidateQueries(trpc.posts.list.queryFilter())` or `setQueryData` to prepend the new post (optimistic / from mutation result).
- **Update:** `setQueryData` on `posts.list` and, once you add `posts.byId`, on that key too.
- **Delete:** already optimistic in local state; move that to `onMutate` / `onError` / `onSettled` on the shared QueryClient so Read and Update update too.

If you keep Server Actions as the mutation transport, still inject the QueryClient in the client and call `invalidateQueries` after a successful action. Server `revalidatePath` does not update the in-memory QueryClient.

### 4. Fix Next.js invalidation to match real routes and use tags

**Where:** `lib/actions/dal.ts`, and later the Prisma/tRPC list procedure.

**Why:** `revalidatePath("/posts")` never matches `/`.

Minimum fix:

```ts
revalidatePath("/");
```

Better: tag the cached list and invalidate by tag so you do not blow away unrelated page cache later:

```ts
import { revalidateTag } from "next/cache";

revalidateTag("posts", "max"); // Next 16 tag + profile form
```

Use the same tag when you wrap the list in `"use cache"` / `unstable_cache` (see below).

---

## Next.js cache: where it actually helps

TanStack Query is the **browser / hydration** cache. Next.js cache is the **server / CDN** cache. Use both; they are not substitutes.

### React `cache()` — request memoization (already started)

**Use more of it around Prisma reads**, not only context.

`getPostsAction` and `posts.list` can be called multiple times in one RSC render (layout + page + three prefetches if you prefetch per-component). Wrap the Prisma `findMany` (or a `getPosts(input)` helper) in `cache()` keyed by a stable serialized input so one request hits the DB once.

```ts
import { cache } from "react";

export const getPostsCached = cache(async (input: ListPostQueryInput) => {
  return prisma.post.findMany({/* ... */});
});
```

This does **not** survive to the next HTTP request. That is what `"use cache"` / Data Cache is for.

### `"use cache"` / `cacheLife` / `cacheTag` (Next.js 16)

**Best fit:** `posts.list` for the default first page (`limit: 4, page: 1`, no search/tag). That is the demo hot path.

**Poor fit:** authenticated mutations, user-specific lists, search-as-you-type. Do not cache those across users.

Pattern:

1. Extract a cached data function used by the tRPC list procedure **or** by a server-only loader used for prefetch (avoid caching personalized `ctx.session` inside the cached function).
2. `cacheTag("posts")` / `cacheTag(\`post:${id}\`)`.
3. On create / update / delete, `revalidateTag("posts")` (and the post id tag).

If you later add `/posts/[id]`, cache the by-id loader with a short `cacheLife("minutes")` and tag `post:${id}`.

### `unstable_cache` (if you stay on the older API)

Same idea as `"use cache"`: wrap `prisma.post.findMany` for the default list. Pass `tags: ["posts"]`. Call `revalidateTag("posts")` from DAL mutations. Prefer `"use cache"` on Next 16.

### Full Route Cache / PPR

`app/page.tsx` is a Server Component that currently does no `await` of data, so it can prerender. Once you `prefetchQuery` with a context that calls `headers()`, the page becomes dynamic.

Options:

- Keep it dynamic (simplest for a CRUD template with sessions).
- Prefetch only public data in a cached function, and keep `headers()` out of that path so the static shell can ship with PPR (`experimental.ppr` / Partial Prerendering in your Next 16 config).
- Add `loading.tsx` so the static shell streams the cards.

### Router Cache (client)

After mutations, `revalidatePath("/")` plus `router.refresh()` (if you add `useRouter`) keeps RSC payloads in sync with TanStack Query. If you go all-in on client Query, you may not need `router.refresh()` for the demo cards.

### HTTP caching for `/api/trpc`

You export **GET and POST** from `app/api/trpc/[trpc]/route.ts`. GET tRPC can be cached by browsers/CDNs in surprising ways.

- Prefer POST-only for mutations and user-specific queries.
- If you enable GET for public queries, set `Cache-Control` deliberately (usually `private, no-store` for this template).
- Do not rely on Next.js Full Route Cache for the catch-all tRPC route.

### `revalidatePath` vs `revalidateTag`

| Use                                     | When                                                     |
| --------------------------------------- | -------------------------------------------------------- |
| `revalidateTag("posts")`                | Shared list cached with `"use cache"` / `unstable_cache` |
| `revalidatePath("/")`                   | Page itself is cached / PPR and embeds the list          |
| `revalidatePath("/posts/[id]", "page")` | When you add a detail route                              |

Delete the current `/posts` paths until those routes exist.

---

## TanStack Query: extra wins beyond “use useQuery”

### Query defaults (`trpc/query-client.ts`)

Current `staleTime: 30_000` is a good demo default. Tune by query:

| Query                          | Suggested `staleTime` | Notes                                                      |
| ------------------------------ | --------------------- | ---------------------------------------------------------- |
| `posts.list` (default page)    | 30s–60s               | Matches current default; avoid refetch on every card mount |
| `posts.list` with `search`     | 0–10s                 | Search should feel live                                    |
| `posts.byId` (not implemented) | 60s+                  | Detail is stable; invalidate on update/delete              |
| `health.check`                 | Infinity              | Never refetch unless you want a heartbeat                  |

Also set:

- `gcTime: 5 * 60_000` (keep unused list in memory while the user edits).
- `retry: 1` for a demo (faster failure).
- `refetchOnWindowFocus: false` for this CRUD playground, or leave true for “real app” realism.

### Query key alignment

tRPC options helpers already encode procedure + input. Rules:

- Never mix `{ limit: 4, page: 1 }` with extra undefined fields; Zod defaults can change the key.
- Share a `LIST_INPUT` constant between `page.tsx` prefetch and the three cards.
- Use `trpc.posts.list.queryFilter()` for invalidation so filtered/search variants also refresh.

### Missing procedure: `posts.byId`

**Where:** `trpc/routers/posts.ts`, then Update dialog.

**Why:** Update currently refetches the **list** to edit one row. A `byId` query lets you:

- Prefetch on hover / when the dialog opens (`queryClient.prefetchQuery`).
- Seed `byId` from list data with `queryClient.setQueryData` (no extra network).
- Cache detail independently of pagination.

List → detail seeding:

```ts
queryClient.setQueryData(trpc.posts.byId.queryKey({ id: post.id }), post);
```

### Placeholder / previous data

When you add pagination or tag filters, use `placeholderData: keepPreviousData` on `posts.list` so the accordion does not flash empty while the next page loads.

### Structural sharing

Leave Query’s structural sharing on. When you `setQueryData` after update, replace the one post object so unchanged rows keep referential equality and the accordion does not remount.

### Mutations: optimistic delete (port existing UX)

Delete already removes the row before the server responds, then rolls back. Recreate that with `onMutate`:

1. `await queryClient.cancelQueries(trpc.posts.list.queryFilter())`.
2. Snapshot previous list.
3. `setQueryData` without the id.
4. `onError`: restore snapshot.
5. `onSettled`: `invalidateQueries` (or skip if you trust the optimistic result).

Create can use `onSuccess` + prepend instead of waiting for a full list refetch.

### Deduping the three cards

Once they share `useQuery`, React Query **batches** the first fetch. You can also render a tiny `PostsListProvider` that calls the query once and passes `posts` down — optional; Query already dedupes.

### Persist cache (optional, not needed for the template)

`@tanstack/query-persist-client-persist` + `localStorage` would make “Get Posts” instant across reloads. Skip until the demo is a real app; SuperJSON + persist needs care with Prisma `Date` / `Json`.

### Devtools

Add `@tanstack/react-query-devtools` in development. It will immediately show that today there are **zero** post queries.

---

## tRPC transport optimizations (related, not “cache”)

### Batching

`httpBatchLink` is already correct. When Read/Update/Delete all mount with the same query, one HTTP request is enough. If you add `byId` + `list` on the same page, batching still collapses them.

### Avoid double transport

Current read path:

`Client → Server Action → getServerCaller() → Prisma`

That bypasses HTTP tRPC **and** Query. Prefer **one** of:

1. **RSC prefetch + client `useQuery`** (recommended for this template).
2. Client `httpBatchLink` only (no prefetch; slower first paint).
3. Server Actions for mutations only; reads go through Query.

Do not keep `getPostsAction` as the primary read API if you want Query caching. Actions are not automatically keyed or deduped across components.

### `httpBatchStreamLink`

If list payloads grow (full post bodies in the accordion), streaming can paint the first procedure sooner. Optional.

### Caller vs HTTP on the server

`getServerCaller()` is the right way to run procedures in Server Actions (no extra HTTP to localhost). Keep it for mutations. For RSC, `createTRPCOptionsProxy` (`trpc` in `trpc/server.ts`) is the right way to prefetch into Query.

### Timing middleware

`timingMiddleware` in `trpc/init.ts` logs every call. Fine for a recipe; strip or gate on `NODE_ENV` so it does not slow production and flood logs.

---

## Next.js / React rendering optimizations (adjacent)

### One Suspense boundary for the three lists

After switching to `useSuspenseQuery`, wrap Create (static) separately from Read/Update/Delete so the form is interactive while the list hydrates. Avoid three nested Suspense fallbacks unless you want three spinners.

### Do not wrap the whole tree in a client data layer unnecessarily

`TRPCReactProvider` on `app/layout.tsx` is correct. Keep Server Components for Header/Footer if they stay presentational (Header is imported without `"use client"` in `page.tsx` — good).

### Fonts (`app/layout.tsx`)

Geist with `subsets: ["latin"]` is already good. You can set `display: "swap"` explicitly and only pass `variable` to `html` (already done). No cache issue here.

### `next.config.ts`

Empty today. Consider later:

- `experimental.staleTimes` (Next 16 router cache stale times) if you add more RSC pages.
- Images: none in the demo.
- `logging.fetches.fullUrl: true` in dev to see whether list is cached.

### Prisma

`lib/db/prisma.ts` already uses a global singleton in dev. List query uses both `skip` (page) **and** cursor in `posts.list`. Pick one pagination model. Cursor + `take: limit + 1` is the one to keep for infinite query (`useInfiniteQuery`) if you grow the demo.

Add a DB index that matches `orderBy` (`sortBy` / `sortOrder`) plus filter columns you actually query.

---

## Suggested target architecture

```text
Request
  └─ RSC page
       ├─ cache() / "use cache" + cacheTag("posts")  → Prisma list (server, cross-request)
       ├─ prefetchQuery(posts.list)                  → QueryClient (per request)
       └─ dehydrate → HydrationBoundary
            └─ Client cards
                 ├─ useQuery(posts.list)             → in-memory, 30s stale, shared
                 └─ useMutation(create|update|delete)
                      ├─ setQueryData / invalidateQueries
                      └─ revalidateTag("posts") + revalidatePath("/")
```

**Lookup speed after this:**

1. Repeat visits / PPR: Next Data Cache (tagged list).
2. First client render: hydrated QueryClient (no loading spinner).
3. Second card / second click within `staleTime`: TanStack cache (no network).
4. After mutation: optimistic list + tagged revalidation so the next RSC payload is fresh.

---

## Concrete file checklist

| File                           | Suggestion                                                                                                |
| ------------------------------ | --------------------------------------------------------------------------------------------------------- |
| `app/page.tsx`                 | `prefetchQuery` for `posts.list`; keep `HydrationBoundary`. Optional `<Suspense>`.                        |
| `trpc/query-client.ts`         | SuperJSON `serializeData` on dehydrate; per-default `gcTime` / `refetchOnWindowFocus`.                    |
| `trpc/client.tsx`              | Already a browser singleton QueryClient — keep it. Optional React Query Devtools.                         |
| `trpc/server.ts`               | Already `cache(makeQueryClient)` — keep it. Use `trpc.posts.list.queryOptions` for prefetch.              |
| `trpc/init.ts`                 | Keep `cache()` on context. Don’t put `headers()` in public cached loaders.                                |
| `trpc/routers/posts.ts`        | Cache-friendly list helper; add `byId`; simplify pagination; optional `cacheTag` at data layer.           |
| `lib/actions/dal.ts`           | `revalidatePath("/")` + `revalidateTag("posts")`; stop targeting `/posts`. Prefer mutations-only actions. |
| `components/layout/read.tsx`   | `useQuery` / `useSuspenseQuery`; drop local list state and unused AbortController.                        |
| `components/layout/update.tsx` | Same list query; `useMutation` + `setQueryData`; optional `byId` for the dialog.                          |
| `components/layout/delete.tsx` | Same list query; optimistic `useMutation`.                                                                |
| `components/layout/create.tsx` | `useMutation`; invalidate or prepend list cache.                                                          |
| `app/api/trpc/[trpc]/route.ts` | Be explicit about GET caching; POST-only is safer for this app.                                           |
| `next.config.ts`               | Optional fetch logging / PPR when you split public vs authed data.                                        |

---

## What not to cache

- **Mutations** (`create` / `update` / `delete`).
- **Protected procedure results** in a shared Data Cache (your context currently stubs a user; a real `auth()` session must not be stored in a cross-user `"use cache"`).
- **Search / tag-filtered lists** without including those params in the cache key (and even then, keep TTL short).
- **Prisma `include: { tags: true }` results** in HTTP Cache-Control public if any field is user-specific later.

---

## Priority order

1. Prefetch + hydrate `posts.list` (you already have the boundary).
2. Switch Read / Update / Delete to one `useQuery`.
3. Invalidate / update that query from Create / Update / Delete.
4. Fix `revalidatePath` / add `revalidateTag`.
5. Add `"use cache"` (or `unstable_cache`) around the public default list.
6. Add `posts.byId`, infinite query, and PPR only if the recipe grows past the four-card demo.
