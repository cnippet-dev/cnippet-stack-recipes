"use client";

import { useRouter } from "next/navigation";
import { QRCodeSVG } from "qrcode.react";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
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
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp";
import { Spinner } from "@/components/ui/spinner";
import { toastManager } from "@/components/ui/toast";
import { authClient } from "@/lib/auth/auth-client";

type Step = "idle" | "password" | "scan" | "backup-codes";

export function TwoFactorSettings({
  enabled,
  hasPassword,
}: {
  enabled: boolean;
  hasPassword: boolean;
}) {
  const router = useRouter();
  const [step, setStep] = useState<Step>("idle");
  const [password, setPassword] = useState("");
  const [totpURI, setTotpURI] = useState("");
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [code, setCode] = useState("");
  const [pending, setPending] = useState(false);

  function reset() {
    setStep("idle");
    setPassword("");
    setTotpURI("");
    setBackupCodes([]);
    setCode("");
  }

  function fail(message: string | undefined, fallback: string) {
    toastManager.add({ title: message ?? fallback, type: "error" });
    setPending(false);
  }

  // Turning 2FA on or off needs the password again, so a stolen session can't do it.
  async function submitPassword() {
    setPending(true);
    if (enabled) {
      const { error } = await authClient.twoFactor.disable({ password });
      if (error) return fail(error.message, "Incorrect password");
      toastManager.add({ title: "Two-factor turned off", type: "success" });
      reset();
      setPending(false);
      router.refresh();
      return;
    }

    const { data, error } = await authClient.twoFactor.enable({ password });
    if (error) return fail(error.message, "Incorrect password");
    // Since better-auth 1.7 the response says which method was enrolled.
    if (data.method !== "totp") return fail(undefined, "Unexpected 2FA method");
    setTotpURI(data.totpURI);
    setBackupCodes(data.backupCodes);
    setPassword("");
    setStep("scan");
    setPending(false);
  }

  // 2FA only switches on once a code from the app proves the scan worked.
  async function verifyCode(value: string) {
    setPending(true);
    const { error } = await authClient.twoFactor.verifyTotp({ code: value });
    if (error) {
      setCode("");
      return fail(error.message, "Invalid code");
    }
    setStep("backup-codes");
    setPending(false);
    router.refresh();
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          Two-factor authentication
          <Badge variant={enabled ? "success" : "secondary"}>
            {enabled ? "On" : "Off"}
          </Badge>
        </CardTitle>
        <CardDescription>
          Ask for a code from an authenticator app every time you sign in.
        </CardDescription>
      </CardHeader>

      {!hasPassword && (
        <CardContent className="text-muted-foreground text-sm">
          Two-factor needs a password, and this account only signs in through a
          social provider.
        </CardContent>
      )}

      {hasPassword && step === "password" && (
        <CardContent>
          <Field>
            <FieldLabel htmlFor="2fa-password">
              Confirm your password
            </FieldLabel>
            <Input
              autoComplete="current-password"
              autoFocus
              id="2fa-password"
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) =>
                e.key === "Enter" && password && submitPassword()
              }
              type="password"
              value={password}
            />
          </Field>
        </CardContent>
      )}

      {step === "scan" && (
        <CardContent className="flex flex-col items-center gap-4">
          <p className="text-sm">
            Scan this with your authenticator app, then enter the code it shows.
          </p>
          <div className="rounded-md bg-white p-3">
            {/* Drawn in the browser, so the secret never goes to a QR service. */}
            <QRCodeSVG size={160} value={totpURI} />
          </div>
          <InputOTP
            maxLength={6}
            onChange={setCode}
            onComplete={verifyCode}
            value={code}
          >
            <InputOTPGroup>
              {[0, 1, 2, 3, 4, 5].map((i) => (
                <InputOTPSlot index={i} key={i} />
              ))}
            </InputOTPGroup>
          </InputOTP>
        </CardContent>
      )}

      {step === "backup-codes" && (
        <CardContent className="grid gap-3">
          <p className="text-sm">
            Two-factor is on. Save these backup codes somewhere safe: each one
            signs you in once if you lose your phone. They won&apos;t be shown
            again.
          </p>
          <div className="flex flex-wrap gap-1.5 rounded-md border p-3">
            {backupCodes.map((c) => (
              <Badge className="font-mono" key={c} variant="secondary">
                {c}
              </Badge>
            ))}
          </div>
        </CardContent>
      )}

      {hasPassword && (
        <CardFooter className="gap-2">
          {step === "idle" && (
            <Button
              onClick={() => setStep("password")}
              variant={enabled ? "destructive" : "default"}
            >
              {enabled ? "Turn off" : "Turn on"}
            </Button>
          )}
          {step === "password" && (
            <Button disabled={pending || !password} onClick={submitPassword}>
              {pending && <Spinner className="size-4" />}
              Continue
            </Button>
          )}
          {step === "backup-codes" ? (
            <Button onClick={reset}>Done</Button>
          ) : (
            step !== "idle" && (
              <Button disabled={pending} onClick={reset} variant="ghost">
                Cancel
              </Button>
            )
          )}
        </CardFooter>
      )}
    </Card>
  );
}
