"use client";

import { loginAction } from "@/lib/actions/login";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useActionState, useEffect, useState } from "react";
import { EyeIcon, EyeOffIcon } from "lucide-react";
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
import { Separator } from "@/components/ui/separator";

export function LoginForm({
  initialError,
  oauthButtons,
}: {
  initialError?: string;
  oauthButtons: React.ReactNode;
}) {
  const [isVisible, setIsVisible] = useState(false);
  const [state, formAction, pending] = useActionState(loginAction, {
    message: initialError ?? "",
  });
  const { update } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (state.success) {
      update().then(() => {
        router.push("/dashboard");
        router.refresh();
      });
    }
  }, [state.success]);

  return (
    <Card className="mx-auto w-full max-w-xs">
      <CardHeader>
        <CardTitle>Sign in</CardTitle>
        <CardDescription>
          Enter your email and password to access your account
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="grid gap-6">
          <div className="grid gap-4">
            <Field>
              <FieldLabel htmlFor="email">Email address</FieldLabel>
              <Input
                id="email"
                name="email"
                placeholder="name@example.com"
                required
                type="email"
                autoComplete="email"
                className="rounded-xs"
              />
            </Field>
            <Field>
              <div className="flex items-center justify-between w-full">
                <FieldLabel htmlFor="password">Password</FieldLabel>
                <a
                  className="text-muted-foreground text-xs underline-offset-4 hover:underline"
                  href="#"
                >
                  Forgot Password?
                </a>
              </div>
              <InputGroup className="rounded-xs">
                <InputGroupInput
                  id="password"
                  name="password"
                  placeholder="Password"
                  required
                  type={isVisible ? "text" : "password"}
                  autoComplete="current-password"
                />
                <InputGroupAddon align="inline-end">
                  <Button
                    aria-label={isVisible ? "Hide password" : "Show password"}
                    onClick={() => setIsVisible(!isVisible)}
                    size="icon-sm"
                    variant="ghost"
                    type="button"
                    className="rounded-xs"
                  >
                    {isVisible ? (
                      <EyeOffIcon aria-hidden="true" />
                    ) : (
                      <EyeIcon aria-hidden="true" />
                    )}
                  </Button>
                </InputGroupAddon>
              </InputGroup>
            </Field>
            <Button
              className="w-full rounded-xs"
              type="submit"
              disabled={pending}
            >
              {pending ? "Signing in..." : "Sign in"}
            </Button>
          </div>

          {state?.message && (
            <p role="alert" className="text-destructive text-sm">
              {state.message}
            </p>
          )}
        </form>
        <div className="flex flex-col gap-6 mt-5">
          <div className="flex items-center gap-3 text-muted-foreground text-xs">
            <Separator className="flex-1" />
            <span>Or continue with</span>
            <Separator className="flex-1" />
          </div>
          {oauthButtons}
        </div>
      </CardContent>
      <CardFooter>
        <p className="w-full text-center text-muted-foreground text-xs">
          By clicking continue, you agree to our{" "}
          <a
            className="underline underline-offset-4 hover:text-primary"
            href="#"
          >
            Terms of Service
          </a>
        </p>
      </CardFooter>
    </Card>
  );
}
