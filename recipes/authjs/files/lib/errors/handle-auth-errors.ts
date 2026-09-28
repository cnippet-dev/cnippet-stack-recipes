import { AuthError } from "next-auth";

export const ERROR_MESSAGES: Record<string, string> = {
  AccessDenied: "You don't have permission to sign in.",
  CredentialsSignin: "Invalid email or password.",
  Default: "Something went wrong. Please try again.",
  invalid_credentials: "Invalid email or password.",
  OAuthAccountNotLinked:
    "An account already exists with this email. Please sign in with your email and password instead.",
  Verification: "That verification link is invalid or has expired.",
};

export function getAuthErrorMessage(
  type?: string | null,
  code?: string | null,
): string | undefined {
  if (!type) return undefined;
  return (
    (code && ERROR_MESSAGES[code]) ??
    ERROR_MESSAGES[type] ??
    ERROR_MESSAGES.Default
  );
}

export function resolveAuthError(error: unknown): string {
  if (error instanceof AuthError) {
    const code = (error as AuthError & { code?: string }).code;
    console.error(
      `[auth] type=${error.type} code=${code ?? "-"}`,
      error.cause ?? "",
    );
    return getAuthErrorMessage(error.type, code) ?? ERROR_MESSAGES.Default;
  }
  throw error;
}
