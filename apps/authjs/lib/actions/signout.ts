"use server";

import { signOut } from "@/auth";

export type SignOutState = { success?: boolean };

export async function signoutAction(): Promise<SignOutState> {
  await signOut({ redirect: false });
  return { success: true };
}
