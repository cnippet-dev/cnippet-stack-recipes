import { TRPCError } from "@trpc/server";
import { ZodError } from "zod";

export type ActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: string; fieldErrors?: Record<string, string[]> };

export function handleActionError(err: unknown): ActionResult<never> {
  if (err instanceof ZodError) {
    return {
      error: "Invalid input.",
      fieldErrors: err.flatten().fieldErrors,
      success: false,
    };
  }

  if (err instanceof TRPCError) {
    const message =
      err.code === "UNAUTHORIZED"
        ? "You must be logged in to do this."
        : err.code === "FORBIDDEN"
          ? "You don't have permission to do this."
          : err.code === "NOT_FOUND"
            ? "That post no longer exists."
            : err.code === "CONFLICT"
              ? "That slug is already taken."
              : "Something went wrong. Please try again.";

    return { error: message, success: false };
  }

  console.error("Unexpected server action error:", err);
  return { error: "Something went wrong. Please try again.", success: false };
}
