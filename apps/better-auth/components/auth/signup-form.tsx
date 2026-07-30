"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { authClient } from "@/lib/auth/auth-client";
import { signUpSchema } from "@/lib/validations/auth";

export default function SignUpForm() {
  const router = useRouter();
  const [error, setError] = useState<string>();
  const [pending, setPending] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);
    setError(undefined);

    const formData = new FormData(e.currentTarget);
    const parsed = signUpSchema.safeParse({
      email: formData.get("email"),
      name: formData.get("name"),
      password: formData.get("password"),
    });

    if (!parsed.success) {
      setFieldErrors(parsed.error.flatten().fieldErrors);
      return;
    }

    setPending(true);
    const { error } = await authClient.signUp.email(parsed.data);
    setPending(false);

    if (error) {
      setError(error.message ?? "Something went wrong. Please try again.");
      return;
    }
    router.push("/dashboard");
  }

  return (
    <form className="space-y-4" onSubmit={onSubmit}>
      <div>
        <input name="name" placeholder="Name" required />
        {fieldErrors.name && (
          <p className="text-red-500">{fieldErrors.name[0]}</p>
        )}
      </div>
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
        {pending ? "Creating account…" : "SignUp"}
      </button>
    </form>
  );
}
