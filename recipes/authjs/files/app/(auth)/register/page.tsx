import { OAuthButtons } from "@/components/auth/oauth-buttons";
import RegisterForm from "@/components/auth/register-form";
import { getAuthErrorMessage } from "@/lib/errors/handle-auth-errors";

export default async function RegisterPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; code?: string }>;
}) {
  const { error, code } = await searchParams;
  const oauthError = getAuthErrorMessage(error, code);

  return (
    <RegisterForm initialError={oauthError} oauthButtons={<OAuthButtons />} />
  );
}
