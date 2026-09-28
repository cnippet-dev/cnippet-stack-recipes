"use server";

import bcrypt from "bcryptjs";
import { headers } from "next/headers";
import { signIn } from "@/auth";
import { registerSchema } from "@/lib/validations/auth.schema";
import { Prisma } from "../../app/generated/prisma/client";
import { resolveAuthError } from "../errors/handle-auth-errors";
import prisma from "../prisma";
import { rateLimit } from "../rate-limit";

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
  const existing = await prisma.user.findUnique({ where: { email } });

  if (existing) {
    return {
      message:
        "An account with this email already exists. Try signing in instead.",
      success: false,
    };
  }

  const passwordHash = await bcrypt.hash(password, 12);

  try {
    await prisma.user.create({ data: { email, name, passwordHash } });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return {
        message:
          "An account with this email already exists. Try signing in instead.",
        success: false,
      };
    }
    throw error;
  }

  try {
    await signIn("credentials", { email, password, redirect: false });
    return { success: true };
  } catch (error) {
    return { message: resolveAuthError(error), success: false };
  }
}
