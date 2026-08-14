import { NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";

export async function GET(id: number) {
  try {
    const user = await prisma.user.findUnique({ where: { id } });

    if (!user) return NextResponse.json("No user found.", { status: 401 });
    return NextResponse.json(user, { status: 200 });
  } catch {
    return NextResponse.json("Server Error", { status: 500 });
  }
}
