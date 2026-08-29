import { NextResponse } from "next/server";

export function ok<T>(data: T, meta?: object, init?: ResponseInit) {
  return NextResponse.json(
    { data, success: true, ...(meta && { meta }) },
    init,
  );
}

export function fail(
  status: number,
  code: string,
  message: string,
  details?: unknown,
  headers?: Record<string, string>,
) {
  return NextResponse.json(
    {
      error: {
        code,
        details,
        message,
      },
      success: false,
    },
    { headers, status },
  );
}

export function created<T>(data: T, location?: string) {
  return NextResponse.json(
    { data, success: true },
    { headers: location ? { Location: location } : undefined, status: 201 },
  );
}

export function noContent() {
  return new NextResponse(null, { status: 204 });
}
