"use client";

import { EyeIcon, EyeOffIcon } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
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
import { signUpSchema } from "@/lib/auth/validation";
import { OAuthButtons } from "./oauth-buttons";

export function SignUpForm() {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const parsed = signUpSchema.safeParse({
      email: formData.get("email"),
      name: formData.get("name"),
      password: formData.get("password"),
    });
    if (!parsed.success) {
      setFieldErrors(parsed.error.flatten().fieldErrors);
      return;
    }

    setFieldErrors({});
    setPending(true);
    const { error } = await authClient.signUp.email(parsed.data);
    if (error) {
      toastManager.add({
        title: error.message ?? "Sign up failed",
        type: "error",
      });
      setPending(false);
      return;
    }
    // Sign-up also signs the user in.
    router.push("/dashboard");
    router.refresh();
  }

  return (
    <Card className="mx-auto w-full max-w-xs">
      <CardHeader>
        <CardTitle>Create an account</CardTitle>
        <CardDescription>Enter your details to get started</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-6">
        <form className="grid gap-4" noValidate onSubmit={onSubmit}>
          <Field>
            <FieldLabel htmlFor="name">Name</FieldLabel>
            <Input
              autoComplete="name"
              id="name"
              name="name"
              placeholder="Ada Lovelace"
              required
            />
            {fieldErrors.name && (
              <p className="text-destructive text-xs">{fieldErrors.name[0]}</p>
            )}
          </Field>
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
                autoComplete="new-password"
                id="password"
                name="password"
                placeholder="At least 8 characters"
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
            {pending ? "Creating account..." : "Create account"}
          </Button>
        </form>
        <OAuthButtons errorPath="/register" />
      </CardContent>
      <CardFooter>
        <p className="w-full text-center text-muted-foreground text-xs">
          Already have an account?{" "}
          <Link className="underline underline-offset-4" href="/login">
            Sign in
          </Link>
        </p>
      </CardFooter>
    </Card>
  );
}
