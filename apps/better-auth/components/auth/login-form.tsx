"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { authClient } from "@/lib/auth/auth-client";

export function LoginForm() {
  const router = useRouter();
  const [error, setError] = useState<string>();
  const [pending, setPending] = useState(false);

  async function onSubmit(formData: FormData) {
    setPending(true);
    setError(undefined);

    const { error } = await authClient.signIn.email({
      callbackURL: "/dashboard",
      email: String(formData.get("email")),
      password: String(formData.get("password")),
      rememberMe: true,
    });

    setPending(false);
    if (error) setError(error.message);
    else router.push("/dashboard");
  }
  return (
    <form action={onSubmit}>
      <input autoComplete="email" name="email" type="email" />
      <input autoComplete="new-password" name="password" type="password" />
      {error && <p role="alert">{error}</p>}
      <button disabled={pending}>
        {pending ? "Logging in..." : "Sign in"}
      </button>
    </form>
  );
}
