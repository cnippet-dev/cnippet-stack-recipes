"use client";

import { GitBranch } from "lucide-react";
import { authClient } from "@/lib/auth/auth-client";
import { Button } from "../ui/button";

export function OAuthButtons({ path }: { path: string }) {
  return (
    <div className="flex max-w-full rounded-sm border border-white/60">
      {(["google", "github"] as const).map((provider) => (
        <Button
          className="w-1/2 rounded-xs"
          key={provider}
          onClick={() =>
            authClient.signIn.social({
              callbackURL: "/dashboard",
              errorCallbackURL: path,
              provider,
            })
          }
          type="submit"
          variant="outline"
        >
          {provider === "google" ? (
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
