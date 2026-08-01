"use client";

import { Check, Copy, Loader2, ShieldCheck } from "lucide-react";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp";
import { Label } from "@/components/ui/label";
import { authClient } from "@/lib/auth/auth-client";

type EnableProps = {
  twoFactorEnabled: boolean;
};

export function Enable2FA({ twoFactorEnabled }: EnableProps) {
  const [step, setStep] = useState<"idle" | "password" | "qr">("idle");
  const [password, setPassword] = useState("");
  const [totpURI, setTotpURI] = useState("");
  const [code, setCode] = useState("");
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [copied, setCopied] = useState(false);
  const [isEnabling, setIsEnabling] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const confirmPassword = async () => {
    if (!password) return;
    setIsEnabling(true);
    setError(null);

    const { data, error } = await authClient.twoFactor.enable({
      issuer: "My app",
      password,
    });

    setIsEnabling(false);

    if (error) {
      setError(error.message ?? "Couldn't verify your password.");
      return;
    }

    if (data?.totpURI) {
      setTotpURI(data.totpURI);
      setBackupCodes(data.backupCodes);
      setStep("qr");
      setPassword("");
    }
  };

  const verifyCode = async () => {
    if (code.length !== 6) return;
    setIsVerifying(true);
    setError(null);

    const { error } = await authClient.twoFactor.verifyTotp({ code });

    if (error) {
      setError(error.message ?? "Invalid code. Please try again.");
      setIsVerifying(false);
      return;
    }

    window.location.reload();
  };

  const copyBackupCodes = async () => {
    await navigator.clipboard.writeText(backupCodes.join("\n"));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="max-w-md">
      {twoFactorEnabled ? (
        <Card className="mx-auto mt-2 w-fit rounded-xl p-0">
          <CardContent
            className="flex items-center gap-2 text-muted-foreground text-sm"
            style={{ padding: 4 }}
          >
            <ShieldCheck className="h-4 w-4 text-primary" />
            Two-factor authentication is enabled on your account.
          </CardContent>
        </Card>
      ) : (
        step !== "qr" && (
          <Card className="mt-2">
            <CardHeader className="p-4" style={{ paddingBottom: 0 }}>
              <CardTitle>Two-factor authentication</CardTitle>
              <CardDescription>
                Add an extra layer of security to your account using an
                authenticator app.
              </CardDescription>
            </CardHeader>
            <CardFooter className="p-4">
              <Button onClick={() => setStep("password")}>Enable 2FA</Button>
            </CardFooter>
          </Card>
        )
      )}

      {/* Password confirmation */}
      <Dialog
        onOpenChange={(open) => {
          if (!open) {
            setStep("idle");
            setPassword("");
            setError(null);
          }
        }}
        open={step === "password"}
      >
        <DialogContent className="sm:max-w-sm">
          <DialogHeader className="gap-0 p-6 pb-4">
            <DialogTitle>Confirm your password</DialogTitle>
            <DialogDescription>
              For your security, please confirm your password to continue.
            </DialogDescription>
          </DialogHeader>

          <div className="m-6 mt-0">
            <Label htmlFor="confirm-password">Password</Label>
            <Input
              autoFocus
              id="confirm-password"
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && confirmPassword()}
              type="password"
              value={password}
            />
            {error && (
              <p className="text-destructive text-sm" role="alert">
                {error}
              </p>
            )}
          </div>

          <DialogFooter className="p-6 py-4">
            <Button
              disabled={!password || isEnabling}
              onClick={confirmPassword}
            >
              {isEnabling && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Continue
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* QR + verify */}
      {step === "qr" && (
        <Card className="mt-4">
          <CardHeader>
            <CardTitle>Scan the QR code</CardTitle>
            <CardDescription>
              Scan this with your authenticator app, then enter the 6-digit code
              it generates.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center gap-6">
            <img
              alt="QR code for two-factor setup"
              className="rounded-md border p-2"
              height={160}
              src={`https://api.qrserver.com/v1/create-qr-code/?data=${encodeURIComponent(
                totpURI,
              )}`}
              width={160}
            />

            <div className="w-full space-y-2">
              <div className="flex items-center justify-between">
                <Label>Backup codes</Label>
                <Button
                  className="h-7 gap-1 text-xs"
                  onClick={copyBackupCodes}
                  size="sm"
                  variant="ghost"
                >
                  {copied ? (
                    <Check className="h-3 w-3" />
                  ) : (
                    <Copy className="h-3 w-3" />
                  )}
                  {copied ? "Copied" : "Copy"}
                </Button>
              </div>
              <div className="flex flex-wrap gap-1.5 rounded-md border bg-muted/50 p-3">
                {backupCodes.map((c) => (
                  <Badge className="font-mono" key={c} variant="secondary">
                    {c}
                  </Badge>
                ))}
              </div>
              <p className="text-muted-foreground text-xs">
                Store these somewhere safe. Each code can be used once if you
                lose access to your authenticator app.
              </p>
            </div>

            <div className="flex flex-col items-center gap-3">
              <Label>Enter the code from your app</Label>
              <InputOTP
                maxLength={6}
                onChange={setCode}
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
              {error && (
                <p className="text-destructive text-sm" role="alert">
                  {error}
                </p>
              )}
            </div>
          </CardContent>
          <CardFooter>
            <Button
              className="w-full"
              disabled={code.length !== 6 || isVerifying}
              onClick={verifyCode}
            >
              {isVerifying && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Verify code
            </Button>
          </CardFooter>
        </Card>
      )}
    </div>
  );
}
