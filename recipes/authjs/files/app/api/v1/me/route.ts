import { NextResponse } from "next/server";
import { auth } from "@/auth";

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json("Unauthorized", { status: 401 });
  return NextResponse.json(
    { email: session.user.email, id: session.user.id, role: session.user.role },
    { status: 201 },
  );
}
