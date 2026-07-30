import { OAuthButtons } from "@/components/auth/oauth-buttons";
import RegisterForm from "@/components/auth/signup-form";

export default function Regiser() {
  return (
    <div>
      <RegisterForm />
      <OAuthButtons />
    </div>
  );
}
