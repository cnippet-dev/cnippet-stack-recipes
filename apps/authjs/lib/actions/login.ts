"use server";

import { signIn } from "@/auth";
import { resolveAuthError } from "../errors/handle-auth-errors";

export type LoginFormState = { message: string; success?: boolean };

export async function loginAction(
  _prev: LoginFormState,
  formData: FormData,
): Promise<LoginFormState> {
  try {
    await signIn("credentials", {
      email: formData.get("email"),
      password: formData.get("password"),
      redirect: false,
    });
    return { message: "", success: true };
  } catch (error) {
    return { message: resolveAuthError(error), success: false };
  }
}
