"use client";

import { loginAction } from "@/lib/actions/login";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useActionState, useEffect } from "react";

export function LoginForm({ initialError }: { initialError?: string }) {
  const [state, formAction, pending] = useActionState(loginAction, {
    message: initialError ?? "",
  });
  const { update } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (state.success) {
      update().then(() => {
        router.push("/dashboard");
        router.refresh();
      });
    }
  }, [state.success]);
  return (
    <form action={formAction} className="flex flex-col w-full">
      <label htmlFor="email">Email</label>
      <input
        id="email"
        type="email"
        name="email"
        required
        autoComplete="email"
        className="border px-2 py-1 rounded-sm w-full border-white/60"
      />
      <label htmlFor="password">Password</label>

      <input
        id="password"
        type="password"
        name="password"
        required
        autoComplete="current-password"
        className="border px-2 py-1 rounded-sm border-white/60"
      />
      {state?.message && <p role="alert">{state.message}</p>}
      <button
        disabled={pending}
        className="border px-2 py-1 rounded-sm w-fit mx-auto my-4 "
      >
        {pending ? "Signing in..." : "Sign in"}
      </button>
    </form>
  );
}
