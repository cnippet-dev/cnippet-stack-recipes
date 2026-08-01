"use client";

import { EyeIcon, EyeOffIcon } from "lucide-react";
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
import { Separator } from "@/components/ui/separator";
import { authClient } from "@/lib/auth/auth-client";
import { signUpSchema } from "@/lib/validations/auth.schema";
import { toastManager } from "../ui/toast";
import { OAuthButtons } from "./oauth-buttons";

export default function SignUpForm() {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);

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

    setPending(true);
    const { error } = await authClient.signUp.email(parsed.data);
    setPending(false);

    if (error) {
      toastManager.add({ title: error.message, type: "error" });
      return;
    }

    toastManager.add({ title: "Signup successfull!", type: "success" });
    router.push("/dashboard");
  }

  return (
    <Card className="mx-auto w-full max-w-xs">
      <CardHeader>
        <CardTitle>Sign Up</CardTitle>
        <CardDescription>Enter details to create your account</CardDescription>
      </CardHeader>
      <CardContent>
        <form className="grid gap-6" onSubmit={onSubmit}>
          <div className="grid gap-4">
            <Field>
              <FieldLabel htmlFor="name">Name</FieldLabel>
              <Input
                autoComplete="name"
                className="rounded-xs"
                id="name"
                name="name"
                placeholder="Cnippet Doe"
                required
                type="name"
              />
              {fieldErrors.name && (
                <p className="text-red-500 text-xs">{fieldErrors.name[0]}</p>
              )}
            </Field>
            <Field>
              <FieldLabel htmlFor="email">Email address</FieldLabel>
              <Input
                autoComplete="email"
                className="rounded-xs"
                id="email"
                name="email"
                placeholder="name@example.com"
                required
                type="email"
              />
              {fieldErrors.email && (
                <p className="text-red-500 text-xs">{fieldErrors.email[0]}</p>
              )}
            </Field>
            <Field>
              <div className="flex w-full items-center justify-between">
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
                    className="rounded-xs"
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
                <p className="text-red-500 text-xs">
                  {fieldErrors.password[0]}
                </p>
              )}
            </Field>
            <Button
              className="w-full rounded-xs"
              disabled={pending}
              type="submit"
            >
              {pending ? "Signing in..." : "Sign in"}
            </Button>
          </div>
        </form>
        <div className="mt-5 flex flex-col gap-6">
          <div className="flex items-center gap-3 text-muted-foreground text-xs">
            <Separator className="flex-1" />
            <span>Or continue with</span>
            <Separator className="flex-1" />
          </div>
          <OAuthButtons />
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
