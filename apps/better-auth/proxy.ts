import { headers } from "next/headers";
import { type NextRequest, NextResponse } from "next/server";
import { UserRole } from "./app/generated/prisma/enums";
import { auth } from "./lib/auth/auth";

export async function proxy(request: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  const { pathname } = request.nextUrl;

  if (
    pathname.startsWith("/dashboard/admin") &&
    session.user.role !== UserRole.admin
  ) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*", "/profile/:path*"],
};
