import { NextResponse } from "next/server";

export async function GET() {
  const isDev = process.env.NODE_ENV === "development";
  return NextResponse.json(
    { isDev: isDev, message: "Health end point" },
    { status: 200 },
  );
}
