import { LoginForm } from "@/components/auth/login-form";
import { OAuthButtons } from "@/components/auth/oauth-buttons";
import { getAuthErrorMessage } from "@/lib/errors/handle-auth-errors";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; code?: string }>;
}) {
  const { error, code } = await searchParams;
  const oauthError = getAuthErrorMessage(error, code);

  return (
    <LoginForm initialError={oauthError} oauthButtons={<OAuthButtons />} />
  );
}
