"use server";

import { headers } from "next/headers";
import { signIn } from "@/auth";
import { resolveAuthError } from "../errors/handle-auth-errors";
import { rateLimit } from "../rate-limit";

export type LoginFormState = { message: string; success?: boolean };

export async function loginAction(
  _prev: LoginFormState,
  formData: FormData,
): Promise<LoginFormState> {
  const email = formData.get("email");
  const ip = (await headers()).get("x-forwarded-for") ?? "unknown";

  if (!rateLimit(`login:${ip}:${email}`).success) {
    return {
      message: "Too many attempts. Please try again later.",
      success: false,
    };
  }

  try {
    await signIn("credentials", {
      email,
      password: formData.get("password"),
      redirect: false,
    });
    return { message: "", success: true };
  } catch (error) {
    return { message: resolveAuthError(error), success: false };
  }
}
