import { eq } from "drizzle-orm";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { db } from "@/lib/db/drizzle";
import { posts, postsToTags, tags } from "@/lib/db/schema";
import { postIdParamSchema, updatePostSchema } from "@/lib/validation/post";

function isUniqueViolation(error: unknown): boolean {
  const code =
    (error as { code?: string })?.code ??
    (error as { cause?: { code?: string } })?.cause?.code;
  return code === "23505";
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const parsed = postIdParamSchema.safeParse({ id });
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid post id" }, { status: 400 });
    }

    const post = await db.query.posts.findFirst({
      where: { id: parsed.data.id },
      with: {
        tags: { columns: { id: true, name: true } },
      },
    });

    if (!post) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 });
    }

    return NextResponse.json({ data: post });
  } catch (error) {
    console.error("[GET /api/v1/post/[id]]", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const parsedId = postIdParamSchema.safeParse({ id });
    if (!parsedId.success) {
      return NextResponse.json({ error: "Invalid post id" }, { status: 400 });
    }

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const data = updatePostSchema.parse(body);

    const post = await db.transaction(async (tx) => {
      const [updated] = await tx
        .update(posts)
        .set({
          ...(data.content !== undefined && { content: data.content }),
          ...(data.metadata !== undefined && { metadata: data.metadata }),
          ...(data.slug !== undefined && { slug: data.slug }),
          ...(data.title !== undefined && { title: data.title }),
          updatedAt: new Date(),
        })
        .where(eq(posts.id, parsedId.data.id))
        .returning();

      if (!updated) {
        return null;
      }

      // mirror Prisma's `connectOrCreate` + `set: []` — replace the full
      // tag set, creating any tag names that don't exist yet. Writes still
      // go through the join table directly; `.through()` only affects reads
      if (data.tags !== undefined) {
        const tagRows = data.tags.length
          ? await tx
              .insert(tags)
              .values(data.tags.map((name) => ({ name })))
              .onConflictDoUpdate({
                set: { name: tags.name }, // no-op upsert, just returns existing row
                target: tags.name,
              })
              .returning()
          : [];

        await tx.delete(postsToTags).where(eq(postsToTags.postId, updated.id));

        if (tagRows.length) {
          await tx
            .insert(postsToTags)
            .values(
              tagRows.map((tag) => ({ postId: updated.id, tagId: tag.id })),
            );
        }
      }

      return tx.query.posts.findFirst({
        where: { id: updated.id },
        with: {
          tags: { columns: { id: true, name: true } },
        },
      });
    });

    if (!post) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 });
    }

    return NextResponse.json({ data: post }, { status: 200 });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { details: error.flatten().fieldErrors, error: "Validation failed" },
        { status: 422 },
      );
    }

    if (isUniqueViolation(error)) {
      return NextResponse.json(
        { error: "A post with this slug already exists" },
        { status: 409 },
      );
    }

    console.error("[PATCH /api/v1/post/:id]", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const parsedId = postIdParamSchema.safeParse({ id });
    if (!parsedId.success) {
      return NextResponse.json({ error: "Invalid post id" }, { status: 400 });
    }

    const [deleted] = await db
      .delete(posts)
      .where(eq(posts.id, parsedId.data.id))
      .returning({ id: posts.id });

    if (!deleted) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 });
    }

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error("[DELETE /api/v1/post/[id]]", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
