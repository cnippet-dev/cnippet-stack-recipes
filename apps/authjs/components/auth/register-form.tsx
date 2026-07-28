"use client";

import { registerAction, RegisterFormState } from "@/lib/actions/register";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useActionState, useEffect } from "react";

const initialState: RegisterFormState = { success: false };

export default function RegisterForm({
  initialError,
}: {
  initialError?: string;
}) {
  const [state, formAction, pending] = useActionState(registerAction, {
    ...initialState,
    message: initialError,
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
      <label htmlFor="name">Name</label>
      <input
        id="name"
        name="name"
        type="text"
        required
        autoComplete="name"
        className="border px-2 py-1 rounded-sm w-full border-white/60"
      />
      <label htmlFor="email">Email</label>
      <input
        id="email"
        name="email"
        type="email"
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
        className="border px-2 py-1 rounded-sm w-full border-white/60"
      />
      {state?.message && <p role="alert">{state.message}</p>}
      <button
        disabled={pending}
        type="submit"
        className="border px-2 py-1 rounded-sm w-fit mx-auto mt-4 border-white/60"
      >
        {pending ? "Signing up..." : "Sign up"}
      </button>
    </form>
  );
}
