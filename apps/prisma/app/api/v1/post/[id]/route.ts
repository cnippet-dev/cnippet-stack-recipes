import { type NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";
import { Prisma } from "@/app/generated/prisma/client";
import prisma from "@/lib/db/prisma";
import { postIdParamSchema, updatePostSchema } from "@/lib/validation/post";

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

    const post = await prisma.post.findUnique({
      include: {
        tags: { select: { id: true, name: true } },
      },
      where: { id: parsed.data.id },
    });

    if (!post) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 });
    }

    return NextResponse.json({ data: post });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      console.error("[GET /api/v1/post/[id]] Prisma error", error.code, error);
      return NextResponse.json({ error: "Database error" }, { status: 500 });
    }

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
    const idNum = Number(id);
    if (!Number.isInteger(idNum)) {
      return NextResponse.json({ error: "Invalid post id" }, { status: 400 });
    }

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const data = updatePostSchema.parse(body);

    const post = await prisma.post.update({
      data: {
        ...(data.content !== undefined && { content: data.content }),
        ...(data.metadata !== undefined && {
          metadata: data.metadata as Prisma.InputJsonValue,
        }),
        ...(data.slug !== undefined && { slug: data.slug }),
        ...(data.title !== undefined && { title: data.title }),
        ...(data.tags !== undefined && {
          tags: {
            connectOrCreate: data.tags.map((name) => ({
              create: { name },
              where: { name },
            })),
            set: [],
          },
        }),
      },
      include: { tags: true },
      where: { id: idNum },
    });

    return NextResponse.json({ data: post }, { status: 200 });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { details: error.flatten().fieldErrors, error: "Validation failed" },
        { status: 422 },
      );
    }

    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === "P2002") {
        return NextResponse.json(
          { error: "A post with this slug already exists" },
          { status: 409 },
        );
      }
      if (error.code === "P2025") {
        return NextResponse.json({ error: "Post not found" }, { status: 404 });
      }
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

    const existing = await prisma.post.findUnique({
      where: { id: Number.parseInt(id, 10) },
    });

    if (!existing) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 });
    }

    await prisma.post.delete({ where: { id: Number.parseInt(id, 10) } });

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === "P2025") {
        return NextResponse.json({ error: "Post not found" }, { status: 404 });
      }
    }

    console.error("[DELETE /api/v1/post/[id]]", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
