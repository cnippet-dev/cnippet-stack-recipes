"use server";

import bcrypt from "bcryptjs";
import { signIn } from "@/auth";
import { registerSchema } from "@/lib/validations/auth.schema";
import { resolveAuthError } from "../errors/handle-auth-errors";
import prisma from "../prisma";

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
  const parsed = registerSchema.safeParse(Object.fromEntries(formData));

  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors, success: false };
  }

  const { name, email, password } = parsed.data;
  const existing = await prisma.user.findUnique({ where: { email } });

  if (existing) {
    return {
      message: "Unable to register with these details.",
      success: false,
    };
  }

  const passwordHash = await bcrypt.hash(password, 12);
  await prisma.user.create({ data: { email, name, passwordHash } });

  try {
    await signIn("credentials", { email, password, redirect: false });
    return { success: true };
  } catch (error) {
    return { message: resolveAuthError(error), success: false };
  }
}
