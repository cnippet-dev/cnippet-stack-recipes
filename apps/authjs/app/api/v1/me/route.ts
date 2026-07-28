import { auth } from "@/auth";
import { NextResponse } from "next/server";

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json("Unauthorized", { status: 401 });
  return NextResponse.json(
    { id: session.user.id, email: session.user.email, role: session.user.role },
    { status: 201 },
  );
}
