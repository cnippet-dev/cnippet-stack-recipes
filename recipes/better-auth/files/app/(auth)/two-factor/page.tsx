"use client";

import { Loader2 } from "lucide-react";
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
import { toastManager } from "@/components/ui/toast";
import { authClient } from "@/lib/auth/auth-client";

export default function TwoFactor() {
  const router = useRouter();
  const [code, setCode] = useState<string>("");
  const [backupCode, setBackupCode] = useState<string>("");
  const [mode, setMode] = useState<"totp" | "backup">("totp");
  const [isLoading, setIsLoading] = useState(false);

  const verifyCode = async () => {
    if (code.length !== 6) return;
    setIsLoading(true);

    const { error } = await authClient.twoFactor.verifyTotp({ code });

    if (error) {
      toastManager.add({ title: error.message, type: "error" });
      setIsLoading(false);
      return;
    }

    toastManager.add({ title: "Login successful!", type: "success" });
    router.push("/dashboard");
  };

  const verifyBackupCode = async () => {
    if (!backupCode.trim()) return;

    setIsLoading(true);
    const { error } = await authClient.twoFactor.verifyBackupCode({
      code: backupCode.trim(),
    });

    if (error) {
      toastManager.add({
        title: error.message ?? "Something went wrong",
        type: "error",
      });
      setIsLoading(false);
      return;
    }

    toastManager.add({ title: "Login successful!", type: "success" });
    router.push("/dashboard");
  };

  const toggleMode = () => {
    setMode((prev) => (prev === "totp" ? "backup" : "totp"));
    setCode("");
    setBackupCode("");
  };

  return (
    <div className="flex p-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Two-factor authentication </CardTitle>
          <CardDescription>
            {mode === "totp"
              ? "Enter the 6-digit code from your authenticator app."
              : "Enter one of your unused backup codes."}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center gap-4">
          {mode === "totp" ? (
            <InputOTP
              maxLength={6}
              onChange={(value) => setCode(value)}
              onComplete={verifyCode}
              value={code}
            >
              <InputOTPGroup>
                <InputOTPSlot index={0} />
                <InputOTPSlot index={1} />
                <InputOTPSlot index={2} />
                <InputOTPSlot index={3} />
                <InputOTPSlot index={4} />
                <InputOTPSlot index={5} />
              </InputOTPGroup>
            </InputOTP>
          ) : (
            <Input
              autoFocus
              className="text-center"
              onChange={(e) => setBackupCode(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") verifyBackupCode();
              }}
              placeholder="xxxxx-xxxxx"
              value={backupCode}
            />
          )}

          <Button
            className="text-muted-foreground text-sm"
            onClick={toggleMode}
            type="button"
            variant="link"
          >
            {mode === "totp"
              ? "Use a backup code instead"
              : "Use authenticator app instead"}
          </Button>
        </CardContent>
        <CardFooter>
          <Button
            className="w-full"
            disabled={
              isLoading ||
              (mode === "totp" ? code.length !== 6 : !backupCode.trim())
            }
            onClick={mode === "totp" ? verifyCode : verifyBackupCode}
          >
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Verify code
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
