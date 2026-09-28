import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/auth";

export async function GET() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) return NextResponse.json("Unauthorized", { status: 402 });
  return NextResponse.json(
    { email: session.user.email, id: session.user.id },
    { status: 200 },
  );
}
