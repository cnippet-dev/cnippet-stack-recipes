export type ErrorCode =
  | "NOT_FOUND"
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "BAD_REQUEST"
  | "CONFLICT"
  | "INTERNAL_ERROR"
  | "VALIDATION_ERROR"
  | "INVALID_JSON"
  | "INVALID_QUERY"
  | "RATE_LIMITED";

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: ErrorCode,
    message: string,
    public readonly details?: unknown,
    public readonly expose: boolean = true,
    public readonly headers?: Record<string, string>,
  ) {
    super(message);
    this.name = "ApiError";

    Object.setPrototypeOf(this, ApiError.prototype);

    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, ApiError);
    }
  }
}

export const NotFound = (resource = "Resource") =>
  new ApiError(404, "NOT_FOUND", `${resource} not found`);
export const Unauthorized = () =>
  new ApiError(401, "UNAUTHORIZED", "Authentication required");
export const Forbidden = () =>
  new ApiError(
    403,
    "FORBIDDEN",
    "You do not have permission to perform this action",
  );
export const BadRequest = (message = "Invalid request", details?: unknown) =>
  new ApiError(400, "BAD_REQUEST", message, details);
export const Conflict = (message = "Resource conflict", details?: unknown) =>
  new ApiError(409, "CONFLICT", message, details);
export const InternalError = (message = "Internal server error") =>
  new ApiError(500, "INTERNAL_ERROR", message);
