"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { authClient } from "@/lib/auth/auth-client";
import { signInSchema } from "@/lib/validations/auth";

export function SignInForm() {
  const router = useRouter();
  const [error, setError] = useState<string>();
  const [pending, setPending] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(undefined);

    const formData = new FormData(e.currentTarget);
    const parsed = signInSchema.safeParse({
      email: formData.get("email"),
      password: formData.get("password"),
    });

    if (!parsed.success) {
      setFieldErrors(parsed.error.flatten().fieldErrors);
      return;
    }

    setFieldErrors({});
    setPending(true);
    const { error } = await authClient.signIn.email(parsed.data, {
      async onSuccess(context) {
        console.log(context);
        if (context.data.twoFactorRedirect) {
          router.push("/two-factor");
        } else {
          router.push("/dashboard");
        }
      },
    });
    setPending(false);

    if (error) {
      setError(error.message ?? "Something went wrong. Please try again.");
    }
  }
  return (
    <form className="space-y-4" onSubmit={onSubmit}>
      <div>
        <input name="email" placeholder="Email" required type="email" />
        {fieldErrors.email && (
          <p className="text-red-500">{fieldErrors.email[0]}</p>
        )}
      </div>
      <div>
        <input
          name="password"
          placeholder="Password"
          required
          type="password"
        />
        {fieldErrors.password && (
          <p className="text-red-500">{fieldErrors.password[0]}</p>
        )}
      </div>

      {error && <p className="text-red-500">{error}</p>}
      <button disabled={pending} type="submit">
        {pending ? "Signing in…" : "SignIn"}
      </button>
    </form>
  );
}
