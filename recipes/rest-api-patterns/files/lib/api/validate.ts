import type z from "zod";
import { ApiError } from "./errors";

export async function parseBody<T extends z.ZodTypeAny>(
  request: Request,
  schema: T,
): Promise<z.infer<T>> {
  let json: unknown;

  try {
    json = await request.json();
  } catch (err) {
    throw new ApiError(
      400,
      "INVALID_JSON",
      "Request body must be valid json.",
      err,
    );
  }

  const result = schema.safeParse(json);
  if (!result.success) {
    throw new ApiError(
      422,
      "VALIDATION_ERROR",
      "Validation failed",
      result.error.flatten().fieldErrors,
    );
  }

  return result.data;
}

export async function parseQuery<T extends z.ZodTypeAny>(
  request: Request,
  schema: T,
): Promise<z.infer<T>> {
  const { searchParams } = new URL(request.url);
  const result = schema.safeParse(Object.fromEntries(searchParams));

  if (!result.success) {
    throw new ApiError(
      400,
      "INVALID_QUERY",
      "Invalid query parameters",
      result.error.flatten().fieldErrors,
    );
  }
  return result.data;
}
