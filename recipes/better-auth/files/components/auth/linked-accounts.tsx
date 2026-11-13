"use client";

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
import { Spinner } from "@/components/ui/spinner";
import { toastManager } from "@/components/ui/toast";
import { authClient } from "@/lib/auth/auth-client";
import { type OAuthProvider, oauthProviders } from "@/lib/auth/providers";

// Errors a failed link sends back as ?error=...
const LINK_ERRORS: Record<string, string> = {
  account_already_linked_to_different_user:
    "That account is already linked to a different user.",
  "email_doesn't_match": "That account's email doesn't match yours.",
};

export function LinkedAccounts({
  accounts,
}: {
  accounts: { id: string; providerId: string }[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [pending, setPending] = useState<OAuthProvider | null>(null);

  useEffect(() => {
    const error = searchParams.get("error");
    if (!error) return;
    toastManager.add({
      title: LINK_ERRORS[error] ?? "Couldn't connect that account.",
      type: "error",
    });
    router.replace(pathname, { scroll: false });
  }, [searchParams, router, pathname]);

  if (oauthProviders.length === 0) return null;

  async function connect(provider: OAuthProvider) {
    setPending(provider);
    // Leaves for the provider and comes back here.
    const { error } = await authClient.linkSocial({
      callbackURL: pathname,
      errorCallbackURL: pathname,
      provider,
    });
    if (error) {
      toastManager.add({
        title: error.message ?? "Couldn't connect that account.",
        type: "error",
      });
      setPending(null);
    }
  }

  async function disconnect(provider: OAuthProvider, accountId: string) {
    setPending(provider);
    // The Better Auth account row id, not the provider's user id.
    const { error } = await authClient.unlinkAccount({ accountId });
    if (error) {
      // e.g. it's the only way this account can sign in.
      toastManager.add({
        title: error.message ?? "Couldn't disconnect that account.",
        type: "error",
      });
    } else {
      router.refresh();
    }
    setPending(null);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Connected accounts</CardTitle>
        <CardDescription>
          Sign in with any of these as well as your email.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-2">
        {oauthProviders.map(({ id, label }) => {
          const account = accounts.find((a) => a.providerId === id);
          const isLinked = account !== undefined;
          return (
            <div
              className="flex items-center justify-between rounded-md border p-3 text-sm"
              key={id}
            >
              <span className="flex items-center gap-2">
                {label}
                {isLinked && <Badge variant="success">Connected</Badge>}
              </span>
              <Button
                disabled={pending !== null}
                onClick={() =>
                  account ? disconnect(id, account.id) : connect(id)
                }
                size="sm"
                variant={isLinked ? "ghost" : "outline"}
              >
                {pending === id && <Spinner className="size-3.5" />}
                {isLinked ? "Disconnect" : "Connect"}
              </Button>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
