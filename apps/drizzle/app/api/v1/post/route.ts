import { inArray } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";
import { db } from "@/lib/db/drizzle";
import { posts, postsToTags, tags } from "@/lib/db/schema";
import { createPostSchema } from "@/lib/validation/post";

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
