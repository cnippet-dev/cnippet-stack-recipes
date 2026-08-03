"use server";

import { headers } from "next/headers";
import { auth } from "../auth/auth";

export async function getBackupCodeCount() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    return { message: "Unauthorized", success: false };
  }

  try {
    const data = await auth.api.viewBackupCodes({
      body: {
        userId: session.user.id,
      },
      headers: await headers(),
    });

    return { count: data.backupCodes.length, success: true };
  } catch {
    return { count: 0, success: true };
  }
}
