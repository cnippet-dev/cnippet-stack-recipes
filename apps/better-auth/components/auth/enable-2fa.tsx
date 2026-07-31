"use client";

import { useState } from "react";
import { authClient } from "@/lib/auth/auth-client";

export function Enable2FA({ session }: any) {
  const [step, setStep] = useState<"idle" | "qr" | "verify">("idle");
  const [totpURI, setTotpURI] = useState("");
  const [code, setCode] = useState("");
  const [backupCodes, setBackupCodes] = useState<string[]>([]);

  const startEnable2FA = async () => {
    const pass = prompt("Confirm your password");
    if (!pass) return;

    const { data, error } = await authClient.twoFactor.enable({
      issuer: "My app",
      password: pass,
    });

    if (data?.totpURI) {
      setStep("qr");
      setTotpURI(data.totpURI);
      setBackupCodes(data.backupCodes);
    }
  };

  const verifyCode = async () => {
    const { error } = await authClient.twoFactor.verifyTotp({ code });
    if (!error) window.location.reload();
  };
  return (
    <div className="max-w-4xl">
      {!session.user.twoFactorEnabled ? (
        <button className="cursor-pointer" onClick={startEnable2FA}>
          Enable 2FA
        </button>
      ) : (
        <p>2FA is already enabled.</p>
      )}

      {step === "qr" && (
        <div>
          <h1>Scan this QR with Authenticator.</h1>
          <img
            alt="qr"
            height={100}
            src={`https://api.qrserver.com/v1/create-qr-code/?data=${encodeURIComponent(totpURI)}`}
            width={100}
          />
          <p>Backup Codes</p>
          <pre>{backupCodes.join("/n")}</pre>

          <input onChange={(e) => setCode(e.target.value)} type="text" />
          <button onClick={verifyCode}>Verify Code</button>
        </div>
      )}
    </div>
  );
}
