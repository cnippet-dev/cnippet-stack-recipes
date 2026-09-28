import {
  and,
  asc,
  desc,
  eq,
  exists,
  ilike,
  inArray,
  or,
  sql,
} from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";
import { db } from "@/lib/db/drizzle";
import { posts, postsToTags, tags } from "@/lib/db/schema";
import { createPostSchema, getPostsQuerySchema } from "@/lib/validation/post";

export async function POST(req: NextRequest) {
  try {
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const data = createPostSchema.parse(body);

    const result = await db.transaction(async (tx) => {
      const [post] = await tx
        .insert(posts)
        .values({
          content: data.content,
          metadata: data.metadata ?? null,
          slug: data.slug,
          title: data.title,
        })
        .returning();

      let linkedTags: (typeof tags.$inferSelect)[] = [];

      if (data.tags?.length) {
        const uniqueNames = [...new Set(data.tags)];

        await tx
          .insert(tags)
          .values(uniqueNames.map((name) => ({ name })))
          .onConflictDoNothing({ target: tags.name });

        linkedTags = await tx
          .select()
          .from(tags)
          .where(inArray(tags.name, uniqueNames));

        await tx.insert(postsToTags).values(
          linkedTags.map((tag) => ({
            postId: post.id,
            tagId: tag.id,
          })),
        );
      }

      return { ...post, tags: linkedTags };
    });

    return NextResponse.json({ data: result }, { status: 201 });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { details: error.flatten().fieldErrors, error: "Validation failed" },
        { status: 422 },
      );
    }

    const pgError = error as { code?: string; constraint?: string };

    if (pgError.code === "23505") {
      return NextResponse.json(
        { error: "A post with this slug already exists" },
        { status: 409 },
      );
    }

    if (pgError.code === "23503") {
      return NextResponse.json(
        {
          error:
            "One or more referenced records were not found (e.g. invalid tagId)",
        },
        { status: 400 },
      );
    }

    console.error("[POST /api/v1/post]", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

const sortableColumns = {
  createdAt: posts.createdAt,
  title: posts.title,
  updatedAt: posts.updatedAt,
} as const;

export async function GET(req: NextRequest) {
  try {
    const searchParams = Object.fromEntries(req.nextUrl.searchParams);
    const query = getPostsQuerySchema.parse(searchParams);

    const sortColumn =
      sortableColumns[query.sortBy as keyof typeof sortableColumns];
    if (!sortColumn) {
      return NextResponse.json(
        {
          details: { sortBy: ["Unsupported sort field"] },
          error: "Invalid query parameters",
        },
        { status: 422 },
      );
    }
    const orderFn = query.sortOrder === "asc" ? asc : desc;

    const conditions = [];

    if (query.search) {
      conditions.push(
        or(
          ilike(posts.title, `%${query.search}%`),
          ilike(posts.content, `%${query.search}%`),
        ),
      );
    }

    if (query.tag) {
      conditions.push(
        exists(
          db
            .select({ one: sql`1` })
            .from(postsToTags)
            .innerJoin(tags, eq(tags.id, postsToTags.tagId))
            .where(
              and(eq(postsToTags.postId, posts.id), eq(tags.name, query.tag)),
            ),
        ),
      );
    }

    const whereClause = conditions.length ? and(...conditions) : undefined;
    const skip = (query.page - 1) * query.limit;

    const [postsResult, [{ count: total }]] = await Promise.all([
      db
        .select({
          content: posts.content,
          createdAt: posts.createdAt,
          id: posts.id,
          metadata: posts.metadata,
          slug: posts.slug,
          tags: sql<{ id: string; name: string }[]>`
            coalesce(
              json_agg(
                json_build_object('id', ${tags.id}, 'name', ${tags.name})
              ) filter (where ${tags.id} is not null),
              '[]'
            )
          `,
          title: posts.title,
          updatedAt: posts.updatedAt,
        })
        .from(posts)
        .leftJoin(postsToTags, eq(postsToTags.postId, posts.id))
        .leftJoin(tags, eq(tags.id, postsToTags.tagId))
        .where(whereClause)
        .groupBy(posts.id)
        .orderBy(orderFn(sortColumn))
        .limit(query.limit)
        .offset(skip),

      db
        .select({ count: sql<number>`count(*)` })
        .from(posts)
        .where(whereClause),
    ]);

    const totalPages = Math.ceil(total / query.limit);

    return NextResponse.json({
      data: postsResult,
      pagination: {
        hasNextPage: query.page < totalPages,
        hasPreviousPage: query.page > 1,
        limit: query.limit,
        page: query.page,
        total,
        totalPages,
      },
    });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        {
          details: error.flatten().fieldErrors,
          error: "Invalid query parameters",
        },
        { status: 422 },
      );
    }
    console.error("[GET /api/v1/post]", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
