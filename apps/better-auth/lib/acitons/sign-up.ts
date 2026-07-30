"use server";

import { isAPIError } from "better-auth/api";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "../auth/auth";
import { signUpSchema } from "../validations/auth";

export type SignUpState = {
  success: boolean;
  message?: string;
  fieldErrors?: Record<string, string[]>;
};

export async function signUpAction(
  _prevState: SignUpState,
  formData: FormData,
): Promise<SignUpState> {
  const parsed = signUpSchema.safeParse({
    email: formData.get("email"),
    name: formData.get("name"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return {
      fieldErrors: parsed.error.flatten().fieldErrors,
      message: "Please fix the errors below.",
      success: false,
    };
  }

  try {
    await auth.api.signUpEmail({
      body: parsed.data,
      headers: await headers(),
    });
  } catch (error) {
    if (isAPIError(error)) {
      switch (error.status) {
        case "UNPROCESSABLE_ENTITY":
          return {
            message: "That email can't be used to sign up.",
            success: false,
          };
        case "TOO_MANY_REQUESTS":
          return {
            message: "Too many attempts. Try again shortly.",
            success: false,
          };
        case "BAD_REQUEST":
          return {
            message: error.message ?? "Invalid sign-up details.",
            success: false,
          };
        default:
          console.error("[signUpAction]", error.status, error.message);
          return {
            message: "Something went wrong. Please try again.",
            success: false,
          };
      }
    }
    console.error("[signUpAction] unexpected", error);
    return {
      message: "Something went wrong. Please try again.",
      success: false,
    };
  }

  redirect("/dashboard");
}
