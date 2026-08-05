"use client";

import { GitBranch, Loader2 } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { toastManager } from "@/components/ui/toast";
import { authClient } from "@/lib/auth/auth-client";

const PROVIDERS = ["google", "github"] as const;
type Provider = (typeof PROVIDERS)[number];

const LINK_ERROR_MESSAGES: Record<string, string> = {
  account_already_linked_to_different_user:
    "That provider account is already linked to a different user.",
  "email_doesn't_match":
    "That provider account's email doesn't match your account's email.",
  unable_to_link_account:
    "Couldn't verify that provider account. Please try again.",
};

export function LinkedAccounts({
  linkedProviders,
}: {
  linkedProviders: string[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [pending, setPending] = useState<Provider | null>(null);
  const linked = new Set(linkedProviders);

  async function disconnect(provider: Provider) {
    setPending(provider);
    try {
      const { error } = await authClient.unlinkAccount({
        providerId: provider,
      });
      if (error) {
        toastManager.add({
          title: error.message ?? "Couldn't disconnect account.",
          type: "error",
        });
      } else {
        toastManager.add({
          title: `${provider === "google" ? "Google" : "GitHub"} disconnected`,
          type: "success",
        });
        router.refresh();
      }
    } catch {
      toastManager.add({ title: "Something went wrong", type: "error" });
    } finally {
      setPending(null);
    }
  }

  useEffect(() => {
    const error = searchParams.get("error");
    if (!error) return;

    toastManager.add({
      title: LINK_ERROR_MESSAGES[error] ?? "Couldn't link account.",
      type: "error",
    });
    router.replace(pathname, { scroll: false });
  }, [searchParams, router, pathname]);

  async function connect(provider: Provider) {
    setPending(provider);
    try {
      const { error } = await authClient.linkSocial({
        callbackURL: pathname,
        errorCallbackURL: pathname,
        provider,
      });
      if (error) {
        toastManager.add({
          title: error.message ?? "Couldn't link account.",
          type: "error",
        });
        setPending(null);
      }
    } catch {
      toastManager.add({ title: "Something went wrong", type: "error" });
      setPending(null);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Connected accounts</CardTitle>
        <CardDescription>
          Sign in faster by connecting a social account to your email.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-3">
        {PROVIDERS.map((provider) => (
          <div
            className="flex items-center justify-between rounded-md border p-3"
            key={provider}
          >
            <div className="flex items-center gap-2">
              {provider === "google" ? (
                <p className="w-4 text-center font-semibold text-sm">G</p>
              ) : (
                <GitBranch className="h-4 w-4" />
              )}
              <span className="text-sm capitalize">{provider}</span>
            </div>
            {linked.has(provider) ? (
              <div className="flex items-center gap-2">
                <Badge variant="success">Connected</Badge>
                <Button
                  disabled={pending !== null}
                  onClick={() => disconnect(provider)}
                  size="sm"
                  variant="ghost"
                >
                  {pending === provider && (
                    <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                  )}
                  Disconnect
                </Button>
              </div>
            ) : (
              <Button
                disabled={pending !== null}
                onClick={() => connect(provider)}
                size="sm"
                variant="outline"
              >
                {pending === provider && (
                  <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                )}
                Connect
              </Button>
            )}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
