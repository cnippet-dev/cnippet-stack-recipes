"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { authClient } from "@/lib/auth/auth-client";

export function SignoutButton() {
  const router = useRouter();
  const [error, setError] = useState<string>();
  const [pending, setPending] = useState(false);

  async function signout() {
    setPending(true);
    setError(undefined);

    const { error } = await authClient.signOut({
      fetchOptions: {
        onSuccess: () => router.push("/login"),
      },
    });

    setPending(false);
    if (error) setError(error.message);
    else router.push("/login");
  }
  return (
    <div className="text-white">
      {error && <p role="alert">{error}</p>}
      <button onClick={signout}>
        {pending ? "Signing out..." : "Signout"}
      </button>
    </div>
  );
}
