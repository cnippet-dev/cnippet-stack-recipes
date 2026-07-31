"use client";

import { redirect } from "next/navigation";
import { useState } from "react";
import { authClient } from "@/lib/auth/auth-client";

export default function TwoFactor() {
  const [code, setCode] = useState<string>("");

  const verifyCode = async () => {
    const { error } = await authClient.twoFactor.verifyTotp({ code });
    if (!error) redirect("/dashboard");
  };
  return (
    <div>
      Tow Factor
      <input onChange={(e) => setCode(e.target.value)} type="text" />
      <button onClick={verifyCode}>Verify Code</button>
    </div>
  );
}
