import { OAuthButtons } from "@/components/auth/oauth-buttons";
import { SignInForm } from "@/components/auth/signin-form";

export default function Login() {
  return (
    <div>
      <SignInForm />
      <OAuthButtons />
    </div>
  );
}
