"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { authClient } from "@/lib/auth/auth-client";

export default function RegisterForm() {
  const router = useRouter();
  const [error, setError] = useState<string>();
  const [pending, setPending] = useState(false);

  async function onSubmit(formData: FormData) {
    setPending(true);
    setError(undefined);

    const { error } = await authClient.signUp.email({
      callbackURL: "/dashboard",
      email: String(formData.get("email")),
      name: String(formData.get("name")),
      password: String(formData.get("password")),
    });

    setPending(false);
    if (error) setError(error.message);
    else router.push("/dashboard");
  }

  return (
    <form action={onSubmit}>
      <input name="name" required />
      <input autoComplete="email" name="email" required type="email" />
      <input autoComplete="new-password" name="password" type="password" />

      {error && <p role="alert">{error}</p>}
      <button disabled={pending}>{pending ? "Creating..." : "Sign up"}</button>
    </form>
  );
}
