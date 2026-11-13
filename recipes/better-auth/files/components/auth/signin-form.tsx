"use client";

import { EyeIcon, EyeOffIcon } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group";
import { Spinner } from "@/components/ui/spinner";
import { toastManager } from "@/components/ui/toast";
import { authClient } from "@/lib/auth/auth-client";
import { signInSchema } from "@/lib/auth/validation";
import { OAuthButtons } from "./oauth-buttons";

// Errors an OAuth sign-in sends back as ?error=...
const OAUTH_ERRORS: Record<string, string> = {
  account_not_linked:
    "That email is already registered. Sign in with your password, then connect this provider from your profile.",
};

export function SignInForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [pending, setPending] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});

  useEffect(() => {
    const error = searchParams.get("error");
    if (!error) return;
    toastManager.add({
      title: OAUTH_ERRORS[error] ?? "Sign in failed. Please try again.",
      type: "error",
    });
    router.replace("/login", { scroll: false });
  }, [searchParams, router]);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const parsed = signInSchema.safeParse({
      email: formData.get("email"),
      password: formData.get("password"),
    });
    if (!parsed.success) {
      setFieldErrors(parsed.error.flatten().fieldErrors);
      return;
    }

    setFieldErrors({});
    setPending(true);
    const { data, error } = await authClient.signIn.email(parsed.data);
    if (error) {
      toastManager.add({
        title: error.message ?? "Sign in failed",
        type: "error",
      });
      setPending(false);
      return;
    }
    // 2FA is on: the password was right, now the code.
    if ("twoFactorRedirect" in data && data.twoFactorRedirect) {
      router.push("/two-factor");
      return;
    }
    router.push("/dashboard");
    router.refresh();
  }

  return (
    <Card className="mx-auto w-full max-w-xs">
      <CardHeader>
        <CardTitle>Sign in</CardTitle>
        <CardDescription>
          Enter your email and password to access your account
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-6">
        <form className="grid gap-4" noValidate onSubmit={onSubmit}>
          <Field>
            <FieldLabel htmlFor="email">Email address</FieldLabel>
            <Input
              autoComplete="email"
              id="email"
              name="email"
              placeholder="name@example.com"
              required
              type="email"
            />
            {fieldErrors.email && (
              <p className="text-destructive text-xs">{fieldErrors.email[0]}</p>
            )}
          </Field>
          <Field>
            <FieldLabel htmlFor="password">Password</FieldLabel>
            <InputGroup>
              <InputGroupInput
                autoComplete="current-password"
                id="password"
                name="password"
                placeholder="Password"
                required
                type={isVisible ? "text" : "password"}
              />
              <InputGroupAddon align="inline-end">
                <Button
                  aria-label={isVisible ? "Hide password" : "Show password"}
                  onClick={() => setIsVisible(!isVisible)}
                  size="icon-sm"
                  type="button"
                  variant="ghost"
                >
                  {isVisible ? (
                    <EyeOffIcon aria-hidden="true" />
                  ) : (
                    <EyeIcon aria-hidden="true" />
                  )}
                </Button>
              </InputGroupAddon>
            </InputGroup>
            {fieldErrors.password && (
              <p className="text-destructive text-xs">
                {fieldErrors.password[0]}
              </p>
            )}
          </Field>
          <Button className="w-full" disabled={pending} type="submit">
            {pending && <Spinner className="size-4" />}
            {pending ? "Signing in..." : "Sign in"}
          </Button>
        </form>
        <OAuthButtons errorPath="/login" />
      </CardContent>
      <CardFooter>
        <p className="w-full text-center text-muted-foreground text-xs">
          No account yet?{" "}
          <Link className="underline underline-offset-4" href="/register">
            Create one
          </Link>
        </p>
      </CardFooter>
    </Card>
  );
}
