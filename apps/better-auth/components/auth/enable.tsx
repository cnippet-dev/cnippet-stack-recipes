"use client";

import {
  AlertTriangle,
  Check,
  Copy,
  Download,
  Loader2,
  Lock,
  ShieldOff,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { QRCodeSVG } from "qrcode.react";
import { useId, useRef, useState } from "react";
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
import { toastManager } from "../ui/toast";

const BACKUP_CODES_FILENAME = "backup-codes.txt";

type Props = {
  twoFactorEnabled: boolean;
  hasPassword: boolean;
};

type Step =
  | "idle"
  | "verify-password"
  | "scan-qr"
  | "backup-codes"
  | "disable-confirm";

export function Enable({ twoFactorEnabled, hasPassword }: Props) {
  const router = useRouter();
  const codeInputId = useId();
  const passwordInputId = useId();

  const [isEnabled, setIsEnabled] = useState(twoFactorEnabled);
  const [step, setStep] = useState<Step>("idle");

  const [password, setPassword] = useState("");
  const [passwordError, setPasswordError] = useState<string | null>(null);

  const [totpUri, setTotpUri] = useState("");
  const [code, setCode] = useState("");
  const [codeError, setCodeError] = useState<string | null>(null);

  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [copied, setCopied] = useState(false);

  const [isSubmittingPassword, setIsSubmittingPassword] = useState(false);
  const [isVerifyingCode, setIsVerifyingCode] = useState(false);
  const [isDisabling, setIsDisabling] = useState(false);

  const activeRequestId = useRef(0);

  const reset = () => {
    setStep("idle");
    setPassword("");
    setPasswordError(null);
    setTotpUri("");
    setCode("");
    setCodeError(null);
    setBackupCodes([]);
    setCopied(false);
  };

  const submitPassword = async () => {
    if (!password) {
      setPasswordError("Password id required");
      return;
    }

    setPasswordError(null);
    setIsSubmittingPassword(true);

    const requestId = ++activeRequestId.current;

    try {
      const { data, error } = await authClient.twoFactor.enable({
        issuer: "My App",
        password,
      });

      if (requestId !== activeRequestId.current) return;

      if (error) {
        setPasswordError(error.message ?? "Incorrect passwood");
      }

      if (!data?.totpURI) {
        setPasswordError("Something went wrong. Please try again.");
        return;
      }

      setTotpUri(data.totpURI);
      setBackupCodes(data.backupCodes ?? []);
      setPassword("");
      setStep("scan-qr");
    } catch {
      if (requestId === activeRequestId.current) {
        setPasswordError("Something went wrong. Please try again.");
      }
    } finally {
      if (requestId === activeRequestId.current) {
        setIsSubmittingPassword(false);
      }
    }
  };

  const verifyCode = async () => {
    if (code.length !== 6) {
      setCodeError("Enter the 6-digit code from your authenticator app.");
      return;
    }

    setCodeError(null);
    setIsVerifyingCode(true);
    const requestId = ++activeRequestId.current;

    try {
      const { error } = await authClient.twoFactor.verifyTotp({ code });

      if (requestId !== activeRequestId.current) return;

      if (error) {
        setCodeError(error.message ?? "Invalid code. Try again.");
        setCode("");
        return;
      }

      setIsEnabled(true);
      setStep(backupCodes.length > 0 ? "backup-codes" : "idle");
      toastManager.add({
        title: "Two-factor authentication enabled",
        type: "success",
      });
      router.refresh();

      if (backupCodes.length === 0) reset();
    } catch {
      if (requestId === activeRequestId.current) {
        setCodeError("Something went wrong. Please try again.");
      }
    } finally {
      if (requestId === activeRequestId.current) {
        setIsVerifyingCode(false);
      }
    }
  };

  const disable = async () => {
    if (!password) {
      setPasswordError("Password is required.");
      return;
    }

    setPasswordError(null);
    setIsDisabling(true);
    const requestId = ++activeRequestId.current;

    try {
      const { error } = await authClient.twoFactor.disable({ password });

      if (requestId !== activeRequestId.current) return;

      if (error) {
        setPasswordError(error.message ?? "Incorrect password.");
        return;
      }

      setIsEnabled(false);
      reset();
      toastManager.add({
        title: "Two-factor authentication disabled",
        type: "success",
      });
      router.refresh();
    } catch {
      if (requestId === activeRequestId.current) {
        setPasswordError("Something went wrong. Please try again.");
      }
    } finally {
      if (requestId === activeRequestId.current) {
        setIsDisabling(false);
      }
    }
  };

  const copyBackupCodes = async () => {
    try {
      await navigator.clipboard.writeText(backupCodes.join("\n"));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toastManager.add({ title: "Couldn't copy codes", type: "error" });
    }
  };

  const downloadBackupCodes = () => {
    const content = [
      "My App — Two-Factor Backup Codes",
      "Each code can be used once if you lose access to your authenticator app.",
      "",
      ...backupCodes,
      "",
      `Generated ${new Date().toLocaleString()}`,
    ].join("\n");

    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = BACKUP_CODES_FILENAME;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="max-w-md">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-4">
            <div>
              <CardTitle>Two-factor authentication</CardTitle>
              <CardDescription>
                Add an extra layer of security to your account using an
                authenticator app.
              </CardDescription>
            </div>
          </div>
        </CardHeader>

        {step === "idle" && (
          <CardFooter
            className="flex-col items-stretch gap-3"
            style={{ paddingTop: "0" }}
          >
            {isEnabled ? (
              <>
                <p className="text-muted-foreground text-sm">
                  Your account is protected. You&apos;ll be asked for a code
                  when signing in.
                </p>
                <Button
                  className="self-start"
                  onClick={() => setStep("disable-confirm")}
                  variant="destructive"
                >
                  <ShieldOff className="mr-2 h-4 w-4" />
                  Disable 2FA
                </Button>
              </>
            ) : !hasPassword ? (
              <div className="flex gap-3 rounded-lg border border-amber-300 bg-amber-50 p-3 text-amber-900 text-sm dark:border-amber-900 dark:bg-amber-950 dark:text-amber-200">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                <div>
                  <p className="font-medium">
                    A password is required to enable 2FA
                  </p>
                  <p className="mt-1">
                    Your account uses social login only. Set a password via{" "}
                    <a className="underline" href="/forgot-password">
                      Forgot password
                    </a>
                    , then come back to enable 2FA.
                  </p>
                </div>
              </div>
            ) : (
              <Button
                className="self-start"
                onClick={() => setStep("verify-password")}
              >
                Enable 2FA
              </Button>
            )}
          </CardFooter>
        )}
      </Card>

      {/* Enable: password confirmation */}
      <Dialog
        onOpenChange={(open) => {
          if (!open) reset();
        }}
        open={step === "verify-password"}
      >
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Confirm your password</DialogTitle>
            <DialogDescription>
              For your security, please confirm your password to continue.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2 px-6">
            <Label htmlFor={passwordInputId}>Password</Label>
            <Input
              aria-invalid={!!passwordError}
              autoComplete="current-password"
              autoFocus
              disabled={isSubmittingPassword}
              id={passwordInputId}
              onChange={(e) => {
                setPassword(e.target.value);
                if (passwordError) setPasswordError(null);
              }}
              onKeyDown={(e) => e.key === "Enter" && submitPassword()}
              type="password"
              value={password}
            />
            {passwordError && (
              <p className="text-destructive text-sm" role="alert">
                {passwordError}
              </p>
            )}
          </div>

          <DialogFooter className="mt-4">
            <Button
              disabled={isSubmittingPassword}
              onClick={reset}
              variant="ghost"
            >
              Cancel
            </Button>
            <Button
              disabled={!password || isSubmittingPassword}
              onClick={submitPassword}
            >
              {isSubmittingPassword && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Continue
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Enable: scan QR + verify */}
      {step === "scan-qr" && (
        <Card className="mt-4">
          <CardHeader>
            <CardTitle>Scan the QR code</CardTitle>
            <CardDescription>
              Scan this with your authenticator app, then enter the 6-digit code
              it generates.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center gap-6">
            {totpUri && (
              <div className="rounded-md border p-3">
                {/* Rendered client-side so the TOTP secret never leaves the browser. */}
                <QRCodeSVG
                  bgColor="#ffffff"
                  fgColor="#1a1a1a"
                  level="M"
                  size={160}
                  value={totpUri}
                />
              </div>
            )}

            <div className="flex w-full flex-col items-center gap-3">
              <Label htmlFor={codeInputId}>Enter the code from your app</Label>
              <InputOTP
                aria-invalid={!!codeError}
                aria-labelledby={codeInputId}
                id={codeInputId}
                maxLength={6}
                onChange={(value) => {
                  setCode(value);
                  if (codeError) setCodeError(null);
                }}
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
              {codeError && (
                <p className="text-destructive text-sm" role="alert">
                  {codeError}
                </p>
              )}
            </div>
          </CardContent>
          <CardFooter className="gap-3">
            <Button onClick={reset} variant="ghost">
              Cancel
            </Button>
            <Button
              className="flex-1"
              disabled={code.length !== 6 || isVerifyingCode}
              onClick={verifyCode}
            >
              {isVerifyingCode && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Verify & enable
            </Button>
          </CardFooter>
        </Card>
      )}

      {/* Enable: show backup codes once, after setup is confirmed */}
      {step === "backup-codes" && (
        <Card className="mt-4">
          <CardHeader>
            <CardTitle>Save your backup codes</CardTitle>
            <CardDescription>
              Store these somewhere safe. Each code can be used once if you lose
              access to your authenticator app. They won&apos;t be shown again.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-1.5 rounded-md border bg-muted/50 p-3">
              {backupCodes.map((c) => (
                <Badge className="font-mono" key={c} variant="secondary">
                  {c}
                </Badge>
              ))}
            </div>
          </CardContent>
          <CardFooter className="gap-3">
            <Button onClick={copyBackupCodes} variant="outline">
              {copied ? (
                <Check className="mr-2 h-4 w-4" />
              ) : (
                <Copy className="mr-2 h-4 w-4" />
              )}
              {copied ? "Copied" : "Copy"}
            </Button>
            <Button onClick={downloadBackupCodes} variant="outline">
              <Download className="mr-2 h-4 w-4" />
              Download
            </Button>
            <Button className="ml-auto" onClick={reset}>
              Done
            </Button>
          </CardFooter>
        </Card>
      )}

      {/* Disable: confirm with password */}
      <Dialog
        onOpenChange={(open) => {
          if (!open) reset();
        }}
        open={step === "disable-confirm"}
      >
        <DialogContent className="sm:max-w-sm">
          <DialogHeader className="pt-10">
            <DialogTitle className="flex items-center gap-2">
              <Lock className="h-4 w-4 text-destructive" />
              Disable two-factor authentication
            </DialogTitle>
            <DialogDescription>
              You will no longer be asked for a code when signing in. Confirm
              your password to continue.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2 px-6">
            <Label htmlFor={`${passwordInputId}-disable`}>Password</Label>
            <Input
              aria-invalid={!!passwordError}
              autoComplete="current-password"
              autoFocus
              disabled={isDisabling}
              id={`${passwordInputId}-disable`}
              onChange={(e) => {
                setPassword(e.target.value);
                if (passwordError) setPasswordError(null);
              }}
              onKeyDown={(e) => e.key === "Enter" && disable()}
              type="password"
              value={password}
            />
            {passwordError && (
              <p className="text-destructive text-sm" role="alert">
                {passwordError}
              </p>
            )}
          </div>

          <DialogFooter className="mt-4">
            <Button disabled={isDisabling} onClick={reset} variant="ghost">
              Cancel
            </Button>
            <Button
              disabled={!password || isDisabling}
              onClick={disable}
              variant="destructive"
            >
              {isDisabling && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Disable 2FA
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
