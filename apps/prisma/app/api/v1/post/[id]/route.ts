import { NextResponse } from "next/server";
import { Prisma } from "@/app/generated/prisma/client";
import prisma from "@/lib/db/prisma";
import { postIdParamSchema } from "@/lib/validation/post";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET({ params }: RouteContext) {
  try {
    const { id } = await params;

    const parsed = postIdParamSchema.safeParse({ id });
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid post id" }, { status: 400 });
    }

    const post = await prisma.post.findUnique({
      include: {
        author: { select: { email: true, id: true, name: true } },
        tags: { select: { id: true, name: true } },
      },
      where: { id: parsed.data.id },
    });

    if (!post) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 });
    }

    prisma.post
      .update({
        data: { views: { increment: 1 } },
        where: { id: post.id },
      })
      .catch((err) => console.error("[views increment]", err));

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
