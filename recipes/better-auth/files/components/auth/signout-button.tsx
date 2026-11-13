"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toastManager } from "@/components/ui/toast";
import { authClient } from "@/lib/auth/auth-client";

export function SignOutButton() {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function signOut() {
    setPending(true);
    const { error } = await authClient.signOut();
    if (error) {
      toastManager.add({
        title: error.message ?? "Could not sign out.",
        type: "error",
      });
      setPending(false);
      return;
    }
    router.push("/login");
    router.refresh();
  }

  return (
    <button
      aria-busy={pending}
      className="underline underline-offset-2"
      disabled={pending}
      onClick={signOut}
      type="button"
    >
      {pending ? "Signing out..." : "Sign out"}
    </button>
  );
}
