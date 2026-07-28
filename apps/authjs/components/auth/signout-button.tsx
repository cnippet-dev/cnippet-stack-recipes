"use client";

import { useActionState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { signoutAction, SignOutState } from "@/lib/actions/signout";

const initialState: SignOutState = {};

export function SignOutButton() {
  const [state, formAction] = useActionState(signoutAction, initialState);
  const { update } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (state.success) {
      update().then(() => {
        router.push("/login");
        router.refresh();
      });
    }
  }, [state.success]);

  return (
    <form action={formAction}>
      <button type="submit" className="underline underline-offset-2">
        Sign out
      </button>
    </form>
  );
}
