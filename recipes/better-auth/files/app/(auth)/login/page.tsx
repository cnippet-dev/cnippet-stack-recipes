import { Suspense } from "react";
import { SignInForm } from "@/components/auth/signin-form";

export default function LoginPage() {
  // The form reads ?error= from the URL, which needs a Suspense boundary.
  return (
    <Suspense>
      <SignInForm />
    </Suspense>
  );
}
