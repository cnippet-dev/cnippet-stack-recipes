"use client";

import { GitBranch } from "lucide-react";
import { useState } from "react";
import { authClient } from "@/lib/auth/auth-client";
import { Button } from "../ui/button";
import { Spinner } from "../ui/spinner";

type Provider = "google" | "github";

export function OAuthButtons({ path }: { path: string }) {
  const [pending, setPending] = useState<Provider | null>(null);

  async function signIn(provider: Provider) {
    setPending(provider);
    const { error } = await authClient.signIn.social({
      callbackURL: "/dashboard",
      errorCallbackURL: path,
      provider,
    });
    // On success the browser is being redirected away (window.location.href,
    // set by better-auth's client redirect hook) — keep the spinner showing
    // until that navigation happens instead of flashing it off early.
    if (error) setPending(null);
  }

  return (
    <div className="flex max-w-full rounded-sm border border-white/60">
      {(["google", "github"] as const).map((provider) => (
        <Button
          className="w-1/2 rounded-xs"
          disabled={pending !== null}
          key={provider}
          onClick={() => signIn(provider)}
          type="submit"
          variant="outline"
        >
          {pending === provider ? (
            <Spinner className="size-4" />
          ) : provider === "google" ? (
            <p className="font-semibold text-[17px]">G</p>
          ) : (
            <GitBranch />
          )}
          {provider}
        </Button>
      ))}
    </div>
  );
}
