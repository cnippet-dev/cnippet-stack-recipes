"use server";

import bcrypt from "bcryptjs";
import { signIn } from "@/auth";
import { registerSchema } from "@/lib/validations/auth.schema";
import prisma from "../prisma";
import { resolveAuthError } from "../errors/handle-auth-errors";

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
    return { success: false, fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const { name, email, password } = parsed.data;
  const existing = await prisma.user.findUnique({ where: { email } });

  if (existing) {
    return {
      success: false,
      message: "Unable to register with these details.",
    };
  }

  const passwordHash = await bcrypt.hash(password, 12);
  await prisma.user.create({ data: { name, email, passwordHash } });

  try {
    await signIn("credentials", { email, password, redirect: false });
    return { success: true };
  } catch (error) {
    return { success: false, message: resolveAuthError(error) };
  }
}
