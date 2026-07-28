import { AuthError } from "next-auth";

export const ERROR_MESSAGES: Record<string, string> = {
  invalid_credentials: "Invalid email or password.",
  oauth_account_exists:
    "This email is registered with Google Sign-In. Please continue with Google instead.",
  account_not_verified: "Please verify your email before signing in.",
  CredentialsSignin: "Invalid email or password.",
  OAuthAccountNotLinked:
    "An account already exists with this email. Please sign in with your email and password instead.",
  AccessDenied: "You don't have permission to sign in.",
  Verification: "That verification link is invalid or has expired.",
  Default: "Something went wrong. Please try again.",
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
