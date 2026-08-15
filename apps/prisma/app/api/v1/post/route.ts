import { type NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";
import { Prisma } from "@/app/generated/prisma/client";
import prisma from "@/lib/db/prisma";
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

    const post = await prisma.post.create({
      data: {
        content: data.content,
        metadata: data.metadata as Prisma.InputJsonValue | undefined,
        published: data.published,
        slug: data.slug,
        tags: data.tagIds.length
          ? { connect: data.tagIds.map((id) => ({ id })) }
          : undefined,
        title: data.title,
      },
      include: {
        tags: true,
      },
    });

    return NextResponse.json({ data: post }, { status: 201 });
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
        return NextResponse.json(
          {
            error:
              "One or more referenced records were not found (e.g. invalid tagId)",
          },
          { status: 400 },
        );
      }
    }

    console.error("[POST /api/v1/post]", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function GET(req: NextRequest) {
  try {
    const searchParams = Object.fromEntries(req.nextUrl.searchParams);
    const query = getPostsQuerySchema.parse(searchParams);

    const where: Prisma.PostWhereInput = {
      ...(query.published !== undefined && { published: query.published }),
      ...(query.tag && { tags: { some: { name: query.tag } } }),
      ...(query.search && {
        OR: [
          { title: { contains: query.search, mode: "insensitive" } },
          { content: { contains: query.search, mode: "insensitive" } },
        ],
      }),
    };

    const skip = (query.page - 1) * query.limit;

    const [posts, total] = await Promise.all([
      prisma.post.findMany({
        include: {
          tags: { select: { id: true, name: true } },
        },
        orderBy: { [query.sortBy]: query.sortOrder },
        skip,
        take: query.limit,
        where,
      }),
      prisma.post.count({ where }),
    ]);

    const totalPages = Math.ceil(total / query.limit);

    return NextResponse.json({
      data: posts,
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
