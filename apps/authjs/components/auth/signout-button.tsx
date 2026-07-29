"use client";

import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useActionState, useEffect } from "react";
import { type SignOutState, signoutAction } from "@/lib/actions/signout";

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
  }, [state.success, update, router.refresh, router.push]);

  return (
    <form action={formAction}>
      <button className="underline underline-offset-2" type="submit">
        Sign out
      </button>
    </form>
  );
}
