"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { sendWelcomeEmail } from "@/lib/actions/email";

export function EmailForm() {
  const [state, action, pending] = useActionState(sendWelcomeEmail, null);

  return (
    <form action={action} className="grid w-full max-w-sm gap-4">
      <div className="grid gap-2">
        <Label htmlFor="name">Name</Label>
        <Input id="name" name="name" placeholder="Ada" required />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          name="email"
          placeholder="you@example.com"
          required
          type="email"
        />
      </div>
      <Button loading={pending} type="submit">
        Send welcome email
      </Button>
      <p aria-live="polite" className="text-sm">
        {state?.ok === true && (
          <span className="text-green-600">Sent! Id: {state.id}</span>
        )}
        {state?.ok === false && (
          <span className="text-destructive">{state.error}</span>
        )}
      </p>
    </form>
  );
}
