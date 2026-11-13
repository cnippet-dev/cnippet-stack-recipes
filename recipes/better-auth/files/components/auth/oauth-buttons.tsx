"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Spinner } from "@/components/ui/spinner";
import { toastManager } from "@/components/ui/toast";
import { authClient } from "@/lib/auth/auth-client";
import { type OAuthProvider, oauthProviders } from "@/lib/auth/providers";

export function OAuthButtons({ errorPath }: { errorPath: string }) {
  const [pending, setPending] = useState<OAuthProvider | null>(null);

  if (oauthProviders.length === 0) return null;

  async function signIn(provider: OAuthProvider) {
    setPending(provider);
    const { error } = await authClient.signIn.social({
      callbackURL: "/dashboard",
      errorCallbackURL: errorPath,
      provider,
    });
    // On success the browser is already leaving for the provider: keep the spinner.
    if (error) {
      toastManager.add({
        title: error.message ?? "Sign in failed",
        type: "error",
      });
      setPending(null);
    }
  }

  return (
    <div className="grid gap-4">
      <div className="flex items-center gap-3 text-muted-foreground text-xs">
        <Separator className="flex-1" />
        <span>Or continue with</span>
        <Separator className="flex-1" />
      </div>
      <div className="grid gap-2">
        {oauthProviders.map(({ id, label }) => (
          <Button
            disabled={pending !== null}
            key={id}
            onClick={() => signIn(id)}
            type="button"
            variant="outline"
          >
            {pending === id && <Spinner className="size-4" />}
            {label}
          </Button>
        ))}
      </div>
    </div>
  );
}
