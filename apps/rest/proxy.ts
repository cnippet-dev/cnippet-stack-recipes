import { type NextRequest, NextResponse } from "next/server";
import { envConfig } from "./lib/utils/env";

const allowedOrigin = new Set([
  ...(envConfig.env === "development" ? ["http://localhost:3000"] : [""]),
]);

// TODO : Confirm headers
const CORS_HEADERS_BASE = {
  "Access-Control-Allow-Headers": "Content-Type,Authorization,x-api-key",
  "Access-Control-Allow-Methods": "GET,POST,PUT,PATCH,DELETE,OPTIONS",
  "Access-Control-Max-Age": "86400",
};

export function proxy(request: NextRequest) {
  const origin = request.headers.get("origin");
  const isAllowed = origin ? allowedOrigin.has(origin) : false;

  if (request.method === "OPTIONS") {
    return new NextResponse(null, {
      headers: {
        ...CORS_HEADERS_BASE,
        ...(isAllowed && origin
          ? { "Access-Control-Allow-Origin": origin }
          : {}),
        "Access-Control-Allow-Credentials": "true",
        Vary: "Origin",
      },
      status: 204,
    });
  }

  const response = NextResponse.next();
  if (isAllowed && origin) {
    response.headers.set("Access-Control-Allow-Origin", origin);
    response.headers.set("Access-Control-Allow-Credentials", "true");
  }

  response.headers.set("Vary", "Origin");
  return response;
}

export const config = {
  matcher: "/api/:path*",
};
