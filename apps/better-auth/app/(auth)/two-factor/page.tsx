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

    toastManager.add({ title: "Login successfull!", type: "success" });
    router.push("/dashboard");
  };

  return (
    <div className="flex p-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Two-factor authentication</CardTitle>
          <CardDescription>
            Enter the 6-digit code from your authenticator app.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center gap-4">
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
        </CardContent>
        <CardFooter>
          <Button
            className="w-full"
            disabled={code.length !== 6 || isLoading}
            onClick={verifyCode}
          >
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Verify code
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
