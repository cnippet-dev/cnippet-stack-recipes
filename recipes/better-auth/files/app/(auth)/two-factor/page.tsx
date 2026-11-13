"use client";

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
import { Input } from "@/components/ui/input";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp";
import { Spinner } from "@/components/ui/spinner";
import { toastManager } from "@/components/ui/toast";
import { authClient } from "@/lib/auth/auth-client";

// Sign-in lands here when the account has 2FA on. The password was already
// checked; a short-lived cookie remembers that until a code is verified.
export default function TwoFactorPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"totp" | "backup">("totp");
  const [code, setCode] = useState("");
  const [pending, setPending] = useState(false);

  const ready = mode === "totp" ? code.length === 6 : code.trim() !== "";

  async function verify(value = code) {
    setPending(true);
    const { error } =
      mode === "totp"
        ? await authClient.twoFactor.verifyTotp({ code: value })
        : await authClient.twoFactor.verifyBackupCode({ code: value.trim() });
    if (error) {
      toastManager.add({
        title: error.message ?? "Invalid code",
        type: "error",
      });
      setCode("");
      setPending(false);
      return;
    }
    router.push("/dashboard");
    router.refresh();
  }

  function toggleMode() {
    setMode(mode === "totp" ? "backup" : "totp");
    setCode("");
  }

  return (
    <Card className="w-full max-w-xs">
      <CardHeader>
        <CardTitle>Two-factor authentication</CardTitle>
        <CardDescription>
          {mode === "totp"
            ? "Enter the 6-digit code from your authenticator app."
            : "Enter one of your unused backup codes."}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col items-center gap-4">
        {mode === "totp" ? (
          <InputOTP
            autoFocus
            maxLength={6}
            onChange={setCode}
            onComplete={verify}
            value={code}
          >
            <InputOTPGroup>
              {[0, 1, 2, 3, 4, 5].map((i) => (
                <InputOTPSlot index={i} key={i} />
              ))}
            </InputOTPGroup>
          </InputOTP>
        ) : (
          <Input
            aria-label="Backup code"
            autoFocus
            className="text-center"
            onChange={(e) => setCode(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && ready && verify()}
            placeholder="xxxxx-xxxxx"
            value={code}
          />
        )}
        <Button onClick={toggleMode} size="sm" type="button" variant="link">
          {mode === "totp"
            ? "Use a backup code instead"
            : "Use your authenticator app instead"}
        </Button>
      </CardContent>
      <CardFooter>
        <Button
          className="w-full"
          disabled={pending || !ready}
          onClick={() => verify()}
        >
          {pending && <Spinner className="size-4" />}
          Verify
        </Button>
      </CardFooter>
    </Card>
  );
}
