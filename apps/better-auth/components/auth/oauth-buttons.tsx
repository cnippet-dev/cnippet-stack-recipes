"use client";

import { authClient } from "@/lib/auth/auth-client";

export function OAuthButtons() {
  return (
    <div className="flex gap-4">
      {(["google", "github"] as const).map((provider) => (
        <button
          key={provider}
          onClick={() =>
            authClient.signIn.social({ callbackURL: "/dashboard", provider })
          }
        >
          {provider}
        </button>
      ))}
    </div>
  );
}
