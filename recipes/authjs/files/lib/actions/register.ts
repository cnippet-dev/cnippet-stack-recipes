"use server";

import bcrypt from "bcryptjs";
import { headers } from "next/headers";
import { signIn } from "@/auth";
import { createUser } from "@/lib/auth/db";
import { resolveAuthError } from "@/lib/errors/handle-auth-errors";
import { rateLimit } from "@/lib/rate-limit";
import { registerSchema } from "@/lib/validations/auth.schema";

export type RegisterFormState = {
  success: boolean;
  message?: string;
  fieldErrors?: {
    name?: string[];
    email?: string[];
    password?: string[];
  };
};

export async function registerAction(
  _prev: RegisterFormState,
  formData: FormData,
): Promise<RegisterFormState> {
  const ip = (await headers()).get("x-forwarded-for") ?? "unknown";
  if (!rateLimit(`register:${ip}`).success) {
    return {
      message: "Too many attempts. Please try again later.",
      success: false,
    };
  }

  const parsed = registerSchema.safeParse(Object.fromEntries(formData));

  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors, success: false };
  }

  const { name, email, password } = parsed.data;
  const passwordHash = await bcrypt.hash(password, 12);

  if (!(await createUser({ email, name, passwordHash }))) {
    return {
      message:
        "An account with this email already exists. Try signing in instead.",
      success: false,
    };
  }

  try {
    await signIn("credentials", { email, password, redirect: false });
    return { success: true };
  } catch (error) {
    return { message: resolveAuthError(error), success: false };
  }
}
